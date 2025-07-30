import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  ListToolsResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResultSchema,
  ResourceTemplate,
  CompatibilityCallToolResultSchema,
  GetPromptResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createClients, ConnectedClient } from './client.js';
import { Config, loadConfig } from './config.js';
import { z } from 'zod';
import EventSource from 'eventsource';
import { addNewMcp, AddMCPResult, heatUpMcpServer } from './add-new-mcp.js';
import { searchMCPs } from './search-mcps.js';
import chokidar from 'chokidar';
import path from 'path';

// Extend global interface for notification function
declare global {
  var notifyAllSessions: ((notification: any) => void) | undefined;
  var notifySpecificSession: ((sessionId: string, notification: any) => void) | undefined;
}

function mcpLog(message: string) {
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    method: "log",
    params: { message }
  }));
}

global.EventSource = EventSource as any

export const createServer = async () => {
  // Function to notify sessions that tools have changed
  function notifyToolListChanged() {
    if (global.notifyAllSessions) {
      global.notifyAllSessions({
        method: 'notifications/tools/list_changed',
        params: {}
      });
    }
  }

  // Load configuration and connect to servers
  let config = loadConfig();
  
  let connectedClients = await createClients(config.servers);
  mcpLog(`Connected to ${connectedClients.length} servers`);

  // Function to reload MCP server connections
  async function reloadServerConnections() {
    console.log("Reloading MCP server connections...");
    
    // Clean up existing connections
    await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    
    // Reload config and create new connections
    config = loadConfig();
    connectedClients = await createClients(config.servers);
    
    // Clear the maps since the clients have changed
    toolToClientMap.clear();
    resourceToClientMap.clear();
    promptToClientMap.clear();
    
    mcpLog(`Reconnected to ${connectedClients.length} servers`);
    
    // Notify all sessions that the tool list has changed
    notifyToolListChanged();
  }

  const configPath = path.resolve('./config.json');
  const watcher = chokidar.watch(configPath).on('change', async (path) => { 
    console.log('config.json changed, reloading server connections and notifying client.');
    
    try {
      // Only reload if this is a legitimate config change, not from heating
      const newConfig = loadConfig();
      const hasServerChanges = JSON.stringify(config.servers) !== JSON.stringify(newConfig.servers);
      
      if (hasServerChanges) {
        console.log("Detected server configuration changes, reloading connections...");
        await reloadServerConnections();
      } else {
        console.log("Config change detected but no server changes, skipping connection reload");
        config = newConfig; // Just update the config without reloading connections
      }
    } catch (error) {
      console.error('Error reloading server connections:', error);
    }
  });

  // Maps to track which client owns which resource
  const toolToClientMap = new Map<string, ConnectedClient>();
  const resourceToClientMap = new Map<string, ConnectedClient>();
  const promptToClientMap = new Map<string, ConnectedClient>();

  const server = new Server(
    {
      name: "metis",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: { subscribe: true },
        tools: {},
      },
    },
  );

  // List Tools Handler
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const allTools: Tool[] = [];
    toolToClientMap.clear();

    for (const connectedClient of connectedClients) {
      try {
        const result = await connectedClient.client.request(
          {
            method: 'tools/list',
            params: {
              _meta: request.params?._meta
            }
          },
          ListToolsResultSchema
        );

        if (result.tools) {
          const toolsWithSource = result.tools.map((tool: Tool) => {
            toolToClientMap.set(tool.name, connectedClient);
            return {
              ...tool,
              description: `[${connectedClient.name}] ${tool.description || ''}`
            };
          });
          allTools.push(...toolsWithSource);
        }
      } catch (error) {
        console.error(`Error fetching tools from ${connectedClient.name}:`, error);
      }
    }

    // Add the single MCP management tool
    mcpLog("Adding add_new_mcp tool");
    allTools.push({
      name: 'add_new_mcp',
      description: 'Add a new MCP server by name from the modelcontextprotocol/servers repository.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the MCP server to add (e.g., "github", "google-maps", "postgresql")'
          },
          arguments: {
            type: 'object',
            description: 'Optional arguments required by the MCP server (e.g., file paths, connection strings)',
            additionalProperties: {
              type: 'string'
            }
          }
        },
        required: ['name']
      }
    });

    // Add the semantic search tool
    mcpLog("Adding search_mcps tool");
    allTools.push({
      name: 'search_mcps',
      description: 'Search for MCP servers using semantic similarity based on your query. Returns the most relevant servers with their tools.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Your search query describing the functionality you need (e.g., "file operations", "database access", "text-to-speech")'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 3, max: 10)',
            minimum: 1,
            maximum: 10
          }
        },
        required: ['query']
      }
    });

    return { tools: allTools };
  });

  // Call Tool Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    console.log(`CallTool request: ${name}, available tools: ${Array.from(toolToClientMap.keys()).join(', ')}`);
    
    // Handle the add_new_mcp tool
    if (name === 'add_new_mcp') {
      const serverName = typeof args?.name === 'string' ? args.name : undefined;
      if (!serverName) {
        throw new Error("Missing or invalid 'name' argument for add_new_mcp tool");
      }
      
      const serverArgs = args?.arguments && typeof args.arguments === 'object' ? 
        args.arguments as Record<string, string> : undefined;
      
      const result: AddMCPResult = await addNewMcp(serverName, serverArgs);
      
      let responseText = result.message;
      
      if (result.authRequest) {
        responseText += "\n\n" + result.authRequest.message;
      }
      
      if (result.argumentsRequest) {
        responseText += "\n\n" + result.argumentsRequest.message;
      }
      
      if (result.serverInfo) {
        responseText += `\n\nServer: ${result.serverInfo.name} (${result.serverInfo.language})`;
        responseText += `\nPackage: ${result.serverInfo.packageName}`;
      }

      // If server was successfully added, wait for connections to reload and refresh our tool maps
      if (result.success) {
        try {
          console.log("Server added successfully. Reloading connections directly...");
          
          // Don't wait for file watcher - reload connections directly
          await reloadServerConnections();
          
          console.log(`After reload, connected clients: ${connectedClients.map(c => c.name).join(', ')}`);
          
          // Now rebuild tool mappings since reloadServerConnections() clears them
          console.log("Rebuilding tool mappings after direct reload...");
          
          for (const connectedClient of connectedClients) {
            try {
              const toolsResult = await connectedClient.client.request(
                {
                  method: 'tools/list',
                  params: {}
                },
                ListToolsResultSchema
              );
              
              if (toolsResult.tools) {
                toolsResult.tools.forEach((tool: Tool) => {
                  toolToClientMap.set(tool.name, connectedClient);
                });
                console.log(`Added ${toolsResult.tools.length} tools from ${connectedClient.name}: ${toolsResult.tools.map(t => t.name).join(', ')}`);
              }
            } catch (error) {
              console.warn(`Failed to refresh tools for ${connectedClient.name}:`, error);
            }
          }
          
          const newToolCount = toolToClientMap.size;
          console.log(`Tool maps rebuilt. Now tracking ${newToolCount} tools: ${Array.from(toolToClientMap.keys()).join(', ')}`);
          
          if (newToolCount > 0) {
            responseText += `\n\n✅ Server connected and ${newToolCount} tools are now available for immediate use.`;
            responseText += `\n\nAvailable tools: ${Array.from(toolToClientMap.keys()).join(', ')}`;
          } else {
            responseText += "\n\n⚠️ Server added but no tools detected yet. Tools may be available on next request.";
          }
          
        } catch (error) {
          console.error("Error during post-add tool refresh:", error);
          responseText += "\n\n⚠️ Server added but tool refresh failed. Tools may be available on next request.";
        }
      }

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    }

    // Handle the search_mcps tool
    if (name === 'search_mcps') {
      const query = typeof args?.query === 'string' ? args.query : undefined;
      if (!query) {
        throw new Error("Missing or invalid 'query' argument for search_mcps tool");
      }
      
      const limit = typeof args?.limit === 'number' ? Math.min(Math.max(args.limit, 1), 10) : 4;
      
      try {
        const results = await searchMCPs(query, limit);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "❌ No MCP servers found. Ensure embeddings have been generated and the database is accessible."
              }
            ]
          };
        }

        // Create structured, concise response
        let responseText = `🔍 **Top ${results.length} MCP Servers for "${query}"**\n\n`;
        
        results.forEach((result, index) => {
          const similarity = (result.similarity * 100).toFixed(0);
          responseText += `**${index + 1}. ${result.displayName}** (${similarity}% match)\n`;
          responseText += `   📝 ${result.description}\n`;
          
          if (result.tools && result.tools.length > 0) {
            const toolNames = result.tools.map((tool: any) => tool.name);
            if (toolNames.length <= 6) {
              responseText += `   🛠️  Tools: ${toolNames.join(', ')}\n`;
            } else {
              responseText += `   🛠️  Tools: ${toolNames.slice(0, 6).join(', ')}, +${toolNames.length - 6} more\n`;
            }
          } else {
            responseText += `   🛠️  Tools: None indexed\n`;
          }
          responseText += `\n`;
        });
        
        responseText += `💡 Use \`add_new_mcp\` tool to install any server that matches your needs.`;
        
        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      } catch (error: any) {
        const errorMessage = `❌ Search failed: ${error.message}\n\n`;
        let troubleshooting = "**Troubleshooting:**\n";
        
        if (error.message.includes('OpenAI API key')) {
          troubleshooting += "• Set your OpenAI API key in the environment variables\n";
        } else if (error.message.includes('database') || error.message.includes('connection')) {
          troubleshooting += "• Check that the database is running and accessible\n";
          troubleshooting += "• Verify database connection settings\n";
        } else {
          troubleshooting += "• Check the server logs for more details\n";
          troubleshooting += "• Ensure embeddings have been generated for MCP servers\n";
        }
        
        return {
          content: [
            {
              type: "text",
              text: errorMessage + troubleshooting
            }
          ]
        };
      }
    }

    const clientForTool = toolToClientMap.get(name);

    if (!clientForTool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // >>> BEGINNING OF HEATING LOGIC >>> 
    try {
      heatUpMcpServer(clientForTool.name); // Call heatUpMcpServer without sessionId
    } catch (heatError) {
      // Log the heating error but don't let it stop the tool call
      console.error(`Error heating up server ${clientForTool.name}:`, heatError);
      mcpLog(`Error heating up server ${clientForTool.name}: ${heatError instanceof Error ? heatError.message : 'Unknown error'}`);
    }
    // <<< END OF HEATING LOGIC >>>

    // Retry logic for tool calls
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use the correct schema for tool calls
        return await clientForTool.client.request(
          {
            method: 'tools/call',
            params: {
              name,
              arguments: args || {},
              _meta: {
                progressToken: request.params._meta?.progressToken
              }
            }
          },
          CompatibilityCallToolResultSchema
        );
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a connection closed error
        if (error?.code === -32000 && error?.message?.includes('Connection closed')) {
          console.log(`Connection closed error for ${clientForTool.name}, attempt ${attempt + 1}/${maxRetries + 1}`);
          
          if (attempt < maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            
            // Try to reconnect the client if possible
            try {
              console.log(`Attempting to reconnect ${clientForTool.name}...`);
              // Force a reload of just this client's connection
              const serverConfig = config.servers.find((s: any) => s.name === clientForTool.name);
              if (serverConfig) {
                // This will be handled by the next tool list request which will recreate the connection
                console.log(`Will reconnect ${clientForTool.name} on next request`);
              }
            } catch (reconnectError) {
              console.error(`Failed to reconnect ${clientForTool.name}:`, reconnectError);
            }
            continue;
          }
        }
        
        // If it's not a connection error or we've exhausted retries, throw the error
        console.error(`Error calling tool through ${clientForTool.name}:`, error);
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw lastError;
  });

  // Get Prompt Handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    const clientForPrompt = promptToClientMap.get(name);

    if (!clientForPrompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    try {
      // console.log('Forwarding prompt request:', name);

      // Match the exact structure from the example code
      const response = await clientForPrompt.client.request(
        {
          method: 'prompts/get' as const,
          params: {
            name,
            arguments: request.params.arguments || {},
            _meta: request.params._meta || {
              progressToken: undefined
            }
          }
        },
        GetPromptResultSchema
      );

      mcpLog(`Prompt result: ${response}`);
      return response;
    } catch (error) {
      // Only log if it's not a "Method not found" error (expected for servers without prompt support)
      if (error instanceof Error && !error.message.includes('Method not found')) {
        console.error(`Error getting prompt from ${clientForPrompt.name}:`, error);
      } else {
        // Just log debug info for method not found errors
        mcpLog(`Server ${clientForPrompt.name} does not support prompts (method not found)`);
      }
      throw error;
    }
  });

  // List Prompts Handler
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    const allPrompts: z.infer<typeof ListPromptsResultSchema>['prompts'] = [];
    promptToClientMap.clear();

    for (const connectedClient of connectedClients) {
      try {
        const result = await connectedClient.client.request(
          {
            method: 'prompts/list' as const,
            params: {
              cursor: request.params?.cursor,
              _meta: request.params?._meta || {
                progressToken: undefined
              }
            }
          },
          ListPromptsResultSchema
        );

        if (result.prompts) {
          const promptsWithSource = result.prompts.map((prompt: any) => {
            promptToClientMap.set(prompt.name, connectedClient);
            return {
              ...prompt,
              description: `[${connectedClient.name}] ${prompt.description || ''}`
            };
          });
          allPrompts.push(...promptsWithSource);
        }
      } catch (error: any) {
        // Skip servers that don't support prompts (error code -32601)
        if (error?.code === -32601) {
          continue;
        }
        console.error(`Error fetching prompts from ${connectedClient.name}:`, error);
      }
    }

    return {
      prompts: allPrompts,
      nextCursor: request.params?.cursor
    };
  });

  // List Resources Handler
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    const allResources: z.infer<typeof ListResourcesResultSchema>['resources'] = [];
    resourceToClientMap.clear();

    for (const connectedClient of connectedClients) {
      try {
        const result = await connectedClient.client.request(
          {
            method: 'resources/list',
            params: {
              cursor: request.params?.cursor,
              _meta: request.params?._meta
            }
          },
          ListResourcesResultSchema
        );

        if (result.resources) {
          const resourcesWithSource = result.resources.map((resource: any) => {
            resourceToClientMap.set(resource.uri, connectedClient);
            return {
              ...resource,
              name: `[${connectedClient.name}] ${resource.name || ''}`
            };
          });
          allResources.push(...resourcesWithSource);
        }
      } catch (error) {
        console.error(`Error fetching resources from ${connectedClient.name}:`, error);
      }
    }

    return {
      resources: allResources,
      nextCursor: undefined
    };
  });

  // Read Resource Handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const clientForResource = resourceToClientMap.get(uri);

    if (!clientForResource) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    try {
      return await clientForResource.client.request(
        {
          method: 'resources/read',
          params: {
            uri,
            _meta: request.params._meta
          }
        },
        ReadResourceResultSchema
      );
    } catch (error) {
      console.error(`Error reading resource from ${clientForResource.name}:`, error);
      throw error;
    }
  });

  // List Resource Templates Handler
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
    const allTemplates: ResourceTemplate[] = [];

    for (const connectedClient of connectedClients) {
      try {
        const result = await connectedClient.client.request(
          {
            method: 'resources/templates/list' as const,
            params: {
              cursor: request.params?.cursor,
              _meta: request.params?._meta || {
                progressToken: undefined
              }
            }
          },
          ListResourceTemplatesResultSchema
        );

        if (result.resourceTemplates) {
          const templatesWithSource = result.resourceTemplates.map((template: ResourceTemplate) => ({
            ...template,
            name: `[${connectedClient.name}] ${template.name || ''}`,
            description: template.description ? `[${connectedClient.name}] ${template.description}` : undefined
          }));
          allTemplates.push(...templatesWithSource);
        }
      } catch (error) {
        console.error(`Error fetching resource templates from ${connectedClient.name}:`, error);
      }
    }

    return {
      resourceTemplates: allTemplates,
      nextCursor: request.params?.cursor
    };
  });

  const cleanup = async () => {
    console.log("Cleaning up resources...");
    await watcher.close();
    await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
  };

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await cleanup();
    process.exit(0);
  });

  return { server, cleanup };
};


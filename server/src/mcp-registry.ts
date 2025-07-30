import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const MCP_REGISTRY_FILE = path.join(__dirname, '../mcp-registry.json');
const ENHANCED_INDEX_FILE = path.join(__dirname, '../generated/enhanced-index.json');

// Types
export interface MCPServerTool {
  name: string;
  description?: string;
}

export interface MCPServerResource {
  name: string;
  description?: string;
}

export interface MCPServerConnection {
  type: 'command' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface MCPServerAuth {
  required: boolean;
  type?: 'oauth' | 'api_key';
  description?: string;
  envVar?: string;
}

export interface MCPServerConfig {
  name: string;
  displayName: string;
  connection: MCPServerConnection;
  auth?: MCPServerAuth;
  category?: string;
  contributor?: string;
  description?: string;
  license?: string;
  tags?: string[];
  tools?: MCPServerTool[];
  resources?: MCPServerResource[];
  prompts?: any[];
  status?: 'online' | 'offline' | 'unknown';
  lastIndexed?: string;
}

// Registry format from mcp-registry.json
export interface MCPRegistry {
  mcpServers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

// Enhanced server format from enhanced-index.json
export interface EnhancedServer {
  name: string;
  displayName: string;
  originalDescription: string;
  aiSummary: string;
  aiUseCases: string[];
  toolCount: number;
  toolDescriptions: { name: string; description: string }[];
  embedding: number[];
  lastProcessed: string;
}

export interface EnhancedIndex {
  lastUpdated: string;
  totalServers: number;
  servers: EnhancedServer[];
}

export interface DatabaseMCPServer {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  connection_type: string;
  command?: string;
  url?: string;
  static_args?: string[];
  auth_requirements: Array<{
    name: string;
    description: string;
    type: string;
  }>;
  auth_values?: Record<string, string>; // Add this field for actual env values
  argumentRequirements: any[];
  tools: MCPServerTool[];
  resources: MCPServerResource[];
  prompts: any[];
  status?: string;
  lastIndexed?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category?: string;
  distance: number;
  similarity: number;
  tools: MCPServerTool[];
  toolCount: number;
}

export interface ServerStats {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  totalTools: number;
  lastUpdated: string | null;
  categories: string[];
}

// Cache for loaded data
let registryCache: MCPRegistry | null = null;
let enhancedCache: EnhancedIndex | null = null;
let lastRegistryLoad = 0;
let lastEnhancedLoad = 0;

const CACHE_TTL = 60000; // 1 minute cache

/**
 * Load the MCP registry with caching
 */
async function loadMCPRegistry(): Promise<MCPRegistry> {
  const now = Date.now();
  if (registryCache && (now - lastRegistryLoad) < CACHE_TTL) {
    return registryCache;
  }
  
  try {
    const content = await fs.readFile(MCP_REGISTRY_FILE, 'utf-8');
    registryCache = JSON.parse(content) as MCPRegistry;
    lastRegistryLoad = now;
    return registryCache;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn('MCP registry file not found at:', MCP_REGISTRY_FILE);
      return { mcpServers: {} };
    }
    throw error;
  }
}

/**
 * Load the enhanced index with caching (optional)
 */
async function loadEnhancedIndex(): Promise<EnhancedIndex | null> {
  const now = Date.now();
  if (enhancedCache && (now - lastEnhancedLoad) < CACHE_TTL) {
    return enhancedCache;
  }
  
  try {
    const content = await fs.readFile(ENHANCED_INDEX_FILE, 'utf-8');
    enhancedCache = JSON.parse(content) as EnhancedIndex;
    lastEnhancedLoad = now;
    return enhancedCache;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn('Enhanced index file not found. AI features will be limited.');
      return null;
    }
    throw error;
  }
}

/**
 * Get server by name
 */
export async function getServerByName(name: string): Promise<DatabaseMCPServer | null> {
  const registry = await loadMCPRegistry();
  const serverConfig = registry.mcpServers[name];
  
  if (!serverConfig) {
    return null;
  }
  
  // Try to get enhanced information
  const enhancedIndex = await loadEnhancedIndex();
  const enhanced = enhancedIndex?.servers.find(s => s.name === name);
  
  // Determine connection type and details
  let connectionType = 'command';
  let url: string | undefined;
  
  if (serverConfig.args.includes('mcp-remote')) {
    connectionType = 'sse';
    url = serverConfig.args[serverConfig.args.length - 1]; // Last arg should be URL
  }
  
  // Transform to match the expected database format
  return {
    id: name,
    name: name,
    display_name: enhanced?.displayName || name,
    description: enhanced?.aiSummary || enhanced?.originalDescription || `${name} MCP server`,
    category: 'user-defined',
    connection_type: connectionType,
    command: serverConfig.command,
    url: url,
    static_args: serverConfig.args,
    auth_requirements: serverConfig.env && Object.keys(serverConfig.env).length > 0 ? 
      Object.keys(serverConfig.env).map(envVarName => ({
        name: envVarName,
        description: `Authentication required`,
        type: 'api_key'
      })) : [],
    auth_values: serverConfig.env, // Add actual env values
    argumentRequirements: [], // Will need to be handled separately if needed
    tools: enhanced?.toolDescriptions || [],
    resources: [],
    prompts: [],
    status: 'unknown',
    lastIndexed: enhanced?.lastProcessed
  };
}

/**
 * Get all servers
 */
export async function getAllServers(): Promise<Array<{
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  status?: string;
}>> {
  const registry = await loadMCPRegistry();
  const enhancedIndex = await loadEnhancedIndex();
  
  return Object.keys(registry.mcpServers).map(serverName => {
    const enhanced = enhancedIndex?.servers.find(s => s.name === serverName);
    
    return {
      id: serverName,
      name: serverName,
      display_name: enhanced?.displayName || serverName,
      description: enhanced?.aiSummary || enhanced?.originalDescription || `${serverName} MCP server`,
      category: 'user-defined',
      status: 'unknown'
    };
  });
}

/**
 * Search servers using enhanced index if available, fallback to simple text matching
 */
export async function searchServers(query: string, limit = 3): Promise<SearchResult[]> {
  const enhancedIndex = await loadEnhancedIndex();
  
  if (!enhancedIndex) {
    // Fallback to simple registry-based search
    return await searchServersSimple(query, limit);
  }
  
  const queryLower = query.toLowerCase();
  
  // Enhanced search with AI summaries and embeddings metadata
  const scored = enhancedIndex.servers.map(server => {
    let score = 0;
    
    if (server.name.toLowerCase() === queryLower) score += 100;
    if (server.displayName.toLowerCase().includes(queryLower)) score += 50;
    if (server.aiSummary.toLowerCase().includes(queryLower)) score += 40;
    
    server.aiUseCases.forEach(useCase => {
      if (useCase.toLowerCase().includes(queryLower)) score += 30;
    });
    
    server.toolDescriptions.forEach(tool => {
      if (tool.name.toLowerCase().includes(queryLower)) score += 20;
      if (tool.description?.toLowerCase().includes(queryLower)) score += 15;
    });
    
    queryLower.split(/\s+/).forEach(word => {
      if (word.length > 2 && server.aiSummary.toLowerCase().includes(word)) {
        score += 10;
      }
    });
    
    return { ...server, score };
  });
  
  // Filter and sort by score
  return scored
    .filter(server => server.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(server => ({
      id: server.name,
      name: server.name,
      displayName: server.displayName,
      description: server.aiSummary,
      category: 'user-defined',
      distance: Math.max(0, (100 - server.score) / 100),
      similarity: Math.min(1, server.score / 100),
      tools: server.toolDescriptions,
      toolCount: server.toolCount
    }));
}

/**
 * Simple search fallback when enhanced index is not available
 */
async function searchServersSimple(query: string, limit = 3): Promise<SearchResult[]> {
  const registry = await loadMCPRegistry();
  const queryLower = query.toLowerCase();
  
  return Object.keys(registry.mcpServers)
    .filter(name => name.toLowerCase().includes(queryLower))
    .slice(0, limit)
    .map(name => ({
      id: name,
      name: name,
      displayName: name,
      description: `${name} MCP server`,
      category: 'user-defined',
      distance: 0.5,
      similarity: 0.5,
      tools: [],
      toolCount: 0
    }));
}

/**
 * Get server statistics
 */
export async function getServerStats(): Promise<ServerStats> {
  const registry = await loadMCPRegistry();
  const enhancedIndex = await loadEnhancedIndex();
  
  const serverCount = Object.keys(registry.mcpServers).length;
  const totalTools = enhancedIndex ? 
    enhancedIndex.servers.reduce((sum, s) => sum + s.toolCount, 0) : 0;
  
  return {
    totalServers: serverCount,
    onlineServers: 0, // We don't track online status in registry
    offlineServers: 0,
    totalTools,
    lastUpdated: enhancedIndex?.lastUpdated || null,
    categories: ['user-defined'] // Registry only has user-defined servers
  };
}

/**
 * Invalidate cache
 */
export function invalidateCache(): void {
  registryCache = null;
  enhancedCache = null;
  lastRegistryLoad = 0;
  lastEnhancedLoad = 0;
}
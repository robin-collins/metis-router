# MCP Proxy Server

An MCP proxy server that aggregates and serves multiple MCP resource servers through a single interface. This server acts as a central hub that can:

- Connect to and manage multiple MCP resource servers
- Expose their combined capabilities through a unified interface
- Handle routing of requests to appropriate backend servers
- Aggregate responses from multiple sources
- **NEW**: Automatically add MCP servers from the modelcontextprotocol/servers repository
- **NEW**: Manage authentication credentials for MCP servers

## Features

### Resource Management
- Discover and connect to multiple MCP resource servers
- Aggregate resources from all connected servers
- Maintain consistent URI schemes across servers
- Handle resource routing and resolution

### Tool Aggregation
- Expose tools from all connected servers
- Route tool calls to appropriate backend servers
- Maintain tool state and handle responses

### Prompt Handling
- Aggregate prompts from all connected servers
- Route prompt requests to appropriate backends
- Handle multi-server prompt responses

### MCP Server Management (NEW)
- **Add MCP servers by name**: Automatically add any server from the modelcontextprotocol/servers repository
- **Authentication management**: Securely store and manage API keys and credentials
- **Server discovery**: List all available MCP servers with descriptions
- **Server information**: Get detailed info about servers including auth requirements
- **Auth status checking**: Monitor which servers have proper authentication configured

## Available MCP Management Tools

The proxy server includes a single agent-facing tool and a comprehensive CLI for management:

### Agent Tool: `add_new_mcp`
Add a new MCP server by name from the modelcontextprotocol/servers repository.
```
Parameters:
- name: Name of the MCP server (e.g., "github", "google-maps", "postgresql")
```

### CLI Management Tool: `mcp-manager`
A comprehensive command-line interface for managing MCP servers:

```bash
# List all available MCP servers
npm run mcp-manager list

# Get detailed information about a server
npm run mcp-manager info github

# Add a new MCP server
npm run mcp-manager add github

# Store authentication credentials
npm run mcp-manager store-auth "GitHub" GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# Check authentication status
npm run mcp-manager auth-status
```

## Supported MCP Servers

The system supports all reference servers from the modelcontextprotocol/servers repository, including:

### Reference Servers (TypeScript)
- **AWS KB Retrieval** - Retrieval from AWS Knowledge Base using Bedrock Agent Runtime
- **Brave Search** - Web and local search using Brave's Search API
- **EverArt** - AI image generation using various models
- **Everything** - Reference / test server with prompts, resources, and tools
- **Fetch** - Web content fetching and conversion for efficient LLM usage
- **Filesystem** - Secure file operations with configurable access controls
- **GitHub** - Repository management, file operations, and GitHub API integration
- **GitLab** - GitLab API, enabling project management
- **Google Drive** - File access and search capabilities for Google Drive
- **Google Maps** - Location services, directions, and place details
- **Memory** - Knowledge graph-based persistent memory system
- **PostgreSQL** - Read-only database access with schema inspection
- **Puppeteer** - Browser automation and web scraping
- **Redis** - Interact with Redis key-value stores
- **Sentry** - Retrieving and analyzing issues from Sentry.io
- **Sequential Thinking** - Dynamic and reflective problem-solving through thought sequences
- **Slack** - Channel management and messaging capabilities
- **SQLite** - Database interaction and business intelligence capabilities
- **Time** - Time and timezone conversion capabilities

### Reference Servers (Python)
- **Git** - Tools to read, search, and manipulate Git repositories

## Authentication Management

Many MCP servers require authentication credentials (API keys, tokens, etc.). The system handles this automatically:

1. **Automatic Detection**: When adding a server that requires auth, you'll be prompted with the required credentials
2. **Secure Storage**: Credentials are stored in `mcp-auth.json` (keep this file secure!)
3. **Environment Variables**: Auth data is automatically injected as environment variables when starting servers

### Example Authentication Workflow

1. Try to add a server that requires auth (via agent or CLI):
```bash
# Via agent tool
add_new_mcp("github")

# Via CLI
npm run mcp-manager add github
```

2. Store the required credentials (via CLI):
```bash
npm run mcp-manager store-auth "GitHub" GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```

3. Add the server (now it will work):
```bash
# Via agent tool
add_new_mcp("github")

# Via CLI
npm run mcp-manager add github
```

### Authentication File

Create a `mcp-auth.json` file to store credentials (see `mcp-auth.example.json` for format):

```json
{
  "GitHub": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_github_token_here"
  },
  "Google Maps": {
    "GOOGLE_MAPS_API_KEY": "your_google_maps_api_key_here"
  }
}
```

## Configuration

The server requires a JSON configuration file that specifies the MCP servers to connect to. Copy the example config and modify it for your needs:

```bash
cp config.example.json config.json
```

Example config structure:
```json
{
  "servers": [
    {
      "name": "Server 1",
      "transport": {
        "command": "/path/to/server1/build/index.js"
      }
    },
    {
      "name": "Server 2",
      "transport": {
        "command": "server2-command",
        "args": ["--option1", "value1"],
        "env": ["SECRET_API_KEY"]
      }
    },
    {
      "name": "Example Server 3",
      "transport": {
        "type": "sse",
        "url": "http://localhost:8080/sse"
      }
    }
  ]
}
```

The config file must be provided when running the server:
```bash
MCP_CONFIG_PATH=./config.json mcp-proxy-server
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

For development with continuous run:
```bash
# Stdio
npm run dev
# SSE
npm run dev:sse
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-proxy": {
      "command": "/path/to/mcp-proxy-server/build/index.js",
      "env": {
        "MCP_CONFIG_PATH": "/absolute/path/to/your/config.json",
        "KEEP_SERVER_OPEN": "1"
      }
    }
  }
}
```

- `KEEP_SERVER_OPEN` will keep the SSE running even if a client disconnects. Useful when multiple clients connects to the MCP proxy.

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Security Notes

- Keep your `mcp-auth.json` file secure and never commit it to version control
- Add `mcp-auth.json` to your `.gitignore` file
- Consider using environment variables for production deployments
- The system will eventually support SQL database storage for credentials (currently uses JSON)

## Future Enhancements

- SQL database storage for authentication credentials
- Support for additional MCP server repositories
- Web UI for managing MCP servers
- Encrypted credential storage
- Role-based access control for MCP servers

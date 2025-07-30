# Metis - Intelligent MCP Router & Web Based MCP Client

Metis is an advanced AI agent platform with an intelligent MCP (Model Context Protocol) router that dynamically manages up to 1,000+ MCP servers. The router uses an LRU cache system to maintain only the most relevant servers active at any time, preventing context overwhelm while providing access to a vast ecosystem of tools and services. We wanted to create this so you can add additional features while not having to deal with context overload from having over 40 tools enabled! We also provide a modular web based MCP client that anyone can modify!

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  MCP Router     │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Node.js)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 9999    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   User Interface         AI Agent Logic        Intelligent Router
   - Chat Interface       - OpenAI Agents       - 1000+ MCP Servers
   - Real-time UI         - Session Management  - LRU Cache System
                         - Streaming           - Dynamic Loading
                                              - Auto Server Selection
```
## 🖥️ Demo
![Demo](demo.gif)

## 🚀 Quick Start

### Step 1: Configure Your MCP Servers (Most Important!)

Add the MCP servers you want to `server/mcp-registry.json`. You can add up to **1,000+ servers**:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/sse"]
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"]
    },
    "hyperbrowser": {
      "command": "npx",
      "args": [
        "-y",
        "hyperbrowser-mcp"
      ],
      "env": {
        "HYPERBROWSER_API_KEY": "API_KEY_HERE"
      }
    }
}
```

### Step 2: Configure Router Cache Size

Edit `server/src/add-new-mcp.ts` and modify `MAX_ACTIVE_SERVERS` to set how many servers stay active simultaneously:

```typescript
// Only this many servers will be active at once (LRU cache)
const MAX_ACTIVE_SERVERS = 3; // Adjust based on your needs
```
**NOTE:** All active MCP servers are in `server/config.json`, you can manually remove/add servers to the active queue of MCP servers here

### Step 3: Set Up Environment Variables in Two .env Files

**Server folder** (`server/.env`):
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Backend folder** (`client/backend/.env`):
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 4: Authentication & Indexing

```bash
# Build all services and authenticate into remote auth servers
./setup.sh
```

**🚨 CRITICAL**: All *authentication* happens during indexing. Any time you:
- Add new servers to `mcp-registry.json`
- Want to re-authenticate existing servers
- Change server configurations

You **MUST** rerun the setup script:

```bash
./setup.sh
```

This will:
- Authenticate with all configured servers
- Store credentials in `~/.mcp-auth`
- Index and embed all servers for AI-powered selection
- Generate the router configuration

### Step 5: Start the Application

```bash
# Start all services in background
./start.sh

# OR start in separate terminals (recommended for development)
./start.sh -s
```

### Step 6: Use the AI Agent

Open [http://localhost:3000](http://localhost:3000) and start chatting!

- **Automatic Server Selection**: The AI automatically selects the best MCP server/tools for your query
- **Manual Server Specification**: You can also specify which server to use
- **Dynamic Loading**: The router loads/unloads servers as needed using LRU cache
- **Real-time Tool Discovery**: Available tools update dynamically

## 🧠 How the Intelligent Router Works

### **LRU Cache System**
- **Registry**: Up to 1,000+ servers in `mcp-registry.json`
- **Active Cache**: Only `MAX_ACTIVE_SERVERS` are loaded simultaneously 
- **Dynamic Loading**: Servers are loaded/unloaded based on usage (Least Recently Used)
- **Current State**: `config.json` shows currently active servers in the cache

### **AI-Powered Server Selection**
1. User asks a question
2. AI analyzes the query using embeddings
3. Router selects the best MCP server(s) and tools
4. If server isn't in cache, it's loaded (LRU eviction if cache full)
5. Tools are executed and results returned

### **Authentication Management**
- **Storage**: Credentials stored in `~/.mcp-auth`
- **Timing**: Authentication happens during indexing (`./setup.sh`)
- **Re-auth**: Run `./setup.sh` to re-authenticate or add new servers
- **Cleanup**: Remove credentials with `rm -rf ~/.mcp-auth`

## 🔧 Components

### 1. **Intelligent MCP Router** (`/server`)
- **Purpose**: Manages 1000+ MCP servers with intelligent caching and AI-powered selection
- **Tech Stack**: Node.js, TypeScript, OpenAI API
- **Key Features**:
  - LRU cache system with configurable `MAX_ACTIVE_SERVERS`
  - AI-powered server selection using semantic embeddings
  - Dynamic server loading/unloading
  - Centralized authentication management
  - Real-time server status tracking

### 2. **AI Agent Backend** (`/client/backend`)
- **Purpose**: AI agent orchestration and API endpoints
- **Tech Stack**: FastAPI, Python, OpenAI Agents SDK
- **Key Features**:
  - Session management with streaming responses
  - Integration with intelligent MCP router
  - Tool execution and response handling
  - Real-time communication via SSE

### 3. **Interactive Frontend** (`/client/frontend`)
- **Purpose**: User interface for the AI agent playground
- **Tech Stack**: Next.js, React, TypeScript
- **Key Features**:
  - Real-time chat interface with tool visualization
  - Server selection transparency
  - Streaming response display
  - Modern, responsive design
 
### 4. Web Based MCP Client
- **Auto Refresh Tools**
- ****Modular, modify how you see fit**

## 🛠️ Advanced Configuration

### **Router Cache Configuration**

Edit `server/src/add-new-mcp.ts`:
```typescript
const MAX_ACTIVE_SERVERS = 5; // Increase for more concurrent servers, but there is more context overload
```

### **Environment Variables**

**Required in both `/server/.env` and `/client/backend/.env`**:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### **Prerequisites**
- **Node.js** 18+ 
- **Python** 3.8+
- **OpenAI API Key** (required for server selection and embeddings)

## 🛠️ Development

### Manual Development Setup

If you prefer to run services individually:

```bash
# Terminal 1: MCP Server
cd server
npm run dev:http

# Terminal 2: Backend
cd client/backend  
uvicorn app:app --host localhost --port 8000 --log-level debug

# Terminal 3: Frontend
cd client/frontend
npm start
```

### Key Development Commands

**Server**:
```bash
cd server
npm run build          # Build TypeScript
npm run setup-registry  # Index servers + generate AI summaries (combined)
npm run dev:http        # Start development server

# Individual commands (if needed):
npm run index-servers   # Index MCP servers only
npm run generate-ai-summaries  # Generate AI summaries only
```

**Backend**:
```bash
cd client/backend
uvicorn app:app --reload  # Start with hot reload
```

**Frontend**:
```bash
cd client/frontend
npm run build          # Production build
npm start              # Start production server
```

## 📁 Project Structure

```
metis-mono-repo/
├── server/                    # 🧠 Intelligent MCP Router
│   ├── src/
│   │   ├── add-new-mcp.ts    # 🔧 Cache config (MAX_ACTIVE_SERVERS)
│   │   ├── mcp-proxy.ts      # 🌐 Router proxy server
│   │   ├── search-mcps.ts    # 🔍 AI-powered server selection
│   │   └── setup-registry.ts # 📦 Combined indexing & embedding
│   ├── mcp-registry.json     # 📋 ALL servers (up to 1000+)
│   ├── config.json          # ⚡ Currently active servers (cache)
│   ├── .env                 # 🔑 OPENAI_API_KEY
│   └── generated/           # 🤖 AI embeddings & summaries
│
├── client/
│   ├── backend/             # 🤖 AI Agent Backend
│   │   ├── app.py          # 🎯 Main FastAPI application
│   │   ├── .env            # 🔑 OPENAI_API_KEY
│   │   └── requirements.txt # 🐍 Python dependencies
│   │
│   └── frontend/           # 🖥️ Chat Interface
│       ├── app/            # ⚛️ Next.js application
│       └── src/components/ # 🎨 UI components
│
├── ~/.mcp-auth/            # 🔐 Authentication credentials
├── setup.sh               # 🚀 Setup + Auth + Indexing
├── start.sh               # ▶️  Start all services
└── README.md              # 📖 This file

Key Files:
🔧 MAX_ACTIVE_SERVERS: server/src/add-new-mcp.ts
📋 Server Registry: server/mcp-registry.json  
⚡ Active Cache: server/config.json
🔐 Credentials: ~/.mcp-auth/
```

## 🚀 Key Features

### **🧠 Intelligent Router**
- **1000+ Server Support**: Manage massive MCP server ecosystems
- **LRU Caching**: Smart memory management with configurable cache size
- **AI-Powered Selection**: Automatic server/tool selection using embeddings
- **Dynamic Loading**: Servers load/unload based on demand
- **Authentication Management**: Centralized credential storage and handling

### **🤖 Advanced AI Agent**
- **Automatic Tool Discovery**: AI selects optimal servers and tools for any query
- **Real-time Streaming**: Live response generation with tool call visualization
- **Session Management**: Persistent conversations with context preservation
- **Flexible Interaction**: Use any server or let AI choose automatically

### **⚡ Performance & Reliability**
- **Context Optimization**: Never overwhelm the AI with too many servers
- **Graceful Fallbacks**: Robust error handling and recovery
- **Hot Reloading**: Add servers without system restart
- **Monitoring**: Real-time server status and performance tracking

## 🔄 Managing Your MCP Ecosystem

### **Adding New Servers**

1. **Add to Registry**: Edit `server/mcp-registry.json`
2. **Reindex & Authenticate**: Run `./setup.sh` (CRITICAL for auth!)
3. **Automatic Integration**: Router will discover and integrate new servers

### **Re-authentication**

```bash
# If you need to re-authenticate or add new credentials
./setup.sh

# To completely reset authentication
rm -rf ~/.mcp-auth
./setup.sh
```

### **Monitoring Active Servers**

Check `server/config.json` to see which servers are currently loaded in the cache.

## 🔧 Router Configuration Examples

### **Basic Server Configuration**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/Documents"],
      "env": {}
    }
  }
}
```

### **Advanced Server Configuration**

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost:5432/db"],
      "env": {}
    },
    "custom-server": {
      "command": "python",
      "args": ["/path/to/your/custom/server.py"],
      "env": {
        "CUSTOM_API_KEY": "your_key",
        "CUSTOM_CONFIG": "value"
      }
    }
  }
}
```

## 🐛 Troubleshooting

### **Authentication Issues**

```bash
# If servers fail to authenticate
rm -rf ~/.mcp-auth
./setup.sh

# Check what credentials are stored
ls -la ~/.mcp-auth/
```

### **Router Cache Issues**

```bash
# Check currently active servers
cat server/config.json

# Restart router to clear cache
cd server && npm run dev:http
```

### **Common Issues**

1. **Authentication Failures**: Run `./setup.sh` after adding new servers
2. **Server Selection Problems**: Ensure OpenAI API key is set in both `.env` files
3. **Cache Overflow**: Reduce `MAX_ACTIVE_SERVERS` in `server/src/add-new-mcp.ts`
4. **Port Conflicts**: Ensure ports 3000, 8000, and 9999 are available

### **Logs & Debugging**

- **Router Logs**: Check server terminal for server loading/unloading
- **Authentication Logs**: Watch for auth failures during `./setup.sh`
- **AI Selection**: Backend logs show which servers/tools are selected
- **Cache Status**: Monitor `config.json` for active server changes

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

For more information or support, please refer to the individual component README files or open an issue. 

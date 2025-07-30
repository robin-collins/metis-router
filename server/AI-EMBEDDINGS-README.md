# AI-Powered MCP Server Embeddings & Semantic Search

This system enhances your MCP (Model Context Protocol) server registry with AI-generated summaries and semantic search capabilities using OpenAI embeddings.

## Overview

The system consists of two main components:

1. **AI Summary Generator** (`generate-ai-summaries.ts`) - Uses GPT-4o mini to create comprehensive summaries and use cases for each MCP server
2. **Semantic Search** (`semantic-search.ts`) - Enables natural language search using embedding similarity

## Prerequisites

1. **OpenAI API Key**: Set your OpenAI API key as an environment variable:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```

2. **MCP Index**: Ensure you have a valid `index.json` file in the `server/generated/` directory

## Setup & Usage

### Step 1: Generate AI Summaries and Embeddings

Run the AI summary generator to process your MCP servers:

```bash
cd server
npm run generate-ai-summaries
```

This script will:
- Read your `generated/index.json` file
- Send each server's description and tools to GPT-4o mini for analysis
- Generate comprehensive summaries and use cases
- Create embeddings for semantic search
- Save results to `generated/enhanced-index.json`

**Expected Output:**
```
🚀 Starting AI summary generation process...
📊 Found 6 servers to process

📝 Processing github (1/6)...
   - Generating AI summary...
   - Generating embedding...
   ✅ Successfully processed github

📝 Processing notion (2/6)...
   - Generating AI summary...
   - Generating embedding...
   ✅ Successfully processed notion

...

✅ Enhanced index saved to /path/to/server/generated/enhanced-index.json

📋 Summary Report:
   - Total servers processed: 6
   - Successful AI summaries: 6
   - Successful embeddings: 6
   - Output file: /path/to/server/generated/enhanced-index.json

🎉 AI summary generation completed!
```

### Step 2: Use Semantic Search

Once you have generated the enhanced index, you can search for MCP servers using natural language:

#### Interactive Mode
```bash
npm run semantic-search
```

This opens an interactive prompt where you can type search queries:
```
🚀 Interactive Semantic Search for MCP Servers
Type your search queries or "exit" to quit

🔍 Search query: find files in github
🔍 Performing semantic search for: "find files in github"
📊 Loaded 6 servers with embeddings
   - Generating query embedding...

🎯 Search Results for "find files in github":
============================================================

1. github (github)
   Similarity: 92.1% | Match: Tool name match
   Summary: A comprehensive GitHub integration server that provides full repository management capabilities...
   Tools: 26 (create_or_update_file, search_repositories, create_repository...)
   Use Cases:
     • Use GitHub server for automated code deployment and CI/CD workflows
     • Integrate GitHub server for collaborative development and code review processes
     • Leverage GitHub server for repository management and issue tracking
```

#### Single Query Mode
```bash
npm run semantic-search "create pages and documents"
npm run semantic-search "web scraping and automation"
npm run semantic-search "search the internet"
```

## Enhanced Index Structure

The generated `enhanced-index.json` contains:

```json
{
  "lastUpdated": "2025-01-17T10:30:00.000Z",
  "totalServers": 6,
  "servers": [
    {
      "name": "github",
      "displayName": "github",
      "originalDescription": "github-mcp-server",
      "aiSummary": "A comprehensive GitHub integration server that provides full repository management capabilities including file operations, issue tracking, pull request management, and code search across GitHub repositories.",
      "aiUseCases": [
        "Use GitHub server for automated code deployment and CI/CD workflows",
        "Integrate GitHub server for collaborative development and code review processes",
        "Leverage GitHub server for repository management and issue tracking"
      ],
      "toolCount": 26,
      "toolDescriptions": [
        {
          "name": "create_or_update_file",
          "description": "Create or update a single file in a GitHub repository"
        },
        {
          "name": "search_repositories", 
          "description": "Search for GitHub repositories"
        }
      ],
      "embedding": [0.123, -0.456, 0.789, ...],
      "lastProcessed": "2025-01-17T10:30:15.123Z"
    }
  ]
}
```

## Benefits

### 1. **Better Server Discovery**
- Natural language search instead of keyword matching
- AI-generated summaries provide clearer understanding of server capabilities
- Use cases help users understand practical applications

### 2. **Improved User Experience**
- Semantic search finds relevant servers even without exact keyword matches
- Comprehensive summaries help users make informed decisions
- Real-world use cases demonstrate practical value

### 3. **Enhanced Metadata**
- Replaces keyword-based search with embedding-based similarity
- AI-generated content is more comprehensive than manual descriptions
- Consistent format across all servers

## Example Search Queries

The semantic search works well with natural language queries like:

- **"help me manage github repositories"** → Returns GitHub server
- **"create and edit documents"** → Returns Notion server
- **"automate web browsing tasks"** → Returns Puppeteer server
- **"find information on the internet"** → Returns Brave Search server
- **"track project issues and tasks"** → Returns Linear server

## Troubleshooting

### Error: Enhanced index not found
```bash
❌ Enhanced index not found!
Please run the following command first:
npm run generate-ai-summaries
```
**Solution**: Run the AI summary generator first to create the enhanced index.

### Error: OpenAI API key not set
```bash
❌ OPENAI_API_KEY environment variable is not set
```
**Solution**: Set your OpenAI API key:
```bash
export OPENAI_API_KEY="your-key-here"
```

### Error: Index file not found
```bash
❌ Index file not found at /path/to/server/generated/index.json
```
**Solution**: Ensure you have a valid MCP server index. Run your MCP indexing process first.

## Rate Limits

The system includes built-in rate limiting:
- 1-second delay between API calls to respect OpenAI rate limits
- Graceful error handling with fallback summaries
- Progress indication for long-running operations

## Cost Considerations

- **GPT-4o mini**: ~$0.00015 per 1K tokens for summaries
- **text-embedding-ada-002**: ~$0.0001 per 1K tokens for embeddings
- For 6 servers with typical tool counts: ~$0.01-0.05 total cost

## Integration

You can integrate the semantic search functionality into other applications:

```typescript
import { semanticSearch, loadEnhancedIndex } from './src/semantic-search';

// Perform a search
const results = await semanticSearch("find github repositories", 3);

// Load the enhanced index directly
const enhancedIndex = loadEnhancedIndex();
```

## Future Enhancements

- **Incremental Updates**: Only process new/changed servers
- **Multiple Embedding Models**: Support for different embedding providers
- **Cached Results**: Store search results for common queries
- **Web Interface**: Browser-based search interface
- **Analytics**: Track search patterns and server usage 
#!/usr/bin/env node

import { 
  addNewMcp, 
  storeAuthData, 
  // listAvailableMCPs,
  // getServerInfo,
  // checkAuthStatus
} from './add-new-mcp.js';

function printUsage() {
  console.log(`
Usage: mcp-manager <command> [options]

Commands:
  add <server-name>              Add a new MCP server to the configuration.
  
  (The following commands are temporarily disabled during refactoring)
  // store-auth <server> <k=v>...   Store authentication credentials for a server.
  // list                           List all available MCP servers.
  // info <server-name>             Get detailed information about a server.
  // auth-status                    Check the authentication status for all configured servers.
  `);
}

function parseAuthData(args: string[]): Record<string, string> {
  const authData: Record<string, string> = {};
  
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key && value) {
      authData[key] = value;
    }
  }
  
  return authData;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  switch (command) {
    /*
    case 'list':
      console.log(listAvailableMCPs());
      break;

    case 'info':
      if (args.length < 2) {
        console.error('Error: Server name required');
        console.log('Usage: mcp-manager info <server-name>');
        process.exit(1);
      }
      console.log(getServerInfo(args[1]));
      break;
    */
    case 'add':
      if (args.length < 2) {
        console.error('Error: Server name required');
        console.log('Usage: mcp-manager add <server-name>');
        process.exit(1);
      }
      const addResult = await addNewMcp(args[1]);
      console.log(addResult.message);
      
      if (addResult.authRequest) {
        console.log('\n' + addResult.authRequest.message);
      }
      
      if (addResult.serverInfo) {
        console.log(`\nServer: ${addResult.serverInfo.name} (${addResult.serverInfo.language})`);
        console.log(`Package: ${addResult.serverInfo.packageName}`);
      }
      break;
    /*
    case 'auth-status':
      console.log(checkAuthStatus());
      break;
    */
    case 'store-auth':
      if (args.length < 3) {
        console.error('Error: Server name and auth data required');
        console.log('Usage: mcp-manager store-auth <server> <key=val> [key=val...]');
        process.exit(1);
      }
      
      const serverName = args[1];
      const authData = parseAuthData(args.slice(2));
      
      if (Object.keys(authData).length === 0) {
        console.error('Error: No valid auth data provided');
        console.log('Format: KEY=value');
        process.exit(1);
      }
      
      const storeResult = await storeAuthData(serverName, authData);
      console.log(storeResult.message);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 
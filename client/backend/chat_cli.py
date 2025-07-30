#!/usr/bin/env python3
import asyncio
import aiohttp
import json
import sys
from typing import Optional


class ChatCLI:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session_id: Optional[str] = None
        
    async def connect(self, chat_history: Optional[list] = None) -> bool:
        """Initialize a new chat session"""
        if chat_history is None:
            chat_history = []
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/connect",
                    json={"chat_history": chat_history}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.session_id = data["session_id"]
                        print(f"✅ Connected! Session ID: {self.session_id}")
                        return True
                    else:
                        print(f"❌ Connection failed: {response.status}")
                        return False
            except Exception as e:
                print(f"❌ Connection error: {e}")
                return False
    
    async def send_message(self, message: str) -> bool:
        """Send a message to the agent"""
        if not self.session_id:
            print("❌ No active session. Please connect first.")
            return False
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/sessions/{self.session_id}/message",
                    json={"message": message}
                ) as response:
                    return response.status == 200
            except Exception as e:
                print(f"❌ Error sending message: {e}")
                return False
    
    async def stream_response(self):
        """Stream and display the agent's response"""
        if not self.session_id:
            print("❌ No active session. Please connect first.")
            return
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{self.base_url}/sessions/{self.session_id}/stream"
                ) as response:
                    if response.status != 200:
                        print(f"❌ Stream error: {response.status}")
                        return
                        
                    print("\n🤖 Agent:", end=" ", flush=True)
                    
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])  # Remove "data: " prefix
                                
                                if data['type'] == 'token':
                                    print(data['content'], end='', flush=True)
                                elif data['type'] == 'tool_call':
                                    print(f"\n\n🔧 Tool Call: {data.get('arguments', data)}")
                                elif data['type'] == 'tool_call_complete':
                                    print(f"📞 Calling: {data['name']}")
                                elif data['type'] == 'tool_response':
                                    output = data['output']
                                    if isinstance(output, dict) and 'text' in output:
                                        print(f"📋 Tool Result: {output['text'][:200]}...")
                                    else:
                                        print(f"📋 Tool Result: {str(output)[:200]}...")
                                elif data['type'] == 'completion':
                                    print("\n\n✅ Response completed")
                                    break
                                elif data['type'] == 'error':
                                    print(f"\n❌ Error: {data['message']}")
                                    break
                                    
                            except json.JSONDecodeError:
                                continue
                                
            except Exception as e:
                print(f"\n❌ Streaming error: {e}")
    
    async def cleanup(self):
        """Clean up the session"""
        if not self.session_id:
            return
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.delete(
                    f"{self.base_url}/sessions/{self.session_id}"
                ) as response:
                    if response.status == 200:
                        print(f"🧹 Session {self.session_id} cleaned up")
                    self.session_id = None
            except Exception as e:
                print(f"❌ Cleanup error: {e}")

    async def list_tools(self):
        """List available tools for the current session"""
        if not self.session_id:
            print("❌ No active session. Please connect first.")
            return
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{self.base_url}/sessions/{self.session_id}/tools"
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"\n🛠️  Available Tools for Agent '{data['agent_name']}':")
                        print(f"📊 Total tools: {data['tools_count']}")
                        print(f"🔧 MCP Server: {data.get('mcp_server_name', 'Unknown')}")
                        print("─" * 60)
                        
                        for i, tool in enumerate(data['tools'], 1):
                            print(f"\n{i}. 🔨 {tool['name']}")
                            print(f"   📝 {tool['description']}")
                            
                            if 'input_schema' in tool and tool['input_schema']:
                                schema = tool['input_schema']
                                if isinstance(schema, dict):
                                    properties = schema.get('properties', {})
                                    if properties:
                                        print("   📋 Parameters:")
                                        for param_name, param_info in properties.items():
                                            param_type = param_info.get('type', 'unknown')
                                            param_desc = param_info.get('description', 'No description')
                                            required = param_name in schema.get('required', [])
                                            req_indicator = " (required)" if required else " (optional)"
                                            print(f"      • {param_name} ({param_type}){req_indicator}: {param_desc}")
                        
                        print("\n" + "─" * 60)
                        return data
                    else:
                        print(f"❌ Failed to list tools: {response.status}")
                        error_text = await response.text()
                        print(f"Error details: {error_text}")
                        return None
            except Exception as e:
                print(f"❌ Error listing tools: {e}")
                return None

async def main():
    print("🚀 Metis Chat CLI")
    print("Type 'quit' or 'exit' to end the session")
    print("Type 'tools' to list available tools")
    print("=" * 50)
    
    cli = ChatCLI()
    
    # Connect to the API
    if not await cli.connect():
        return
    
    try:
        while True:
            # Get user input
            try:
                user_input = input("\n👤 You: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n👋 Goodbye!")
                break
                
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break
                
            if user_input.lower() == 'tools':
                await cli.list_tools()
                continue
                
            if not user_input:
                continue
            
            # Send message and stream response
            if await cli.send_message(user_input):
                await cli.stream_response()
            else:
                print("❌ Failed to send message")
                
    finally:
        await cli.cleanup()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0) 
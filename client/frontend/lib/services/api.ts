// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface AgentConfig {
  name: string;
  instruction: string;
  servers?: string[];
  model?: string;
}

export interface SessionInfo {
  session_id: string;
  agent_name: string;
  created_at: string;
  last_activity: string;
  is_sse_active: boolean;
  history_length: number;
}

export interface Tool {
  name: string;
  full_name: string;
  description: string;
  server: string;
  input_schema?: Record<string, unknown>;
}

export interface ToolsResponse {
  session_id: string;
  agent_name: string;
  tools_count: number;
  tools: Tool[];
  mcp_server_name: string;
}

// SSE Event types
export interface SSEEvent {
  type: 'token' | 'tool_call' | 'tool_call_started' | 'tool_call_complete' | 'tool_call_finished' | 'tool_response' | 'completion' | 'error';
  content?: string;
  arguments?: Record<string, unknown>;
  name?: string;
  tool_name?: string;
  call_id?: string;
  output?: Record<string, unknown> | string;
  message?: string;
}

class ApiService {
  private currentSessionId: string | null = null;

  // Session Management
  async connect(chatHistory: ChatMessage[] = []): Promise<{ success: boolean; session_id: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chat_history: chatHistory }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.currentSessionId = data.session_id;
      return data;
    } catch (error) {
      console.error("Error connecting to session:", error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // SSE Streaming for responses
  async streamResponse(
    sessionId: string,
    onToken: (content: string) => void,
    onToolCall: (toolCall: { name?: string; call_id?: string; arguments?: Record<string, unknown> }) => void,
    onToolResponse: (response: { name?: string; call_id?: string; output: Record<string, unknown> | string }) => void,
    onCompletion: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const eventSource = new EventSource(`${API_BASE_URL}/sessions/${sessionId}/stream`);

      eventSource.onmessage = (event) => {
        // Only log tool-call related events to reduce noise
        const isToolEvent = event.data.includes('"tool_call"') || event.data.includes('"tool_response"') || event.data.includes('"tool_call_');
        
        try {
          const data: SSEEvent = JSON.parse(event.data);
          console.log('📥 FRONTEND API: Received SSE event:', data);
          
          switch (data.type) {
            case 'token':
              if (data.content) {
                onToken(data.content);
              }
              break;
            case 'tool_call_started':
              console.log('🚀 FRONTEND API: Tool call started:', data);
              onToolCall({ 
                name: data.name || data.tool_name,
                call_id: data.call_id,
                arguments: data.arguments 
              });
              break;
            case 'tool_call':
              console.log('🔧 FRONTEND API: Tool call with arguments:', data);
              // Only update if this is a new tool call we haven't seen before
              onToolCall({ 
                name: data.name,
                call_id: data.call_id,
                arguments: data.arguments 
              });
              break;
            case 'tool_call_complete':
              console.log('✅ FRONTEND API: Tool call complete:', data);
              // Don't create new tool call, this should just mark completion
              // The chatStore will handle this by updating existing tool call status
              break;
            case 'tool_call_finished':
              console.log('🏁 FRONTEND API: Tool call finished:', data);
              // Don't create new tool call, this is just a status update
              break;
            case 'tool_response':
              console.log('📤 FRONTEND API: Tool response:', data);
              if (data.output !== undefined) {
                onToolResponse({ 
                  name: data.name,
                  call_id: data.call_id,
                  output: data.output 
                });
              }
              break;
            case 'completion':
              onCompletion();
              eventSource.close();
              break;
            case 'error':
              console.log('❌ Stream error event:', data.message);
              onError(data.message || 'Unknown error');
              eventSource.close();
              break;
            default:
              // Only log unknown tool-related events
              if (isToolEvent) {
                console.log('❓ Unknown tool event:', data.type, data);
              }
          }
        } catch (err) {
          console.error('❌ Error parsing SSE event:', err, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        onError('Connection error');
        eventSource.close();
      };

      return new Promise((resolve) => {
        const originalOnCompletion = onCompletion;
        onCompletion = () => {
          originalOnCompletion();
          resolve();
        };
      });
    } catch (error) {
      console.error("Error streaming response:", error);
      throw error;
    }
  }

  // Tools Management
  async listSessionTools(sessionId: string): Promise<ToolsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/tools`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error listing session tools:", error);
      throw error;
    }
  }

  // Session Status
  async getSessionStatus(sessionId: string): Promise<SessionInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting session status:", error);
      throw error;
    }
  }

  // Cleanup
  async cleanupSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error cleaning up session:", error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; active_sessions: number; active_sse_connections: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking health:", error);
      throw error;
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

const apiService = new ApiService();
export default apiService;

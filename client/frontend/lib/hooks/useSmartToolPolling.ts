"use client";

import { useState, useEffect, useCallback } from 'react';
import { Tool } from '../services/api';
import apiService from '../services/api';

export const useSmartToolPolling = (sessionId?: string) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTools = useCallback(async (showLoading = false) => {
    if (!sessionId) {
      setTools([]);
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      
      const response = await apiService.listSessionTools(sessionId);
      
      // Transform tools to match the expected format
      const formattedTools = response.tools.map(tool => {
        // Use the MCP server name from the response instead of extracting from tool name
        // This prevents issues with tools that have hyphens in their names (e.g., "create-pages")
        const serverName = response.mcp_server_name;
        
        return {
          name: tool.name,
          full_name: tool.name,
          description: tool.description || 'No description available',
          server: serverName
        };
      });
      
      setTools(formattedTools);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tools';
      setError(errorMsg);
      console.error('Failed to refresh tools:', err);
      setIsLoading(false);
    }
  }, [sessionId]);

  // Refresh tools when sessionId changes
  useEffect(() => {
    if (sessionId) {
      refreshTools(true);
    } else {
      setTools([]);
      setIsLoading(false);
    }
  }, [sessionId, refreshTools]);

  return {
    tools,
    isLoading,
    error,
    refreshTools: () => refreshTools(true),
    isUserActive: !!sessionId // Active when we have a session
  };
}; 
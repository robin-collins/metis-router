"use client";

import React, { forwardRef, useImperativeHandle } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useSmartToolPolling } from "@/lib/hooks/useSmartToolPolling";

interface ToolListProps {
  onToolClick: (toolName: string) => void;
  sessionId?: string | null;
}

export interface ToolListRef {
  refreshTools: () => void;
}

const ToolList = forwardRef<ToolListRef, ToolListProps>(({ onToolClick, sessionId }, ref) => {
  const { tools, isLoading, error, refreshTools } = useSmartToolPolling(sessionId || undefined);

  useImperativeHandle(ref, () => ({
    refreshTools
  }));

  // Helper function to format tool name
  const formatToolName = (name: string) => {
    // Simply add "@" prefix to the tool name
    // No need to remove server prefixes since we now use the proper server name from API
    return `@${name}`;
  };

  // No session case
  if (!sessionId) {
    return (
      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
        <AlertCircle className="h-4 w-4" />
        <span>No active session - start a conversation to see tools</span>
      </div>
    );
  }

  // Error state with no cached tools
  if (error && tools.length === 0) {
    return (
      <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load tools</span>
        <Button variant="ghost" size="sm" onClick={refreshTools} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header with status and controls */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span className="text-xs text-gray-500">
          Available Tools ({tools.length})
        </span>
        <div className="flex items-center gap-2">
          {/* Error indicator */}
          {error && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-amber-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Using cached tools - {error}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Manual refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTools}
            disabled={isLoading}
            className="h-6 px-2"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Tools list */}
      <div className="overflow-y-auto flex-1 pb-4">
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <Tooltip key={tool.full_name}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs whitespace-nowrap bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                  onClick={() => onToolClick(tool.full_name)}
                >
                  {formatToolName(tool.name)}
                </Button>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                align="start"
                className="max-w-sm"
              >
                <div className="space-y-2">
                  <Badge 
                    variant="outline" 
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  >
                    {tool.server}
                  </Badge>
                  <p className="text-xs leading-relaxed">
                    {tool.description || 'No description available'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
});

ToolList.displayName = 'ToolList';

export default ToolList; 
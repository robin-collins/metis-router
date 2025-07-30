"use client";

import React, { useState, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Message, ToolCall } from "@/lib/stores/chatStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { Button } from "@/components/ui/button";
import MarkdownMessage from "./MarkdownMessage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MessageBubbleProps {
  message: Message;
}

interface ToolCallBubbleProps {
  toolCall: ToolCall;
}

// New separate ToolCallBubble component
export const ToolCallBubble: React.FC<ToolCallBubbleProps> = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-400" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-400 animate-spin" />;
      case "running":
        return <Clock className="h-3 w-3 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="max-w-[80%]">
        <div className="rounded-2xl px-4 py-3 bg-gray-800 text-gray-100 shadow-sm border border-gray-700">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center space-x-2 text-sm text-gray-200 hover:text-white w-full text-left">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {getStatusIcon(toolCall.status)}
                <span className="font-medium">{toolCall.name}</span>
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 pl-6">
              <div className="space-y-3">
                {/* Arguments */}
                <div>
                  <div className="text-xs font-medium text-gray-300 mb-2">Arguments:</div>
                  {toolCall.input && Object.keys(toolCall.input).length > 0 ? (
                    <pre className="bg-gray-900 p-3 rounded-lg border border-gray-600 text-xs overflow-x-auto text-gray-200">
                      {JSON.stringify(toolCall.input, null, 2)}
                    </pre>
                  ) : toolCall.input === undefined ? (
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-600 text-xs text-gray-400 italic">
                      Arguments not available
                    </div>
                  ) : (
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-600 text-xs text-gray-400 italic">
                      No arguments
                    </div>
                  )}
                </div>
                
                {/* Response */}
                <div>
                  <div className="text-xs font-medium text-gray-300 mb-2">Response:</div>
                  {toolCall.output ? (
                    <div className="bg-gray-900 rounded-lg border border-gray-600 h-[150px] overflow-y-auto">
                      <pre className="p-3 text-xs text-gray-200 whitespace-pre-wrap">
                        {typeof toolCall.output === 'string' 
                          ? toolCall.output 
                          : JSON.stringify(toolCall.output, null, 2)
                        }
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-600 text-xs text-gray-400 italic h-[150px] flex items-center justify-center">
                      {toolCall.status === 'pending' || toolCall.status === 'running' 
                        ? 'Loading...' 
                        : 'No response available'
                      }
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { rateMessage } = useChatStore();
  const [isHovered, setIsHovered] = useState(false);
  const [formattedTime, setFormattedTime] = useState<string>("");

  // Format timestamp only on client to avoid hydration mismatch
  useEffect(() => {
    setFormattedTime(message.timestamp.toLocaleTimeString());
  }, [message.timestamp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleRate = (rating: "up" | "down") => {
    rateMessage(message.id, rating);
  };

  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full mb-6 ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-900"
          }`}
        >
          {/* Content (without tool calls - they'll be rendered separately) */}
          <div className="break-words">
            {isUser ? (
              // User messages: render as plain text
              <div className="whitespace-pre-wrap">
                {message.content}
              </div>
            ) : (
              // Assistant messages: render as markdown with inline cursor
              <>
                <MarkdownMessage 
                  content={message.content} 
                  showCursor={message.isStreaming}
                />
              </>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`text-xs mt-2 ${
              isUser 
                ? "text-indigo-200" 
                : "text-gray-500"
            }`}
          >
            {formattedTime}
          </div>
        </div>

        {/* Actions (visible on hover for assistant messages) */}
        {!isUser && isHovered && (
          <div className="flex items-center space-x-2 mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRate("up")}
              className={`h-8 w-8 ${
                message.rating === "up" ? "text-green-600" : "text-gray-400"
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRate("down")}
              className={`h-8 w-8 ${
                message.rating === "down" ? "text-red-600" : "text-gray-400"
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-gray-400 hover:text-gray-600"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Regenerate</DropdownMenuItem>
                <DropdownMenuItem>Export</DropdownMenuItem>
                <DropdownMenuItem>Send to Slack</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

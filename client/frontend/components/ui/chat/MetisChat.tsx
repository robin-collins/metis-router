"use client";

import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import ChatHeader from './ChatHeader';
import ChatArea from './ChatArea';
import ChatComposer from './ChatComposer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const MetisChat = () => {
  const { darkMode, autoConnect } = useChatStore();
  const [composerSize, setComposerSize] = useState(30);

  // Resistance snap points - panel will "stick" to these sizes
  const snapPoints = [25, 35, 50, 65];
  const snapThreshold = 3; // How close to snap point to trigger snap

  const handlePanelResize = (size: number) => {
    // Check if we're close to any snap point
    const nearestSnap = snapPoints.find(snap => 
      Math.abs(size - snap) <= snapThreshold
    );
    
    if (nearestSnap && Math.abs(size - nearestSnap) < snapThreshold) {
      // Snap to the nearest point with slight delay for smooth feel
      setTimeout(() => setComposerSize(nearestSnap), 50);
    } else {
      setComposerSize(size);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto-connect to agent on mount
  useEffect(() => {
    autoConnect();
  }, [autoConnect]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        console.log('Command palette triggered');
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        console.log('Cheat sheet triggered');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`w-full h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <ChatHeader />
      <div className="flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
        <ResizablePanelGroup 
          direction="vertical" 
          className="h-full w-full"
          onLayout={(sizes) => {
            if (sizes && sizes.length >= 2) {
              const newSize = sizes[1];
              if (newSize && newSize !== composerSize) {
                handlePanelResize(newSize);
              }
            }
          }}
        >
          <ResizablePanel 
            defaultSize={70} 
            minSize={35} 
            maxSize={75}
            className="min-h-0"
          >
            <ChatArea />
          </ResizablePanel>
          
          <ResizableHandle />
          
          <ResizablePanel 
            defaultSize={30} 
            minSize={25} 
            maxSize={65}
            className="min-h-0"
            onResize={handlePanelResize}
          >
            <ChatComposer />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MetisChat;

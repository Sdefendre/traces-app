'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { electronAPI } from '@/lib/electron-api';
import { FileTree } from '@/components/sidebar/FileTree';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';

export function AppShell() {
  const { loadVault, setGraphData, refreshFiles, loading } = useVaultStore();
  const { sidebarWidth, editorWidth, chatOpen, chatWidth } = useUIStore();
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  // Listen for file changes and graph updates from main process
  useEffect(() => {
    const unsubFile = electronAPI.onFileChange((event, filePath) => {
      refreshFiles();
    });

    const unsubGraph = electronAPI.onGraphUpdate((data) => {
      setGraphData(data);
    });

    return () => {
      unsubFile();
      unsubGraph();
    };
  }, [refreshFiles, setGraphData]);

  // Resizable editor divider
  const handleDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useUIStore.getState().editorWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(900, startWidth + delta));
      useUIStore.getState().setEditorWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-void">
        <div className="text-center">
          <div className="text-neon-cyan text-2xl glow-cyan animate-pulse-glow mb-4">
            JARVIS
          </div>
          <div className="text-text-dim text-sm">Initializing neural network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-void overflow-hidden">
      {/* Title bar drag region */}
      <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-50" />

      {/* Sidebar */}
      <div
        className="flex-shrink-0 border-r border-border bg-surface/50 overflow-hidden pt-8"
        style={{ width: sidebarWidth }}
      >
        <FileTree />
      </div>

      {/* Graph */}
      <div className="flex-1 min-w-0 relative">
        <KnowledgeGraph />
      </div>

      {/* Resizable Divider */}
      <div
        ref={dividerRef}
        className="flex-shrink-0 w-1 bg-border hover:bg-neon-cyan/30 cursor-col-resize transition-colors"
        onMouseDown={handleDividerDrag}
      />

      {/* Editor */}
      <div
        className="flex-shrink-0 border-l border-border bg-void overflow-hidden"
        style={{ width: editorWidth }}
      >
        <EditorPanel />
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div
          className="flex-shrink-0 border-l border-border bg-surface/50 overflow-hidden"
          style={{ width: chatWidth }}
        >
          <ChatPanel />
        </div>
      )}
    </div>
  );
}

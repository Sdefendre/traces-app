'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { electronAPI } from '@/lib/electron-api';
import { FileTree } from '@/components/sidebar/FileTree';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { GraphSettings } from '@/components/graph/GraphSettings';

export function AppShell() {
  const { loadVault, setGraphData, refreshFiles, loading } = useVaultStore();
  const {
    sidebarWidth,
    editorWidth,
    chatOpen,
    chatWidth,
    graphFullscreen,
    graphCollapsed,
    toggleGraphFullscreen,
    toggleGraphCollapsed,
  } = useUIStore();
  const editorDividerRef = useRef<HTMLDivElement>(null);
  const sidebarDividerRef = useRef<HTMLDivElement>(null);
  const [editorDividerHover, setEditorDividerHover] = useState(false);
  const [sidebarDividerHover, setSidebarDividerHover] = useState(false);
  const [editorDragging, setEditorDragging] = useState(false);
  const [sidebarDragging, setSidebarDragging] = useState(false);

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

  // Resizable editor divider — works bidirectionally
  const handleEditorDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useUIStore.getState().editorWidth;
    const maxWidth = Math.floor(window.innerWidth * 0.8);

    setEditorDragging(true);

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(maxWidth, startWidth + delta));
      useUIStore.getState().setEditorWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setEditorDragging(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Resizable sidebar divider
  const handleSidebarDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useUIStore.getState().sidebarWidth;

    setSidebarDragging(true);

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      useUIStore.getState().setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarDragging(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg, #fff)' }}>
        <div className="text-center">
          <div className="text-2xl font-semibold mb-4" style={{ color: 'var(--text, #111)' }}>
            TRACES
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary, #888)' }}>Loading your knowledge graph...</div>
        </div>
      </div>
    );
  }

  /* ---- Fullscreen overlay ---- */
  if (graphFullscreen) {
    return (
      <div className="fixed inset-0 z-[100]" style={{ backgroundColor: 'var(--bg, #fff)' }}>
        {/* Title bar drag region */}
        <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-[110]" />

        <KnowledgeGraph />

        {/* Floating toolbar — exit fullscreen only */}
        <div
          className="fixed top-10 right-3 z-[120] flex gap-1 rounded-xl px-2 py-1.5 glass"
        >
          <button
            onClick={toggleGraphFullscreen}
            className="flex h-6 w-6 items-center justify-center rounded text-sm text-gray-400 hover:text-gray-800 transition-colors"
            title="Exit fullscreen"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg, #fff)' }}>
      {/* Title bar drag region */}
      <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-50" />

      {/* Sidebar */}
      <div
        className="flex-shrink-0 border-r border-border bg-surface/50 overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <FileTree />
      </div>

      {/* Sidebar resize divider */}
      <div
        ref={sidebarDividerRef}
        onMouseDown={handleSidebarDividerDrag}
        onMouseEnter={() => setSidebarDividerHover(true)}
        onMouseLeave={() => setSidebarDividerHover(false)}
        className="flex-shrink-0 cursor-col-resize transition-colors relative"
        style={{
          width: 4,
          backgroundColor:
            sidebarDragging || sidebarDividerHover
              ? '#2383e2'
              : 'var(--border, #c0c0c0)',
        }}
      >
        {/* Invisible wider hit area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Graph */}
      <div
        className="relative min-w-0 transition-all duration-300 ease-in-out"
        style={{
          flex: graphCollapsed ? '0 0 0px' : '1 1 0%',
          overflow: graphCollapsed ? 'hidden' : 'visible',
          opacity: graphCollapsed ? 0 : 1,
        }}
      >
        <KnowledgeGraph />

        {/* Floating toolbar — collapse, fullscreen, settings */}
        {!graphCollapsed && (
          <div
            className="absolute top-10 right-3 z-30 flex items-center gap-1 rounded-xl px-2 py-1.5 glass"
          >
            <button
              onClick={toggleGraphCollapsed}
              className="flex h-6 w-6 items-center justify-center rounded text-sm transition-colors"
              style={{ color: 'var(--text-secondary, #888)' }}
              title="Collapse graph"
            >
              −
            </button>
            <button
              onClick={toggleGraphFullscreen}
              className="flex h-6 w-6 items-center justify-center rounded text-sm transition-colors"
              style={{ color: 'var(--text-secondary, #888)' }}
              title="Fullscreen"
            >
              ⛶
            </button>
            <GraphSettings />
          </div>
        )}
      </div>

      {/* Colorful expand button when graph is collapsed */}
      {graphCollapsed && (
        <div className="flex-shrink-0 flex flex-col items-center pt-10 px-1">
          <button
            onClick={toggleGraphCollapsed}
            title="Expand graph"
            style={{
              background: 'linear-gradient(135deg, #2383e2, #9b59b6)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '6px 14px',
              minHeight: 32,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(35, 131, 226, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(35, 131, 226, 0.45)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(35, 131, 226, 0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: 15 }}>◧</span>
            Graph
          </button>
        </div>
      )}

      {/* Editor resize divider — always visible */}
      <div
        ref={editorDividerRef}
        onMouseDown={handleEditorDividerDrag}
        onMouseEnter={() => setEditorDividerHover(true)}
        onMouseLeave={() => setEditorDividerHover(false)}
        className="flex-shrink-0 cursor-col-resize transition-colors relative"
        style={{
          width: 4,
          backgroundColor:
            editorDragging || editorDividerHover
              ? '#2383e2'
              : 'var(--border, #c0c0c0)',
        }}
      >
        {/* Invisible wider hit area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Editor */}
      <div
        className="border-l border-border overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          ...(graphCollapsed
            ? { flex: '1 1 0%' }
            : { width: editorWidth, flexShrink: 0 }),
        }}
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

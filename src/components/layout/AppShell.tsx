'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';
import { electronAPI } from '@/lib/electron-api';
import { FileTree } from '@/components/sidebar/FileTree';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { GraphSettings } from '@/components/graph/GraphSettings';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Minus, Plus, PanelLeftClose, Maximize, X } from 'lucide-react';

export function AppShell() {
  const { loadVault, setGraphData, refreshFiles, loading } = useVaultStore();
  const {
    sidebarWidth,
    editorWidth,
    chatOpen,
    chatWidth,
    graphFullscreen,
    graphCollapsed,
    sidebarCollapsed,
    editorCollapsed,
    toggleGraphFullscreen,
    toggleGraphCollapsed,
    toggleSidebar,
    toggleEditorCollapsed,
    toggleChat,
  } = useUIStore();
  const { zoomIn, zoomOut } = useGraphStore();
  const editorDividerRef = useRef<HTMLDivElement>(null);
  const sidebarDividerRef = useRef<HTMLDivElement>(null);
  const [editorDividerHover, setEditorDividerHover] = useState(false);
  const [sidebarDividerHover, setSidebarDividerHover] = useState(false);
  const [editorDragging, setEditorDragging] = useState(false);
  const [sidebarDragging, setSidebarDragging] = useState(false);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

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
      <div className="flex items-center justify-center h-screen relative z-10">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-4 text-foreground">TRACES</div>
          <div className="text-sm text-muted-foreground">Loading your knowledge graph...</div>
        </div>
      </div>
    );
  }

  if (graphFullscreen) {
    return (
      <div className="fixed inset-0 z-[100]">
        <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-[110]" />
        <KnowledgeGraph />
        <div className="fixed top-10 right-3 z-[120] flex gap-1 rounded-xl px-2 py-1.5 glass">
          <Button variant="ghost" size="icon-xs" onClick={toggleGraphFullscreen} title="Exit fullscreen" className="titlebar-no-drag">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-50" />

      {/* Sidebar expand button */}
      {sidebarCollapsed && (
        <div className="flex-shrink-0 flex flex-col items-center justify-start relative z-[60]" style={{ width: 32, paddingTop: 48 }}>
          <Button variant="ghost" size="icon-xs" onClick={toggleSidebar} title="Expand sidebar" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      {!sidebarCollapsed && (
        <>
          <div
            className="flex-shrink-0 panel-glass overflow-hidden"
            style={{ width: sidebarWidth, borderRight: '1px solid var(--glass-border)' }}
          >
            <FileTree />
          </div>
          <div
            ref={sidebarDividerRef}
            onMouseDown={handleSidebarDividerDrag}
            onMouseEnter={() => setSidebarDividerHover(true)}
            onMouseLeave={() => setSidebarDividerHover(false)}
            className="flex-shrink-0 cursor-col-resize transition-colors relative"
            style={{
              width: 4,
              backgroundColor: sidebarDragging || sidebarDividerHover ? '#2383e2' : 'rgba(255,255,255,0.06)',
            }}
          >
            <div className="absolute inset-y-0 -left-2 -right-2" />
          </div>
        </>
      )}

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

        {/* Collapse graph chevron — top left */}
        {!graphCollapsed && (
          <div className="absolute top-12 left-3 z-[60]">
            <Button variant="ghost" size="icon-xs" onClick={toggleGraphCollapsed} title="Collapse graph" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        )}

        {!graphCollapsed && (
          <div className="absolute top-10 right-3 z-30 flex items-center gap-0.5 rounded-xl px-1.5 py-1 glass titlebar-no-drag">
            <Button variant="ghost" size="icon-sm" onClick={zoomOut} title="Zoom out" className="text-muted-foreground hover:text-foreground">
              <Minus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={zoomIn} title="Zoom in" className="text-muted-foreground hover:text-foreground">
              <Plus className="size-3.5" />
            </Button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            <Button variant="ghost" size="icon-sm" onClick={toggleGraphCollapsed} title="Collapse graph panel" className="text-muted-foreground hover:text-foreground">
              <PanelLeftClose className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleGraphFullscreen} title="Fullscreen" className="text-muted-foreground hover:text-foreground">
              <Maximize className="size-3.5" />
            </Button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            <GraphSettings />
          </div>
        )}
      </div>

      {/* Expand graph button when collapsed */}
      {graphCollapsed && (
        <div className="flex-shrink-0 flex flex-col items-center justify-start relative z-[60]" style={{ width: 32, paddingTop: 48 }}>
          <Button variant="ghost" size="icon-xs" onClick={toggleGraphCollapsed} title="Expand graph" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Editor resize divider */}
      {!editorCollapsed && (
        <div
          ref={editorDividerRef}
          onMouseDown={handleEditorDividerDrag}
          onMouseEnter={() => setEditorDividerHover(true)}
          onMouseLeave={() => setEditorDividerHover(false)}
          className="flex-shrink-0 cursor-col-resize transition-colors relative"
          style={{
            width: 4,
            backgroundColor: editorDragging || editorDividerHover ? '#2383e2' : 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
        </div>
      )}

      {/* Editor */}
      {!editorCollapsed ? (
        <div
          className="panel-glass overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            ...(graphCollapsed ? { flex: '1 1 0%' } : { width: editorWidth, flexShrink: 0 }),
            borderLeft: '1px solid var(--glass-border)',
          }}
        >
          <EditorPanel />
        </div>
      ) : (
        <div className="flex-shrink-0 flex flex-col items-center justify-start relative z-[60]" style={{ width: 32, paddingTop: 48 }}>
          <Button variant="ghost" size="icon-xs" onClick={toggleEditorCollapsed} title="Expand notes" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <div
          className="flex-shrink-0 panel-glass overflow-hidden"
          style={{ width: chatWidth, borderLeft: '1px solid var(--glass-border)' }}
        >
          <ChatPanel />
        </div>
      )}

      {/* Expand chat button */}
      {!chatOpen && (
        <div className="flex-shrink-0 flex flex-col items-center justify-start relative z-[60]" style={{ width: 32, paddingTop: 48 }}>
          <Button variant="ghost" size="icon-xs" onClick={toggleChat} title="Expand chat" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

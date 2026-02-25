'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';
import { electronAPI } from '@/lib/electron-api';
import { useSettingsStore } from '@/stores/settings-store';
import { FileTree } from '@/components/sidebar/FileTree';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { ViewToggle } from '@/components/graph/ViewToggle';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChevronRight, ChevronLeft, Minus, Plus, Maximize, X, Settings } from 'lucide-react';

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
    settingsOpen,
    toggleSettings,
  } = useUIStore();
  const { zoomIn, zoomOut } = useGraphStore();
  const { loadSettings } = useSettingsStore();
  const editorDividerRef = useRef<HTMLDivElement>(null);
  const sidebarDividerRef = useRef<HTMLDivElement>(null);
  const chatDividerRef = useRef<HTMLDivElement>(null);
  const [editorDividerHover, setEditorDividerHover] = useState(false);
  const [sidebarDividerHover, setSidebarDividerHover] = useState(false);
  const [chatDividerHover, setChatDividerHover] = useState(false);
  const [editorDragging, setEditorDragging] = useState(false);
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const [chatDragging, setChatDragging] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Cmd (Mac) / Ctrl (Win) combos
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key) {
        case '1': // Cmd+1: Toggle sidebar
          e.preventDefault();
          toggleSidebar();
          break;
        case '2': // Cmd+2: Toggle graph
          e.preventDefault();
          toggleGraphCollapsed();
          break;
        case '3': // Cmd+3: Toggle editor/notes
          e.preventDefault();
          toggleEditorCollapsed();
          break;
        case '4': // Cmd+4: Toggle chat
          e.preventDefault();
          toggleChat();
          break;
        case 'n': // Cmd+N: New note
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('traces:new-note'));
          break;
        case 'f': // Cmd+F: Focus search
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('traces:focus-search'));
          break;
        case '\\': // Cmd+\: Toggle fullscreen graph
          e.preventDefault();
          toggleGraphFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleGraphCollapsed, toggleEditorCollapsed, toggleChat, toggleGraphFullscreen]);

  useEffect(() => {
    loadVault();
    loadSettings();
  }, [loadVault, loadSettings]);

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

  const handleChatDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useUIStore.getState().chatWidth;

    setChatDragging(true);

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(280, Math.min(800, startWidth + delta));
      useUIStore.getState().setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setChatDragging(false);
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
        <ErrorBoundary>
          <KnowledgeGraph />
        </ErrorBoundary>
        <ViewToggle useSafeArea />
        <div className="fixed top-12 right-3 z-[120] flex gap-1 rounded-xl px-2 py-1.5 glass">
          <Button variant="ghost" size="icon-xs" onClick={toggleGraphFullscreen} title="Exit fullscreen" className="titlebar-no-drag">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Determine which panels are visible
  const graphVisible = !graphCollapsed;
  const editorVisible = !editorCollapsed;
  const chatVisible = chatOpen;

  // Dynamic flex: panels expand to fill space when graph is collapsed
  const editorFlex = editorVisible && !graphVisible;
  const chatFlex = chatVisible && !graphVisible && !editorVisible;

  // Collapsed tab strip — horizontal label with icon
  const CollapsedTab = ({ label, icon: Icon, onClick, title }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; title: string }) => (
    <button
      onClick={onClick}
      title={title}
      className="flex-shrink-0 flex items-center gap-1.5 cursor-pointer titlebar-no-drag relative z-[60] px-2 py-4 hover:bg-white/[0.04] transition-colors"
      style={{
        borderRight: '1px solid var(--glass-border)',
      }}
    >
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground tracking-wider uppercase whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-40" />

      {/* Collapsed panel strip — vertical tabs on the left, aligned to the edge */}
      {(sidebarCollapsed || graphCollapsed || editorCollapsed || !chatOpen) && (
        <div className="flex-shrink-0 flex flex-col items-stretch gap-3 panel-glass" style={{ paddingTop: 52, minWidth: 75, borderRight: '1px solid var(--glass-border)' }}>
          {sidebarCollapsed && (
            <CollapsedTab label="Files" icon={ChevronRight} onClick={toggleSidebar} title="Expand sidebar" />
          )}
          {graphCollapsed && (
            <CollapsedTab label="Graph" icon={ChevronRight} onClick={toggleGraphCollapsed} title="Expand graph" />
          )}
          {editorCollapsed && (
            <CollapsedTab label="Notes" icon={ChevronRight} onClick={toggleEditorCollapsed} title="Expand notes" />
          )}
          {!chatOpen && (
            <CollapsedTab label="Chat" icon={ChevronRight} onClick={toggleChat} title="Expand chat" />
          )}
        </div>
      )}

      {/* Sidebar */}
      {!sidebarCollapsed && (
        <>
          <div
            className="panel-glass overflow-hidden relative z-[45]"
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: '1px solid var(--glass-border)',
            }}
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

      {/* Graph — always flex-grow so layout never breaks */}
      <div
        className="relative min-w-0 transition-all duration-300 ease-in-out"
        style={{
          flex: '1 1 0%',
          overflow: graphCollapsed ? 'hidden' : 'visible',
          maxWidth: graphCollapsed ? 0 : undefined,
          opacity: graphCollapsed ? 0 : 1,
          pointerEvents: graphCollapsed ? 'none' : 'auto',
        }}
      >
        {/* Only mount 3D canvas when graph is visible — saves CPU/GPU when collapsed */}
        {!graphCollapsed && !settingsOpen && (
          <ErrorBoundary>
            <KnowledgeGraph />
          </ErrorBoundary>
        )}

        {!graphCollapsed && !settingsOpen && <ViewToggle />}

        {!graphCollapsed && !settingsOpen && (
          <div className="absolute top-12 right-3 z-30 flex items-center gap-0.5 rounded-xl px-1.5 py-1 glass titlebar-no-drag">
            <Button variant="ghost" size="icon-sm" onClick={zoomOut} title="Zoom out" className="text-muted-foreground hover:text-foreground">
              <Minus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={zoomIn} title="Zoom in" className="text-muted-foreground hover:text-foreground">
              <Plus className="size-3.5" />
            </Button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            <Button variant="ghost" size="icon-sm" onClick={toggleGraphCollapsed} title="Collapse graph panel" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleGraphFullscreen} title="Fullscreen" className="text-muted-foreground hover:text-foreground">
              <Maximize className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Editor resize divider */}
      {!editorCollapsed && !graphCollapsed && (
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
      {!editorCollapsed && (
        <div
          className="panel-glass overflow-hidden transition-all duration-300 ease-in-out relative z-[45]"
          style={{
            ...(editorFlex ? { flex: '1 1 0%' } : { width: editorWidth, flexShrink: 0 }),
            borderLeft: '1px solid var(--glass-border)',
          }}
        >
          <EditorPanel />
        </div>
      )}

      {/* Chat resize divider */}
      {chatOpen && !editorCollapsed && (
        <div
          ref={chatDividerRef}
          onMouseDown={handleChatDividerDrag}
          onMouseEnter={() => setChatDividerHover(true)}
          onMouseLeave={() => setChatDividerHover(false)}
          className="flex-shrink-0 cursor-col-resize transition-colors relative"
          style={{
            width: 4,
            backgroundColor: chatDragging || chatDividerHover ? '#2383e2' : 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
        </div>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <div
          className="panel-glass overflow-hidden relative z-[45]"
          style={{
            ...(chatFlex ? { flex: '1 1 0%' } : { width: chatWidth, flexShrink: 0 }),
            borderLeft: '1px solid var(--glass-border)',
          }}
        >
          <ErrorBoundary>
            <ChatPanel />
          </ErrorBoundary>
        </div>
      )}

      {/* Settings overlay — full screen */}
      {settingsOpen && <SettingsPanel />}

      {/* Settings button — fixed bottom-left */}
      <button
        onClick={toggleSettings}
        title="Settings"
        className="fixed bottom-3 left-3 z-[60] flex items-center justify-center size-8 rounded-lg titlebar-no-drag text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        style={{
          backgroundColor: settingsOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
        }}
      >
        <Settings className="size-4" />
      </button>
    </div>
  );
}

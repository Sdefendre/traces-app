'use client';

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { MarkdownEditor } from './MarkdownEditor';
import { Button } from '@/components/ui/button';
import { PanelRightClose, X, Sun, Moon } from 'lucide-react';

export function EditorPanel() {
  const { tabs, activeTabId, closeTab } = useEditorStore();
  const { activeFile } = useVaultStore();
  const { editorLightMode, toggleEditorTheme, toggleEditorCollapsed } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Editor-specific colors based on light/dark mode
  const editorBg = editorLightMode ? '#ffffff' : 'transparent';
  const editorText = editorLightMode ? '#09090b' : 'var(--text)';
  const editorSecondary = editorLightMode ? '#71717a' : 'var(--text-secondary)';
  const editorBorder = editorLightMode ? '#e4e4e7' : 'var(--border)';
  const editorHover = editorLightMode ? '#f4f4f5' : 'rgba(255,255,255,0.04)';

  // Listen for wiki-link navigation events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.target) {
        const { openFile } = useEditorStore.getState();
        const { files, setActiveFile } = useVaultStore.getState();
        const match = files.find(
          (f) =>
            f.split('/').pop()?.replace('.md', '').toLowerCase() ===
            detail.target.toLowerCase()
        );
        if (match) {
          setActiveFile(match);
          openFile(match);
          // Auto-expand if collapsed
          const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
          if (editorCollapsed) setEditorCollapsed(false);
        }
      }
    };
    window.addEventListener('traces:open-note', handler);
    return () => window.removeEventListener('traces:open-note', handler);
  }, []);

  if (!activeTab) {
    return (
      <div className="flex flex-col h-full">
        {/* Collapse button even when no file is open */}
        <div className="flex items-center justify-between px-4 pt-10 pb-2 relative z-[60]" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm text-muted-foreground">Notes</span>
          <Button variant="outline" size="icon-xs" onClick={toggleEditorCollapsed} title="Collapse notes" className="titlebar-no-drag">
            <PanelRightClose className="size-3" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Select a note to begin editing</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: editorBg, color: editorText, transition: 'background-color 0.3s, color 0.3s' }}>
      {/* Tab bar */}
      <div
        className="flex items-center h-9 overflow-x-auto pt-8"
        style={{ borderBottom: `1px solid ${editorBorder}` }}
      >
        {tabs.map((tab) => {
          const isActiveTab = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 px-3 h-full text-sm cursor-pointer transition-colors titlebar-no-drag ${
                !isActiveTab ? 'hover:bg-accent/50' : ''
              }`}
              style={{
                color: isActiveTab ? editorText : editorSecondary,
                borderBottom: isActiveTab ? `2px solid ${editorText}` : '2px solid transparent',
                fontWeight: isActiveTab ? 500 : 400,
              }}
              onClick={() => {
                useEditorStore.getState().openFile(tab.path);
                useVaultStore.getState().setActiveFile(tab.path);
              }}
            >
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: editorSecondary }} />
              )}
              <span className="truncate max-w-[120px]">{tab.name}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity size-4"
                style={{ color: editorLightMode ? '#a1a1aa' : 'var(--text-dim)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="size-2.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb + collapse + theme toggle */}
      <div
        className="flex items-center justify-between px-4 py-2 gap-2 relative z-[60]"
        style={{ borderBottom: `1px solid ${editorBorder}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={toggleEditorCollapsed}
            title="Collapse notes"
            className="titlebar-no-drag flex-shrink-0"
            style={{ borderColor: editorBorder, color: editorSecondary }}
          >
            <PanelRightClose className="size-3" />
          </Button>
          <span className="text-sm truncate" style={{ color: editorSecondary }}>
            {activeTab.path.replace(/\//g, ' / ')}
          </span>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={toggleEditorTheme}
          title={editorLightMode ? 'Switch to dark editor' : 'Switch to light editor'}
          style={{ borderColor: editorBorder, color: editorSecondary }}
          className="gap-1"
        >
          {editorLightMode ? <Moon className="size-3" /> : <Sun className="size-3" />}
          {editorLightMode ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden"
        data-editor-theme={editorLightMode ? 'light' : 'dark'}
      >
        <MarkdownEditor tabId={activeTab.id} content={activeTab.content} />
      </div>
    </div>
  );
}

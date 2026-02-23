'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { electronAPI } from '@/lib/electron-api';
import { MarkdownEditor } from './MarkdownEditor';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X, Sun, Moon, Plus } from 'lucide-react';

export function EditorPanel() {
  const { tabs, activeTabId, closeTab, openFile } = useEditorStore();
  const { activeFile, refreshFiles, setActiveFile } = useVaultStore();
  const { editorLightMode, toggleEditorTheme, toggleEditorCollapsed } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

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

  const handleCreateNote = useCallback(async () => {
    if (!newName.trim()) return;
    const fileName = newName.endsWith('.md') ? newName : `${newName}.md`;
    const filePath = `Memory/${fileName}`;
    await electronAPI.createFile(filePath, `# ${newName.replace('.md', '')}\n\n`);
    await refreshFiles();
    setCreating(false);
    setNewName('');
    setActiveFile(filePath);
    openFile(filePath);
  }, [newName, refreshFiles, setActiveFile, openFile]);

  if (!activeTab) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-12 pb-2 relative z-[60]" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm text-muted-foreground">Notes</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-xs" onClick={() => setCreating(true)} title="New note" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
              <Plus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={toggleEditorCollapsed} title="Collapse notes" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {creating ? (
            <div className="w-full max-w-[240px]">
              <input
                type="text"
                placeholder="Note name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNote();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[rgba(35,131,226,0.2)]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-2 text-center">Press Enter to create, Esc to cancel</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-3">Select a note to begin editing</div>
              <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="gap-1.5">
                <Plus className="size-3.5" />
                New Note
              </Button>
            </div>
          )}
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
            variant="ghost"
            size="icon-xs"
            onClick={toggleEditorCollapsed}
            title="Collapse notes"
            className="titlebar-no-drag flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
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

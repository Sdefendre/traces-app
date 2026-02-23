'use client';

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { MarkdownEditor } from './MarkdownEditor';

export function EditorPanel() {
  const { tabs, activeTabId, closeTab } = useEditorStore();
  const { activeFile } = useVaultStore();
  const { toggleChat } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

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
        }
      }
    };
    window.addEventListener('jarvis:open-note', handler);
    return () => window.removeEventListener('jarvis:open-note', handler);
  }, []);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim">
        <div className="text-center">
          <div className="text-3xl mb-2 opacity-20">{ }</div>
          <div className="text-sm">Select a node or file to begin editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-surface/50 border-b border-border overflow-x-auto pt-8">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-border
              transition-colors titlebar-no-drag
              ${tab.id === activeTabId
                ? 'bg-void text-neon-cyan'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
            onClick={() => {
              useEditorStore.getState().openFile(tab.path);
              useVaultStore.getState().setActiveFile(tab.path);
            }}
          >
            {/* Dirty indicator */}
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-neon-orange flex-shrink-0" />
            )}
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <button
              className="ml-1 text-text-dim hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              x
            </button>
          </div>
        ))}

        {/* Chat toggle */}
        <button
          onClick={toggleChat}
          className="ml-auto px-3 h-full text-text-dim hover:text-neon-purple transition-colors titlebar-no-drag"
          title="Toggle AI Chat"
        >
          AI
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-1.5 text-xs text-text-dim border-b border-border bg-void">
        {activeTab.path.replace(/\//g, ' / ')}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor tabId={activeTab.id} content={activeTab.content} />
      </div>
    </div>
  );
}

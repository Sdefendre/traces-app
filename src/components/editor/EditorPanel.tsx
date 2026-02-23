'use client';

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { MarkdownEditor } from './MarkdownEditor';

export function EditorPanel() {
  const { tabs, activeTabId, closeTab } = useEditorStore();
  const { activeFile } = useVaultStore();
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
    window.addEventListener('traces:open-note', handler);
    return () => window.removeEventListener('traces:open-note', handler);
  }, []);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-2" style={{ color: '#ddd' }}>{ }</div>
          <div className="text-sm" style={{ color: '#999' }}>Select a note or file to begin editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 overflow-x-auto pt-10" style={{ backgroundColor: '#fff', borderBottom: '1px solid var(--border, #c0c0c0)' }}>
        {tabs.map((tab) => {
          const isActiveTab = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className="group flex items-center gap-1.5 px-3 h-full text-sm cursor-pointer transition-colors titlebar-no-drag"
              style={{
                color: isActiveTab ? '#111' : '#888',
                borderBottom: isActiveTab ? '2px solid #111' : '2px solid transparent',
                fontWeight: isActiveTab ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActiveTab) e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                if (!isActiveTab) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                useEditorStore.getState().openFile(tab.path);
                useVaultStore.getState().setActiveFile(tab.path);
              }}
            >
              {/* Dirty indicator */}
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#888' }} />
              )}
              <span className="truncate max-w-[120px]">{tab.name}</span>
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: '#bbb', fontSize: '12px' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#bbb')}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb */}
      <div className="px-5 py-2 text-sm" style={{ color: '#999', borderBottom: '1px solid var(--border, #c0c0c0)', backgroundColor: '#fff' }}>
        {activeTab.path.replace(/\//g, ' / ')}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor tabId={activeTab.id} content={activeTab.content} />
      </div>
    </div>
  );
}

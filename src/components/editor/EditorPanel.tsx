'use client';

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { MarkdownEditor } from './MarkdownEditor';

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
          <div className="text-3xl mb-2" style={{ color: 'var(--text-dim)' }}>{ }</div>
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Select a note or file to begin editing</div>
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
              className="group flex items-center gap-1.5 px-3 h-full text-sm cursor-pointer transition-colors titlebar-no-drag"
              style={{
                color: isActiveTab ? editorText : editorSecondary,
                borderBottom: isActiveTab ? `2px solid ${editorText}` : '2px solid transparent',
                fontWeight: isActiveTab ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActiveTab) e.currentTarget.style.backgroundColor = editorHover;
              }}
              onMouseLeave={(e) => {
                if (!isActiveTab) e.currentTarget.style.backgroundColor = 'transparent';
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
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: editorLightMode ? '#a1a1aa' : 'var(--text-dim)', fontSize: '12px' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = editorText)}
                onMouseLeave={(e) => (e.currentTarget.style.color = editorLightMode ? '#a1a1aa' : 'var(--text-dim)')}
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

      {/* Breadcrumb + collapse + theme toggle */}
      <div
        className="flex items-center justify-between px-4 py-2 gap-2"
        style={{ borderBottom: `1px solid ${editorBorder}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Collapse editor button */}
          <button
            onClick={toggleEditorCollapsed}
            className="flex-shrink-0 titlebar-no-drag transition-colors"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 5,
              border: `1px solid ${editorBorder}`,
              background: 'transparent',
              color: editorSecondary,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = editorText)}
            onMouseLeave={(e) => (e.currentTarget.style.color = editorSecondary)}
            title="Collapse notes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm truncate" style={{ color: editorSecondary }}>
            {activeTab.path.replace(/\//g, ' / ')}
          </span>
        </div>
        <button
          onClick={toggleEditorTheme}
          className="transition-colors text-xs px-2 py-1 rounded"
          style={{
            color: editorSecondary,
            border: `1px solid ${editorBorder}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = editorText)}
          onMouseLeave={(e) => (e.currentTarget.style.color = editorSecondary)}
          title={editorLightMode ? 'Switch to dark editor' : 'Switch to light editor'}
        >
          {editorLightMode ? 'Dark' : 'Light'}
        </button>
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

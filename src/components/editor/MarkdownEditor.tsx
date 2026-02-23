'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { history, historyKeymap } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { neuralTheme, neuralHighlightStyle } from './extensions/theme';
import { wikiLinkPlugin } from './extensions/wikiLink';
import { useEditorStore } from '@/stores/editor-store';
import { useVaultStore } from '@/stores/vault-store';
import { electronAPI } from '@/lib/electron-api';

interface MarkdownEditorProps {
  tabId: string;
  content: string;
}

/** Extract title from first `# Heading` line */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

export function MarkdownEditor({ tabId, content }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const renameTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { setTabContent, saveTab } = useEditorStore();
  const { files } = useVaultStore();

  // Wiki-link autocomplete
  const wikiLinkCompletion = useCallback(
    (context: CompletionContext) => {
      const before = context.matchBefore(/\[\[[^\]]*$/);
      if (!before) return null;

      const query = before.text.slice(2).toLowerCase();
      const options = files
        .map((f) => {
          const name = f.split('/').pop()?.replace('.md', '') || f;
          return { label: name, apply: `${name}]]`, type: 'text' };
        })
        .filter((o) => o.label.toLowerCase().includes(query));

      return {
        from: before.from + 2,
        options,
        filter: false,
      };
    },
    [files]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        history(),
        markdown(),
        neuralTheme,
        neuralHighlightStyle,
        wikiLinkPlugin,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        autocompletion({ override: [wikiLinkCompletion] }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            setTabContent(tabId, newContent);

            // Debounced auto-save
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
              saveTab(tabId);
            }, 800);

            // Debounced title-based rename
            if (renameTimerRef.current) clearTimeout(renameTimerRef.current);
            renameTimerRef.current = setTimeout(() => {
              const title = extractTitle(newContent);
              if (!title) return;
              const sanitized = title.replace(/[<>:"/\\|?*]/g, '').trim();
              if (!sanitized) return;

              const { tabs } = useEditorStore.getState();
              const tab = tabs.find((t) => t.id === tabId);
              if (!tab) return;

              const currentName = tab.path.split('/').pop()?.replace('.md', '') || '';
              if (sanitized === currentName) return;

              const dir = tab.path.substring(0, tab.path.lastIndexOf('/'));
              const newPath = dir ? `${dir}/${sanitized}.md` : `${sanitized}.md`;

              electronAPI.renameFile(tab.path, newPath).then(() => {
                useEditorStore.getState().renameTab(tab.path, newPath);
                useVaultStore.getState().setActiveFile(newPath);
                useVaultStore.getState().refreshFiles();
              });
            }, 1500);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (renameTimerRef.current) clearTimeout(renameTimerRef.current);
      view.destroy();
    };
  }, [tabId]); // Only recreate when tab changes

  // Sync external content changes (e.g. AI edits) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (content !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className="h-full overflow-auto" />;
}

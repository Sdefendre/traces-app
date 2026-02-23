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

interface MarkdownEditorProps {
  tabId: string;
  content: string;
}

export function MarkdownEditor({ tabId, content }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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
      view.destroy();
    };
  }, [tabId]); // Only recreate when tab changes

  return <div ref={containerRef} className="h-full overflow-auto" />;
}

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Every color resolves through a CSS variable declared in globals.css, which is
// swapped by the [data-editor-theme="light"] wrapper. Hardcoded hex here would
// only be right for one of the two editor themes.
export const neuralTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--cm-bg)',
    color: 'var(--cm-text)',
  },
  '.cm-content': {
    caretColor: 'var(--cm-accent)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    padding: '16px 24px',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--cm-accent)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--cm-selection) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--cm-active-line)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--cm-active-line)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--cm-gutter-bg)',
    color: 'var(--cm-muted)',
    border: 'none',
    borderRight: '1px solid var(--cm-border)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--cm-gutter-bg)',
    border: '1px solid var(--cm-border)',
    color: 'var(--cm-secondary)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--cm-tooltip-bg)',
    border: '1px solid var(--cm-border)',
    color: 'var(--cm-text)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'var(--cm-selection)',
      color: 'var(--cm-accent)',
    },
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 212, 0, 0.35)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 212, 0, 0.55)',
  },
});

export const neuralHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, color: 'var(--cm-heading)', fontWeight: 'bold', fontSize: '1.5em' },
    { tag: tags.heading2, color: 'var(--cm-heading)', fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading3, color: 'var(--cm-heading)', fontWeight: 'bold', fontSize: '1.15em' },
    { tag: tags.heading4, color: 'var(--cm-heading)', fontWeight: 'bold' },
    { tag: tags.emphasis, color: 'var(--cm-text)', fontStyle: 'italic' },
    { tag: tags.strong, color: 'var(--cm-heading)', fontWeight: 'bold' },
    { tag: tags.strikethrough, color: 'var(--cm-muted)', textDecoration: 'line-through' },
    { tag: tags.link, color: 'var(--cm-link)', textDecoration: 'underline' },
    { tag: tags.url, color: 'var(--cm-link)' },
    { tag: tags.monospace, color: 'var(--cm-code)', fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" },
    { tag: tags.quote, color: 'var(--cm-secondary)', fontStyle: 'italic' },
    { tag: tags.list, color: 'var(--cm-text)' },
    { tag: tags.meta, color: 'var(--cm-muted)' },
    { tag: tags.comment, color: 'var(--cm-muted)' },
    { tag: tags.processingInstruction, color: 'var(--cm-muted)' },
  ])
);

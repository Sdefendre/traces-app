import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const neuralTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#37352f',
    },
    '.cm-content': {
      caretColor: '#2383e2',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      padding: '16px 24px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#2383e2',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(35, 131, 226, 0.12) !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
    '.cm-gutters': {
      backgroundColor: '#f7f7f8',
      color: '#b4b4b0',
      border: 'none',
      borderRight: '1px solid #e3e3e8',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#f7f7f8',
      border: '1px solid #e3e3e8',
      color: '#787774',
    },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      border: '1px solid #e3e3e8',
      color: '#37352f',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(35, 131, 226, 0.08)',
        color: '#2383e2',
      },
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255, 212, 0, 0.4)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(255, 212, 0, 0.6)',
    },
  },
  { dark: false }
);

export const neuralHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, color: '#37352f', fontWeight: 'bold', fontSize: '1.5em' },
    { tag: tags.heading2, color: '#37352f', fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading3, color: '#37352f', fontWeight: 'bold', fontSize: '1.15em' },
    { tag: tags.heading4, color: '#37352f', fontWeight: 'bold' },
    { tag: tags.emphasis, color: '#37352f', fontStyle: 'italic' },
    { tag: tags.strong, color: '#37352f', fontWeight: 'bold' },
    { tag: tags.strikethrough, color: '#b4b4b0', textDecoration: 'line-through' },
    { tag: tags.link, color: '#2383e2', textDecoration: 'underline' },
    { tag: tags.url, color: '#2383e2' },
    { tag: tags.monospace, color: '#eb5757', fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" },
    { tag: tags.quote, color: '#787774', fontStyle: 'italic' },
    { tag: tags.list, color: '#37352f' },
    { tag: tags.meta, color: '#b4b4b0' },
    { tag: tags.comment, color: '#b4b4b0' },
    { tag: tags.processingInstruction, color: '#b4b4b0' },
  ])
);

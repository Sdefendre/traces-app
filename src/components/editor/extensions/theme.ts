import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const neuralTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#e8e8f0',
    },
    '.cm-content': {
      caretColor: '#00f0ff',
      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
      padding: '16px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#00f0ff',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(0, 240, 255, 0.15) !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: '#555570',
      border: 'none',
      borderRight: '1px solid #2a2a3a',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#1a1a2e',
      border: '1px solid #2a2a3a',
      color: '#8888a0',
    },
    '.cm-tooltip': {
      backgroundColor: '#16161e',
      border: '1px solid #2a2a3a',
      color: '#e8e8f0',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(0, 240, 255, 0.15)',
        color: '#00f0ff',
      },
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(184, 77, 255, 0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(0, 240, 255, 0.3)',
    },
  },
  { dark: true }
);

export const neuralHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, color: '#00f0ff', fontWeight: 'bold', fontSize: '1.4em' },
    { tag: tags.heading2, color: '#b84dff', fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading3, color: '#ff8c42', fontWeight: 'bold', fontSize: '1.1em' },
    { tag: tags.heading4, color: '#39ff14', fontWeight: 'bold' },
    { tag: tags.emphasis, color: '#ff8c42', fontStyle: 'italic' },
    { tag: tags.strong, color: '#e8e8f0', fontWeight: 'bold' },
    { tag: tags.strikethrough, color: '#555570', textDecoration: 'line-through' },
    { tag: tags.link, color: '#00f0ff', textDecoration: 'underline' },
    { tag: tags.url, color: '#00f0ff' },
    { tag: tags.monospace, color: '#39ff14', fontFamily: "'SF Mono', monospace" },
    { tag: tags.quote, color: '#8888a0', fontStyle: 'italic' },
    { tag: tags.list, color: '#b84dff' },
    { tag: tags.meta, color: '#555570' },
    { tag: tags.comment, color: '#555570' },
    { tag: tags.processingInstruction, color: '#555570' },
  ])
);

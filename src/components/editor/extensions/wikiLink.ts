import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

class WikiLinkWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly display: string
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-wiki-link';
    span.textContent = this.display;
    span.style.color = '#00f0ff';
    span.style.cursor = 'pointer';
    span.style.textDecoration = 'underline';
    span.style.textDecorationColor = 'rgba(0, 240, 255, 0.4)';
    span.style.textUnderlineOffset = '3px';
    span.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('jarvis:open-note', { detail: { target: this.target } })
      );
    });
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    let match: RegExpExecArray | null;
    const regex = new RegExp(WIKI_LINK_RE.source, WIKI_LINK_RE.flags);

    while ((match = regex.exec(text)) !== null) {
      const from = line.from + match.index;
      const to = from + match[0].length;
      const target = match[1].trim();
      const display = match[2]?.trim() || target;

      // Don't replace if cursor is inside the link
      const sel = view.state.selection.main;
      if (sel.from >= from && sel.from <= to) continue;

      builder.add(
        from,
        to,
        Decoration.replace({
          widget: new WikiLinkWidget(target, display),
        })
      );
    }
  }

  return builder.finish();
}

export const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: { docChanged: boolean; selectionSet: boolean; view: EditorView }) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

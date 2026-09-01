import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { useVaultStore } from '@/stores/vault-store';
import { resolveWikiLink } from '@/lib/wiki-links';

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

class WikiLinkWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly display: string,
    readonly resolved: boolean
  ) {
    super();
  }

  eq(other: WikiLinkWidget) {
    return (
      other.target === this.target &&
      other.display === this.display &&
      other.resolved === this.resolved
    );
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = this.resolved ? 'cm-wiki-link' : 'cm-wiki-link is-unresolved';
    span.textContent = this.display;
    span.title = this.resolved
      ? `Open "${this.target}"`
      : `"${this.target}" does not exist yet — click to create it`;
    span.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('traces:open-note', { detail: { target: this.target } })
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
  const files = useVaultStore.getState().files;

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
          widget: new WikiLinkWidget(target, display, resolveWikiLink(files, target) !== null),
        })
      );
    }
  }

  return builder.finish();
}

export const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private unsubscribe: () => void;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
      // Re-evaluate resolved/unresolved when notes are created or deleted.
      this.unsubscribe = useVaultStore.subscribe((state, prev) => {
        if (state.files === prev.files) return;
        // Defer so we never dispatch from inside another CodeMirror update.
        queueMicrotask(() => {
          this.decorations = buildDecorations(view);
          view.dispatch({});
        });
      });
    }

    update(update: { docChanged: boolean; selectionSet: boolean; view: EditorView }) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }

    destroy() {
      this.unsubscribe();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

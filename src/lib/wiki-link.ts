/**
 * Shared wiki-link parsing for the editor, preview, and graph.
 * [[Note|label]] must open Note, not a file named "Note|label".
 */

export interface ParsedWikiLink {
  target: string;
  display: string;
}

export function parseWikiLink(raw: string): ParsedWikiLink {
  const trimmed = raw.trim();
  const pipe = trimmed.indexOf('|');
  if (pipe === -1) {
    return { target: trimmed, display: trimmed };
  }

  const target = trimmed.slice(0, pipe).trim();
  const display = trimmed.slice(pipe + 1).trim() || target;
  return { target, display };
}

export function applyWikiLinks(
  text: string,
  escapeAttr: (value: string) => string
): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_match, raw: string) => {
    const { target, display } = parseWikiLink(raw);
    const safeTarget = escapeAttr(target);
    const safeDisplay = escapeAttr(display);
    return `<a class="md-wiki-link" data-wiki-target="${safeTarget}" href="#">${safeDisplay}</a>`;
  });
}

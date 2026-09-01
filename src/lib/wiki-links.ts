import { resolveNotePath } from '@/lib/webmcp-notes';
import { parseWikiLink } from '@/lib/wiki-link';

/**
 * Find the vault file a `[[target]]` (or `[[target|alias]]`) points at.
 * When several notes share the name, the first candidate wins so a click
 * never silently creates a duplicate.
 */
export function resolveWikiLink(files: string[], rawTarget: string): string | null {
  const { target } = parseWikiLink(rawTarget);
  if (!target) return null;
  const { path, candidates } = resolveNotePath(files, target);
  return path ?? candidates[0] ?? null;
}

/** Strip characters that are illegal in file names before creating a note from a link. */
export function sanitizeNoteTitle(target: string): string {
  return parseWikiLink(target).target.replace(/[<>:"/\\|?*]/g, '').trim();
}

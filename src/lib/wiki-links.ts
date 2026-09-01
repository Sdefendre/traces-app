import { resolveNotePath } from './webmcp-notes';
import { parseWikiLink } from './wiki-link';

export interface WikiLinkResolution {
  /** The single note this link points at, or null when none exists or several match. */
  path: string | null;
  /** Every note whose name matches; more than one entry means the link is ambiguous. */
  candidates: string[];
}

/**
 * Resolve a `[[target]]` (or `[[target|alias]]`) against the vault.
 * Callers that need to open a note should use this so they can tell
 * "missing" (no candidates) apart from "ambiguous" (several candidates).
 */
export function resolveWikiLinkTarget(files: string[], rawTarget: string): WikiLinkResolution {
  const { target } = parseWikiLink(rawTarget);
  if (!target) return { path: null, candidates: [] };
  return resolveNotePath(files, target);
}

/**
 * Find the vault file a `[[target]]` points at, for styling and hover text.
 * When several notes share the name, the first candidate is returned so the
 * link still renders as "exists" rather than "missing".
 */
export function resolveWikiLink(files: string[], rawTarget: string): string | null {
  const { path, candidates } = resolveWikiLinkTarget(files, rawTarget);
  return path ?? candidates[0] ?? null;
}

/** Strip characters that are illegal in file names before creating a note from a link. */
export function sanitizeNoteTitle(target: string): string {
  return parseWikiLink(target).target.replace(/[<>:"/\\|?*]/g, '').trim();
}

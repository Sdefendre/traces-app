import { basenameWithoutExt, normalizeRelativePath } from './paths';

export interface NotePathMatch {
  path: string;
  name: string;
}

export interface ResolvedNotePath {
  path: string | null;
  candidates: string[];
}

/**
 * Filter vault file paths by a case-insensitive substring.
 * Returns paths and names only. Never reads note bodies.
 */
export function matchNotePaths(files: string[], query: string): NotePathMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return files
    .map((filePath) => normalizeRelativePath(filePath))
    .filter((filePath) => filePath.toLowerCase().includes(needle))
    .map((filePath) => ({
      path: filePath,
      name: basenameWithoutExt(filePath),
    }));
}

/**
 * Resolve a user-supplied path or note name to one vault file.
 * Ambiguous names are not opened.
 */
export function resolveNotePath(files: string[], requested: string): ResolvedNotePath {
  const normalized = normalizeRelativePath(requested.trim());
  if (!normalized) return { path: null, candidates: [] };

  const normalizedFiles = files.map((filePath) => normalizeRelativePath(filePath));
  const exact = normalizedFiles.find((filePath) => filePath === normalized);
  if (exact) return { path: exact, candidates: [exact] };

  const requestedName = basenameWithoutExt(normalized).toLowerCase();
  const byName = normalizedFiles.filter(
    (filePath) => basenameWithoutExt(filePath).toLowerCase() === requestedName
  );
  if (byName.length === 1) return { path: byName[0], candidates: byName };
  return { path: null, candidates: byName };
}

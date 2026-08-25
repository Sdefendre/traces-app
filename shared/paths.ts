// Shared path utilities (main + renderer).
/** Normalize vault-relative paths to forward slashes for cross-platform use. */
export function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

export function basenameWithoutExt(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  const name = normalized.split('/').pop() || normalized;
  return name.replace(/\.md$/i, '');
}

export function dirnameRelative(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? '' : normalized.slice(0, idx);
}

/** Title shown in the new note, without a leftover .md suffix. */
export function noteTitleFromName(name: string): string {
  return name.replace(/\.md$/i, '').trim();
}

/**
 * Put a new note next to the open file, or at the vault root.
 * Older code always wrote into Memory/, which created a Memory folder in every vault.
 */
export function buildNewNotePath(name: string, activeFile: string | null): string {
  const title = noteTitleFromName(name);
  const fileName = `${title}.md`;
  if (!activeFile) return fileName;
  const dir = dirnameRelative(activeFile);
  return dir ? `${dir}/${fileName}` : fileName;
}
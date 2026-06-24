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
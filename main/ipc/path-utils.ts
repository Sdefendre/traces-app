import path from 'path';

export function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

export function toRelativeVaultPath(vaultRoot: string, absolutePath: string): string {
  return normalizeRelativePath(path.relative(path.resolve(vaultRoot), path.resolve(absolutePath)));
}

export function basenameWithoutExt(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  const name = path.posix.basename(normalized);
  return name.replace(/\.md$/i, '');
}
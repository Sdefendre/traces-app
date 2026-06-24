import path from 'path';
import {
  normalizeRelativePath,
  basenameWithoutExt,
  dirnameRelative,
} from '../../shared/paths';

export { normalizeRelativePath, basenameWithoutExt, dirnameRelative };

export function toRelativeVaultPath(vaultRoot: string, absolutePath: string): string {
  const rel = path.relative(path.resolve(vaultRoot), path.resolve(absolutePath));
  return normalizeRelativePath(rel);
}
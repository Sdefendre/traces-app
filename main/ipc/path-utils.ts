import path from 'path';
import {
  normalizeRelativePath,
  basenameWithoutExt,
  dirnameRelative,
} from '../../shared/paths';

export { normalizeRelativePath, basenameWithoutExt, dirnameRelative };

export function toRelativeVaultPath(vaultRoot: string, absolutePath: string): string {
  // path.relative + forward-slash normalization
  return normalizeRelativePath(path.relative(path.resolve(vaultRoot), path.resolve(absolutePath)));
}
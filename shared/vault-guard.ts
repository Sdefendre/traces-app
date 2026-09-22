import fs from 'fs/promises';
import path from 'path';
import { normalizeRelativePath } from './paths';

/** True when `candidate` is the root itself or a file inside it. */
export function isInsideRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  return resolved === resolvedRoot || resolved.startsWith(rootWithSep);
}

/**
 * Resolve a vault-relative path and reject anything that climbs out of the folder.
 * A sibling folder whose name merely starts with the vault name is rejected too.
 */
export function resolvedInsideRoot(root: string, filePath: string): string {
  const vaultRoot = path.resolve(root);
  const resolved = path.resolve(vaultRoot, normalizeRelativePath(filePath));
  if (!isInsideRoot(vaultRoot, resolved)) {
    throw new Error(`Path traversal blocked: ${filePath}`);
  }
  return resolved;
}

/**
 * Follow real folders, then reject the result if a shortcut points outside the vault.
 * Missing files are allowed when their parent folder is still inside the vault.
 */
export async function realpathInsideRoot(root: string, filePath: string): Promise<string> {
  const resolved = resolvedInsideRoot(root, filePath);
  const realRoot = await fs.realpath(root);

  let current = resolved;
  const missing: string[] = [];
  while (true) {
    try {
      await fs.lstat(current);
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
      const parent = path.dirname(current);
      if (parent === current) break;
      missing.push(path.basename(current));
      current = parent;
    }
  }

  const realExisting = await fs.realpath(current);
  const finalPath =
    missing.length === 0 ? realExisting : path.join(realExisting, ...missing.reverse());

  let realFinal = finalPath;
  try {
    realFinal = await fs.realpath(finalPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }

  if (!isInsideRoot(realRoot, realFinal)) {
    throw new Error(`Path traversal blocked: ${filePath}`);
  }
  return realFinal;
}

import fs from 'fs/promises';
import path from 'path';
import { realpathInsideRoot } from '../../shared/vault-guard';
import { normalizeRelativePath } from './path-utils';

/** Directories skipped during vault walks and watcher events. */
export const IGNORE_DIRS = ['Google-Drive', 'node_modules'];

let vaultRoot = '';

export function setVaultRoot(root: string) {
  vaultRoot = path.resolve(root); // normalized for safePath checks
}

export function getVaultRoot(): string {
  return vaultRoot;
}

/** Resolve a vault-relative path and refuse shortcuts that point outside the vault. */
async function safePath(filePath: string): Promise<string> {
  return realpathInsideRoot(vaultRoot, filePath);
}

export async function listFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.includes(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(normalizeRelativePath(path.relative(vaultRoot, fullPath)));
      }
    }
  }

  await walk(vaultRoot);
  return files.sort();
}

export async function readFile(filePath: string): Promise<string> {
  const resolved = await safePath(filePath);
  return fs.readFile(resolved, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = await safePath(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf-8');
}

/** Create a new note. Fails if that file already exists, so a new note cannot erase an old one. */
export async function createFile(filePath: string, content = ''): Promise<void> {
  const resolved = await safePath(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  try {
    await fs.writeFile(resolved, content, { encoding: 'utf-8', flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`A note already exists at ${normalizeRelativePath(filePath)}`);
    }
    throw err;
  }
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const resolvedOld = await safePath(oldPath);
  const resolvedNew = await safePath(newPath);
  if (resolvedOld === resolvedNew) return;

  let destinationExists = true;
  try {
    await fs.access(resolvedNew);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') destinationExists = false;
    else throw err;
  }
  if (destinationExists) {
    throw new Error(`A note already exists at ${normalizeRelativePath(newPath)}`);
  }

  await fs.mkdir(path.dirname(resolvedNew), { recursive: true });
  await fs.rename(resolvedOld, resolvedNew);
}

export async function deleteFile(filePath: string): Promise<void> {
  const resolved = await safePath(filePath);
  await fs.unlink(resolved);
}

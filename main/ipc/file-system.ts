import fs from 'fs/promises';
import path from 'path';

let vaultRoot = '';

export function setVaultRoot(root: string) {
  vaultRoot = root;
}

export function getVaultRoot(): string {
  return vaultRoot;
}

/** Validate path is within vault — prevents path traversal attacks */
function safePath(filePath: string): string {
  const resolved = path.resolve(vaultRoot, filePath);
  if (!resolved.startsWith(vaultRoot)) {
    throw new Error(`Path traversal blocked: ${filePath}`);
  }
  return resolved;
}

export async function listFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden files, Google Drive sync, and node_modules
      if (entry.name.startsWith('.') || entry.name === 'Google-Drive' || entry.name === 'node_modules') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(path.relative(vaultRoot, fullPath));
      }
    }
  }

  await walk(vaultRoot);
  return files.sort();
}

export async function readFile(filePath: string): Promise<string> {
  const resolved = safePath(filePath);
  return fs.readFile(resolved, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = safePath(filePath);
  await fs.writeFile(resolved, content, 'utf-8');
}

export async function createFile(filePath: string, content = ''): Promise<void> {
  const resolved = safePath(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf-8');
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const resolvedOld = safePath(oldPath);
  const resolvedNew = safePath(newPath);
  await fs.mkdir(path.dirname(resolvedNew), { recursive: true });
  await fs.rename(resolvedOld, resolvedNew);
}

export async function deleteFile(filePath: string): Promise<void> {
  const resolved = safePath(filePath);
  await fs.unlink(resolved);
}

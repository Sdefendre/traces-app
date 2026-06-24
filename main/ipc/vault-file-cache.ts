// Harness-visible: traces-app/main/ipc/vault-file-cache.ts
import path from 'path';

let warmVaultRoot: string | null = null;
let knownFiles: string[] = [];
const contentCache = new Map<string, string>();

/** True when this vault was already bootstrapped in-process (skips listFiles). */
export function isWarm(vaultRoot: string): boolean {
  return warmVaultRoot === path.resolve(vaultRoot) && knownFiles.length > 0;
}

export function getKnownFiles(): string[] {
  return knownFiles;
}

export function getContentCache(): Map<string, string> {
  return contentCache;
}

export function setKnownFiles(files: string[]) {
  knownFiles = files;
}

export function markWarm(vaultRoot: string) {
  warmVaultRoot = path.resolve(vaultRoot);
}

/** Cold reset — required when switching vault folders or on app quit. */
export function resetVaultFileCache() {
  warmVaultRoot = null;
  knownFiles = [];
  contentCache.clear();
}
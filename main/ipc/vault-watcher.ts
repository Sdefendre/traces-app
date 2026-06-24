import { BrowserWindow } from 'electron';
import path from 'path';
import { watch, FSWatcher } from 'chokidar';
import { listFiles, readFile, IGNORE_DIRS } from './file-system';
import { parseVault } from './vault-parser';
import { toRelativeVaultPath } from './path-utils';

let watcher: FSWatcher | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChanges = new Map<string, 'add' | 'change' | 'unlink'>();
const contentCache = new Map<string, string>();
let knownFiles: string[] = [];

const REBUILD_DEBOUNCE_MS = 400;

async function hydrateCacheForFiles(files: string[]) {
  for (const file of files) {
    if (!contentCache.has(file)) {
      try {
        contentCache.set(file, await readFile(file));
      } catch {
        contentCache.delete(file);
      }
    }
  }
}

async function applyPendingChanges(): Promise<boolean> {
  const changes = new Map(pendingChanges);
  pendingChanges.clear();
  if (changes.size === 0) return false;

  let needsFullListing = false;

  for (const [rel, evt] of changes) {
    if (evt === 'unlink') {
      contentCache.delete(rel);
      knownFiles = knownFiles.filter((f) => f !== rel);
    } else if (evt === 'add') {
      if (!knownFiles.includes(rel)) {
        knownFiles.push(rel);
      }
      try {
        contentCache.set(rel, await readFile(rel));
      } catch {
        contentCache.delete(rel);
        knownFiles = knownFiles.filter((f) => f !== rel);
        needsFullListing = true;
      }
    } else if (evt === 'change') {
      try {
        contentCache.set(rel, await readFile(rel));
      } catch {
        contentCache.delete(rel);
        knownFiles = knownFiles.filter((f) => f !== rel);
        needsFullListing = true;
      }
    }
  }

  if (needsFullListing) {
    knownFiles = await listFiles();
    for (const key of [...contentCache.keys()]) {
      if (!knownFiles.includes(key)) contentCache.delete(key);
    }
    await hydrateCacheForFiles(knownFiles);
  }

  knownFiles.sort();
  return true;
}

async function rebuildGraph(
  resolvedRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const win = getWindow();
  if (!win || win.isDestroyed()) return;

  try {
    const hadChanges = await applyPendingChanges();
    if (!hadChanges && knownFiles.length === 0) {
      knownFiles = await listFiles();
      await hydrateCacheForFiles(knownFiles);
    }

    const graphData = await parseVault(resolvedRoot, knownFiles, contentCache);
    win.webContents.send('vault:graphUpdate', graphData);
  } catch (err) {
    console.error('Error rebuilding graph:', err);
  }
}

export async function startVaultWatcher(
  vaultRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const resolvedRoot = path.resolve(vaultRoot);
  contentCache.clear();
  pendingChanges.clear();
  knownFiles = await listFiles();
  await hydrateCacheForFiles(knownFiles);

  watcher = watch(resolvedRoot, {
    ignored: [
      /(^|[\/\\])\./,
      ...IGNORE_DIRS.map((d) => new RegExp(d)),
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 200,
    },
  });

  const scheduleGraphRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      void rebuildGraph(resolvedRoot, getWindow);
    }, REBUILD_DEBOUNCE_MS);
  };

  const handleChange = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
    const win = getWindow();
    if (!win || win.isDestroyed() || !filePath.endsWith('.md')) return;

    const relative = toRelativeVaultPath(resolvedRoot, filePath);
    win.webContents.send('vault:fileChange', eventType, relative);
    pendingChanges.set(relative, eventType);
    scheduleGraphRebuild();
  };

  watcher.on('add', (p) => handleChange('add', p));
  watcher.on('change', (p) => handleChange('change', p));
  watcher.on('unlink', (p) => handleChange('unlink', p));
}

export function stopVaultWatcher() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
  pendingChanges.clear();
  contentCache.clear();
  knownFiles = [];
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
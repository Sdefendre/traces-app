import { BrowserWindow } from 'electron';
import path from 'path';
import { watch, FSWatcher } from 'chokidar';
import { listFiles, readFile, IGNORE_DIRS } from './file-system';
import { parseVault } from './vault-parser';
import { toRelativeVaultPath } from './path-utils';
import {
  getContentCache,
  getKnownFiles,
  isWarm,
  markWarm,
  resetVaultFileCache,
  setKnownFiles,
} from './vault-file-cache';

let watcher: FSWatcher | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChanges = new Map<string, 'add' | 'change' | 'unlink'>();

const REBUILD_DEBOUNCE_MS = 400;
const READ_RETRY_DELAY_MS = 100;
const READ_RETRY_COUNT = 2;

export { resetVaultFileCache };

async function readFileWithRetry(rel: string): Promise<string | null> {
  const contentCache = getContentCache();
  for (let attempt = 0; attempt < READ_RETRY_COUNT; attempt++) {
    try {
      return await readFile(rel);
    } catch {
      if (attempt < READ_RETRY_COUNT - 1) {
        await new Promise((resolve) => setTimeout(resolve, READ_RETRY_DELAY_MS));
      }
    }
  }
  return null;
}

async function hydrateCacheForFiles(files: string[]) {
  const contentCache = getContentCache();
  for (const file of files) {
    if (!contentCache.has(file)) {
      const content = await readFileWithRetry(file);
      if (content !== null) {
        contentCache.set(file, content);
      }
    }
  }
}

/** Full listFiles scan — only on cold vault open (not warm watcher restarts). */
async function bootstrapKnownFiles() {
  const files = (await listFiles()).sort();
  setKnownFiles(files);
  await hydrateCacheForFiles(files);
}

async function applyPendingChanges(): Promise<boolean> {
  const contentCache = getContentCache();
  let knownFiles = getKnownFiles();

  const changes = new Map(pendingChanges);
  pendingChanges.clear();
  if (changes.size === 0) return false;

  for (const [rel, evt] of changes) {
    if (evt === 'unlink') {
      contentCache.delete(rel);
      knownFiles = knownFiles.filter((f) => f !== rel);
      continue;
    }

    if (evt === 'add' && !knownFiles.includes(rel)) {
      knownFiles.push(rel);
    }

    const content = await readFileWithRetry(rel);
    if (content !== null) {
      contentCache.set(rel, content);
    } else if (evt === 'add') {
      contentCache.delete(rel);
      knownFiles = knownFiles.filter((f) => f !== rel);
    }
  }

  knownFiles.sort();
  setKnownFiles(knownFiles);
  return true;
}

async function pushGraphFromCache(
  resolvedRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const win = getWindow();
  if (!win || win.isDestroyed()) return;

  const graphData = await parseVault(
    resolvedRoot,
    getKnownFiles(),
    getContentCache()
  );
  win.webContents.send('vault:graphUpdate', graphData);
}

async function rebuildGraph(
  resolvedRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const win = getWindow();
  if (!win || win.isDestroyed()) return;

  try {
    const hadChanges = await applyPendingChanges();
    if (!hadChanges) return;
    await pushGraphFromCache(resolvedRoot, getWindow);
  } catch (err) {
    console.error('Error rebuilding graph:', err);
  }
}

export async function startVaultWatcher(
  vaultRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const resolvedRoot = path.resolve(vaultRoot);
  pendingChanges.clear();

  // First open or after resetVaultFileCache: one listFiles scan (required).
  // Warm restarts on the same vault skip listFiles entirely.
  const coldStart = !isWarm(resolvedRoot);
  if (coldStart) {
    await bootstrapKnownFiles();
    markWarm(resolvedRoot);
    await pushGraphFromCache(resolvedRoot, getWindow);
  } else {
    await pushGraphFromCache(resolvedRoot, getWindow);
  }

  if (watcher) {
    await watcher.close();
    watcher = null;
  }

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
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
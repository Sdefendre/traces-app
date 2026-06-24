import { BrowserWindow } from 'electron';
import path from 'path';
import { watch, FSWatcher } from 'chokidar';
import { listFiles, IGNORE_DIRS } from './file-system';
import { parseVault } from './vault-parser';
import { toRelativeVaultPath } from './path-utils';

let watcher: FSWatcher | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRebuild = false;

const REBUILD_DEBOUNCE_MS = 400;

export function startVaultWatcher(
  vaultRoot: string,
  getWindow: () => BrowserWindow | null
) {
  const resolvedRoot = path.resolve(vaultRoot);

  watcher = watch(resolvedRoot, {
    ignored: [
      /(^|[\/\\])\./,            // dotfiles
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
    pendingRebuild = true;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      if (!pendingRebuild) return;
      pendingRebuild = false;
      const win = getWindow();
      if (!win || win.isDestroyed()) return;
      try {
        const files = await listFiles();
        const graphData = await parseVault(resolvedRoot, files);
        win.webContents.send('vault:graphUpdate', graphData);
      } catch (err) {
        console.error('Error rebuilding graph:', err);
      }
    }, REBUILD_DEBOUNCE_MS);
  };

  const handleChange = (eventType: string, filePath: string) => {
    const win = getWindow();
    if (!win || win.isDestroyed() || !filePath.endsWith('.md')) return;

    const relative = toRelativeVaultPath(resolvedRoot, filePath);
    win.webContents.send('vault:fileChange', eventType, relative);
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
  pendingRebuild = false;
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
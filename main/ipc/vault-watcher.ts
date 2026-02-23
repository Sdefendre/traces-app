import { BrowserWindow } from 'electron';
import { watch, FSWatcher } from 'chokidar';
import { listFiles } from './file-system';
import { parseVault } from './vault-parser';

let watcher: FSWatcher | null = null;

export function startVaultWatcher(
  vaultRoot: string,
  getWindow: () => BrowserWindow | null
) {
  watcher = watch(vaultRoot, {
    ignored: [
      /(^|[\/\\])\./,            // dotfiles
      /Google-Drive/,            // Google Drive sync folder
      /node_modules/,
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  const handleChange = async (eventType: string, filePath: string) => {
    const win = getWindow();
    if (!win || !filePath.endsWith('.md')) return;

    // Notify renderer of individual file change
    const relative = filePath.replace(vaultRoot + '/', '');
    win.webContents.send('vault:fileChange', eventType, relative);

    // Rebuild and push graph data
    try {
      const files = await listFiles();
      const graphData = await parseVault(vaultRoot, files);
      win.webContents.send('vault:graphUpdate', graphData);
    } catch (err) {
      console.error('Error rebuilding graph:', err);
    }
  };

  watcher.on('add', (p) => handleChange('add', p));
  watcher.on('change', (p) => handleChange('change', p));
  watcher.on('unlink', (p) => handleChange('unlink', p));
}

export function stopVaultWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

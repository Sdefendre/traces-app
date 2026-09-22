import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'node:fs';
import { registerIpcHandlers } from './ipc/handlers';
import { setVaultRoot } from './ipc/file-system';
import { resetVaultFileCache, startVaultWatcher, stopVaultWatcher } from './ipc/vault-watcher';

// TRACES_VAULT_DIR lets automated checks point the app at a scratch vault
// instead of the user's notes. Normal launches ignore it.
let vaultPath = process.env.TRACES_VAULT_DIR
  ? path.resolve(process.env.TRACES_VAULT_DIR)
  : path.join(app.getPath('home'), 'Desktop', 'Traces Notes');

// Ensure default vault directory exists so first boot doesn't crash
fs.mkdirSync(vaultPath, { recursive: true });

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let allowClose = false;
let flushPurpose: 'quit' | 'close' | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_TIMEOUT_MS = 4000;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1800, width),
    height: Math.min(1100, height),
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3333');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    if (allowClose || isQuitting) return;
    event.preventDefault();
    requestFlush('close');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function clearFlushTimer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Ask the window to write unsaved notes, then quit or close. */
function requestFlush(purpose: 'quit' | 'close') {
  if (flushPurpose) return;
  const win = mainWindow;
  if (!win || win.isDestroyed()) {
    finishFlush(true);
    return;
  }
  flushPurpose = purpose;
  win.webContents.send('app:before-quit');
  clearFlushTimer();
  // If the window never answers, still quit or close so the app cannot get stuck.
  flushTimer = setTimeout(() => {
    finishFlush(true);
  }, FLUSH_TIMEOUT_MS);
}

function finishFlush(saved: boolean) {
  clearFlushTimer();
  const purpose = flushPurpose;
  flushPurpose = null;
  if (!purpose) return;

  if (!saved) {
    const win = mainWindow;
    if (win && !win.isDestroyed()) {
      const response = dialog.showMessageBoxSync(win, {
        type: 'warning',
        buttons: purpose === 'quit' ? ['Quit anyway', 'Stay'] : ['Close anyway', 'Stay'],
        defaultId: 1,
        cancelId: 1,
        message: 'Some notes could not be saved.',
        detail:
          purpose === 'quit'
            ? 'Quit anyway and lose those unsaved changes?'
            : 'Close the window anyway and lose those unsaved changes?',
      });
      if (response !== 0) return;
    }
  }

  if (purpose === 'quit') {
    isQuitting = true;
    allowClose = true;
    void stopVaultWatcher();
    resetVaultFileCache();
    app.quit();
    return;
  }

  allowClose = true;
  mainWindow?.close();
  allowClose = false;
}

app.whenReady().then(() => {
  registerIpcHandlers(vaultPath);
  createWindow();
  void startVaultWatcher(vaultPath, () => mainWindow);

  // IPC handler: open a native folder picker and switch the vault root
  ipcMain.handle('vault:openFolder', async () => {
    const win = mainWindow;
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: 'Open Folder',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];

    // Update vault root in file-system module
    vaultPath = selectedPath;
    setVaultRoot(selectedPath);

    // Cold restart: new vault requires full cache reset
    await stopVaultWatcher();
    resetVaultFileCache();
    void startVaultWatcher(selectedPath, () => mainWindow);

    return selectedPath;
  });
});

// Defer quit until renderer flushes dirty editor tabs via onBeforeQuit.
app.on('before-quit', (event) => {
  if (isQuitting) return;
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;

  event.preventDefault();
  requestFlush('quit');
});

ipcMain.handle('app:ready-to-quit', (_event, saved?: boolean) => {
  finishFlush(saved !== false);
});

app.on('window-all-closed', () => {
  void stopVaultWatcher();
  resetVaultFileCache();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
    void startVaultWatcher(vaultPath, () => mainWindow);
  }
});

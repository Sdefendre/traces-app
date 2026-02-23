import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { setVaultRoot } from './ipc/file-system';
import { startVaultWatcher, stopVaultWatcher } from './ipc/vault-watcher';

let vaultPath = path.join(
  app.getPath('home'),
  'Desktop',
  'Traces Notes'
);

let mainWindow: BrowserWindow | null = null;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(vaultPath);
  createWindow();
  startVaultWatcher(vaultPath, () => mainWindow);

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

    // Restart the watcher on the new folder
    stopVaultWatcher();
    startVaultWatcher(selectedPath, () => mainWindow);

    return selectedPath;
  });
});

app.on('window-all-closed', () => {
  stopVaultWatcher();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

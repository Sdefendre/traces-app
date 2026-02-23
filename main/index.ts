import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { startVaultWatcher, stopVaultWatcher } from './ipc/vault-watcher';

const VAULT_PATH = path.join(
  app.getPath('home'),
  'Desktop',
  'Jarvis-Obsidian-Vault'
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
  registerIpcHandlers(VAULT_PATH);
  createWindow();
  startVaultWatcher(VAULT_PATH, () => mainWindow);
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

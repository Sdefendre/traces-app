import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  setVaultRoot,
  listFiles,
  readFile,
  writeFile,
  createFile,
  renameFile,
  deleteFile,
} from './file-system';
import { parseVault } from './vault-parser';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function registerIpcHandlers(vaultRoot: string) {
  setVaultRoot(vaultRoot);

  ipcMain.handle('vault:listFiles', async () => {
    return listFiles();
  });

  ipcMain.handle('vault:readFile', async (_event, filePath: string) => {
    return readFile(filePath);
  });

  ipcMain.handle('vault:writeFile', async (_event, filePath: string, content: string) => {
    return writeFile(filePath, content);
  });

  ipcMain.handle('vault:createFile', async (_event, filePath: string, content?: string) => {
    return createFile(filePath, content);
  });

  ipcMain.handle('vault:renameFile', async (_event, oldPath: string, newPath: string) => {
    return renameFile(oldPath, newPath);
  });

  ipcMain.handle('vault:deleteFile', async (_event, filePath: string) => {
    return deleteFile(filePath);
  });

  ipcMain.handle('vault:getGraphData', async () => {
    const files = await listFiles();
    return parseVault(vaultRoot, files);
  });

  ipcMain.handle('settings:load', async () => {
    try {
      const data = fs.readFileSync(getSettingsPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  });

  ipcMain.handle('settings:save', async (_event, data: Record<string, unknown>) => {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), 'utf-8');
  });
}

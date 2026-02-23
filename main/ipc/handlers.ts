import { ipcMain } from 'electron';
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
}

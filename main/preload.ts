import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVaultPath: () => ipcRenderer.invoke('vault:getVaultPath'),
  listFiles: () => ipcRenderer.invoke('vault:listFiles'),
  readFile: (filePath: string) => ipcRenderer.invoke('vault:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('vault:writeFile', filePath, content),
  createFile: (filePath: string, content?: string) =>
    ipcRenderer.invoke('vault:createFile', filePath, content),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('vault:renameFile', oldPath, newPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('vault:deleteFile', filePath),
  getGraphData: () => ipcRenderer.invoke('vault:getGraphData'),
  openFolder: () => ipcRenderer.invoke('vault:openFolder'),

  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('settings:save', data),

  createRealtimeSession: (opts: { apiKey: string; voice?: string; instructions?: string }) =>
    ipcRenderer.invoke('realtime:createSession', opts),
  createGrokSession: (opts: { apiKey: string }) =>
    ipcRenderer.invoke('realtime:createGrokSession', opts),
  executeRealtimeTool: (opts: { toolName: string; args: Record<string, string> }) =>
    ipcRenderer.invoke('realtime:executeTool', opts),

  chat: (opts: { messages: unknown[]; provider: string; model: string; apiKey?: string; systemPrompt?: string }) =>
    ipcRenderer.invoke('chat:send', opts),

  onFileChange: (callback: (event: string, filePath: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: string, filePath: string) =>
      callback(event, filePath);
    ipcRenderer.on('vault:fileChange', handler);
    return () => ipcRenderer.removeListener('vault:fileChange', handler);
  },

  onGraphUpdate: (
    callback: (data: { nodes: unknown[]; edges: unknown[] }) => void
  ) => {
    const handler = (_: Electron.IpcRendererEvent, data: { nodes: unknown[]; edges: unknown[] }) =>
      callback(data);
    ipcRenderer.on('vault:graphUpdate', handler);
    return () => ipcRenderer.removeListener('vault:graphUpdate', handler);
  },

  // Flushes dirty editor tabs before app quit.
  onBeforeQuit: (callback: () => void | Promise<void>) => {
    const handler = async () => {
      try {
        await callback();
      } catch (err) {
        console.error('before-quit handler failed:', err);
      } finally {
        await ipcRenderer.invoke('app:ready-to-quit');
      }
    };
    ipcRenderer.on('app:before-quit', handler);
    return () => ipcRenderer.removeListener('app:before-quit', handler);
  },
});

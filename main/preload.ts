import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  listFiles: () => ipcRenderer.invoke('vault:listFiles'),
  readFile: (filePath: string) => ipcRenderer.invoke('vault:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('vault:writeFile', filePath, content),
  createFile: (filePath: string, content?: string) =>
    ipcRenderer.invoke('vault:createFile', filePath, content),
  deleteFile: (filePath: string) => ipcRenderer.invoke('vault:deleteFile', filePath),
  getGraphData: () => ipcRenderer.invoke('vault:getGraphData'),

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
});

import type { GraphData } from '@/types';

export interface ElectronAPI {
  listFiles: () => Promise<string[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string, content?: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  getGraphData: () => Promise<GraphData>;
  openFolder: () => Promise<string | null>;
  loadSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (data: Record<string, unknown>) => Promise<void>;
  onFileChange: (callback: (event: string, filePath: string) => void) => () => void;
  onGraphUpdate: (callback: (data: GraphData) => void) => () => void;
}

function getAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI as unknown as ElectronAPI;
  }
  return null;
}

export const electronAPI = {
  async listFiles(): Promise<string[]> {
    const api = getAPI();
    if (!api) return [];
    return api.listFiles();
  },

  async readFile(filePath: string): Promise<string> {
    const api = getAPI();
    if (!api) return '';
    return api.readFile(filePath);
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    return api.writeFile(filePath, content);
  },

  async createFile(filePath: string, content?: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    return api.createFile(filePath, content);
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    return api.renameFile(oldPath, newPath);
  },

  async deleteFile(filePath: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    return api.deleteFile(filePath);
  },

  async getGraphData(): Promise<GraphData> {
    const api = getAPI();
    if (!api) return { nodes: [], edges: [] };
    return api.getGraphData();
  },

  async openFolder(): Promise<string | null> {
    const api = getAPI();
    if (!api) return null;
    return api.openFolder();
  },

  async loadSettings(): Promise<Record<string, unknown>> {
    const api = getAPI();
    if (!api) return {};
    return api.loadSettings();
  },

  async saveSettings(data: Record<string, unknown>): Promise<void> {
    const api = getAPI();
    if (!api) return;
    return api.saveSettings(data);
  },

  onFileChange(callback: (event: string, filePath: string) => void): () => void {
    const api = getAPI();
    if (!api) return () => {};
    return api.onFileChange(callback);
  },

  onGraphUpdate(callback: (data: GraphData) => void): () => void {
    const api = getAPI();
    if (!api) return () => {};
    return api.onGraphUpdate(callback);
  },
};

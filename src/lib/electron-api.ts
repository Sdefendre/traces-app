import type { GraphData } from '@/types';

export interface RealtimeSessionResult {
  clientSecret: string;
  sessionId: string;
}

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
  createRealtimeSession: (opts: { apiKey: string; voice?: string; instructions?: string }) => Promise<RealtimeSessionResult>;
  executeRealtimeTool: (opts: { toolName: string; args: Record<string, string> }) => Promise<string>;
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

  async createRealtimeSession(opts: { apiKey: string; voice?: string; instructions?: string }): Promise<RealtimeSessionResult> {
    // Always use the API route — it has access to .env.local (OPENAI_API_KEY).
    // Falls back to IPC only if the fetch fails (e.g. production static export).
    try {
      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Realtime session error (${res.status}): ${text}`);
      }
      return await res.json();
    } catch (fetchErr) {
      // If API route is unavailable (production), try IPC
      const api = getAPI();
      if (api) {
        return api.createRealtimeSession(opts);
      }
      throw fetchErr;
    }
  },

  async executeRealtimeTool(opts: { toolName: string; args: Record<string, string> }): Promise<string> {
    try {
      const res = await fetch('/api/realtime/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Tool execution failed (${res.status})`);
      }
      const data = await res.json();
      return data.result;
    } catch (fetchErr) {
      const api = getAPI();
      if (api) {
        return api.executeRealtimeTool(opts);
      }
      throw fetchErr;
    }
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

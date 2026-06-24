import type { GraphData } from '@/types';

export interface RealtimeSessionResult {
  clientSecret: string;
  sessionId: string;
}

export interface GrokSessionResult {
  clientSecret: string;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  provider: string;
  model: string;
  apiKey?: string;
  systemPrompt?: string;
}

export interface ChatResult {
  message: string;
  toolCalls: { name: string; args: Record<string, string>; result: string }[];
}

export interface ElectronAPI {
  getVaultPath: () => Promise<string>;
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
  chat: (opts: ChatRequest) => Promise<ChatResult>;
  createRealtimeSession: (opts: { apiKey: string; voice?: string; instructions?: string }) => Promise<RealtimeSessionResult>;
  createGrokSession: (opts: { apiKey: string }) => Promise<GrokSessionResult>;
  executeRealtimeTool: (opts: { toolName: string; args: Record<string, string> }) => Promise<string>;
  onFileChange: (callback: (event: string, filePath: string) => void) => () => void;
  onGraphUpdate: (callback: (data: GraphData) => void) => () => void;
  onBeforeQuit: (callback: () => void | Promise<void>) => () => void;
}

function getAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI as unknown as ElectronAPI;
  }
  return null;
}

export const electronAPI = {
  async getVaultPath(): Promise<string> {
    const api = getAPI();
    if (!api || typeof api.getVaultPath !== 'function') return '';
    return api.getVaultPath();
  },

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

  async chat(opts: ChatRequest): Promise<ChatResult> {
    // IPC-first (works in both dev and production)
    const api = getAPI();
    if (api && typeof api.chat === 'function') {
      return api.chat(opts);
    }
    // Fallback to API route (dev only)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return res.json();
  },

  async createRealtimeSession(opts: { apiKey: string; voice?: string; instructions?: string }): Promise<RealtimeSessionResult> {
    // IPC-first (works in both dev and production)
    const api = getAPI();
    if (api) {
      return api.createRealtimeSession(opts);
    }
    // Fallback to API route (dev without Electron)
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
  },

  async createGrokSession(opts: { apiKey: string }): Promise<GrokSessionResult> {
    const api = getAPI();
    if (api) {
      return api.createGrokSession(opts);
    }
    const res = await fetch('/api/realtime/grok-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Grok session error (${res.status}): ${text}`);
    }
    return await res.json();
  },

  async executeRealtimeTool(opts: { toolName: string; args: Record<string, string> }): Promise<string> {
    const api = getAPI();
    if (api) {
      return api.executeRealtimeTool(opts);
    }
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

  onBeforeQuit(callback: () => void | Promise<void>): () => void {
    // Renderer hook for app:before-quit flush.
    const api = getAPI();
    if (!api || typeof api.onBeforeQuit !== 'function') return () => {};
    return api.onBeforeQuit(callback);
  },
};

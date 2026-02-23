import { create } from 'zustand';
import type { GraphData, GraphNode, GraphEdge } from '@/types';
import { electronAPI } from '@/lib/electron-api';

interface VaultState {
  files: string[];
  graphData: GraphData;
  activeFile: string | null;
  loading: boolean;
  vaultName: string;

  loadVault: () => Promise<void>;
  setActiveFile: (path: string | null) => void;
  setGraphData: (data: GraphData) => void;
  refreshFiles: () => Promise<void>;
  openFolder: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  files: [],
  graphData: { nodes: [], edges: [] },
  activeFile: null,
  loading: true,
  vaultName: 'Traces Vault',

  loadVault: async () => {
    set({ loading: true });
    try {
      const [files, graphData] = await Promise.all([
        electronAPI.listFiles(),
        electronAPI.getGraphData(),
      ]);
      set({ files, graphData, loading: false });
    } catch (err) {
      console.error('Failed to load vault:', err);
      set({ loading: false });
    }
  },

  setActiveFile: (path) => set({ activeFile: path }),

  setGraphData: (data) => set({ graphData: data }),

  refreshFiles: async () => {
    const files = await electronAPI.listFiles();
    set({ files });
  },

  openFolder: async () => {
    const selectedPath = await electronAPI.openFolder();
    if (selectedPath) {
      // Extract the folder name from the full path
      const folderName = selectedPath.split('/').pop() || selectedPath;
      set({ vaultName: folderName, activeFile: null });
      await get().loadVault();
    }
  },
}));

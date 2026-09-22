import { create } from 'zustand';
import type { GraphData } from '@/types';
import { electronAPI } from '@/lib/electron-api';
import { normalizeRelativePath } from '@/lib/paths';
import { useEditorStore } from '@/stores/editor-store';
import { useSettingsStore } from '@/stores/settings-store';

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
      const [files, graphData, vaultPath] = await Promise.all([
        electronAPI.listFiles(),
        electronAPI.getGraphData(), // watcher also pushes vault:graphUpdate after bootstrap
        electronAPI.getVaultPath(),
      ]);
      const vaultName = vaultPath ? folderName(vaultPath) : 'Traces Vault';
      set({
        files: files.map(normalizeRelativePath),
        graphData,
        vaultName,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load vault:', err);
      set({ loading: false });
    }
  },

  setActiveFile: (path) => {
    set({ activeFile: path });
    if (path) {
      useSettingsStore.getState().updateSettings({ lastNotePath: path });
    }
  },

  setGraphData: (data) => set({ graphData: data }),

  refreshFiles: async () => {
    try {
      const files = await electronAPI.listFiles();
      set({ files: files.map((f) => normalizeRelativePath(f)) });
    } catch (err) {
      console.error('Failed to refresh files:', err);
    }
  },

  openFolder: async () => {
    const saved = await useEditorStore.getState().saveAllDirty();
    if (!saved) {
      window.alert('Could not save your open notes, so the folder was not changed.');
      return;
    }
    const selectedPath = await electronAPI.openFolder();
    if (selectedPath) {
      // Notes were saved above, while the previous folder was still active.
      useEditorStore.getState().clearTabs();
      set({ vaultName: folderName(selectedPath), activeFile: null });
      await get().loadVault();
    }
  },
}));

function folderName(fullPath: string): string {
  const parts = fullPath.split(/[/\\]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] || 'Traces Vault';
}

import { create } from 'zustand';
import type { EditorTab } from '@/types';
import { electronAPI } from '@/lib/electron-api';
import { basenameWithoutExt, normalizeRelativePath } from '@/lib/paths';

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;

  openFile: (path: string) => Promise<void>;
  closeTab: (id: string) => void;
  clearTabs: () => void;
  setTabContent: (id: string, content: string) => void;
  markClean: (id: string) => void;
  saveTab: (id: string) => Promise<void>;
  saveAllDirty: () => Promise<void>;
  getActiveTab: () => EditorTab | null;
  renameTab: (oldPath: string, newPath: string) => void;
  reloadTab: (path: string) => Promise<void>;
}

export function pathToId(p: string) {
  return normalizeRelativePath(p).replace(/\//g, '__');
}

function nameFromPath(p: string) {
  return basenameWithoutExt(p);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (path) => {
    const normalizedPath = normalizeRelativePath(path);
    const id = pathToId(normalizedPath);
    const existing = get().tabs.find((t) => t.id === id);
    if (existing) {
      set({ activeTabId: id });
      return;
    }

    try {
      const content = await electronAPI.readFile(normalizedPath);
      const tab: EditorTab = {
        id,
        path: normalizedPath,
        name: nameFromPath(normalizedPath),
        content,
        isDirty: false,
      };

      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: id,
      }));
    } catch (err) {
      console.error('Failed to open file:', normalizedPath, err);
    }
  },

  closeTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (tab?.isDirty) {
      void get().saveTab(id);
    }
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
      }
      return { tabs, activeTabId };
    });
  },

  clearTabs: () => {
    set({ tabs: [], activeTabId: null });
  },

  setTabContent: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t
      ),
    }));
  },

  markClean: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isDirty: false } : t
      ),
    }));
  },

  saveTab: async (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || !tab.isDirty) return;
    try {
      await electronAPI.writeFile(tab.path, tab.content);
      get().markClean(id);
    } catch (err) {
      console.error('Failed to save tab:', tab.path, err);
      throw err;
    }
  },

  saveAllDirty: async () => {
    const dirtyTabs = get().tabs.filter((t) => t.isDirty);
    await Promise.all(dirtyTabs.map((t) => get().saveTab(t.id)));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || null;
  },

  renameTab: (oldPath, newPath) => {
    const normalizedOld = normalizeRelativePath(oldPath);
    const normalizedNew = normalizeRelativePath(newPath);
    const oldId = pathToId(normalizedOld);
    const newId = pathToId(normalizedNew);
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === oldId ? { ...t, id: newId, path: normalizedNew, name: nameFromPath(normalizedNew) } : t
      ),
      activeTabId: state.activeTabId === oldId ? newId : state.activeTabId,
    }));
  },

  reloadTab: async (path) => {
    const normalizedPath = normalizeRelativePath(path);
    const id = pathToId(normalizedPath);
    const existing = get().tabs.find((t) => t.id === id);
    if (!existing || existing.isDirty) return;
    try {
      const content = await electronAPI.readFile(path);
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, content, isDirty: false } : t
        ),
      }));
    } catch {
      // File may have been deleted
    }
  },
}));

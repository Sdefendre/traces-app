import { create } from 'zustand';
import type { EditorTab } from '@/types';
import { electronAPI } from '@/lib/electron-api';

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;

  openFile: (path: string) => Promise<void>;
  closeTab: (id: string) => void;
  setTabContent: (id: string, content: string) => void;
  markClean: (id: string) => void;
  saveTab: (id: string) => Promise<void>;
  getActiveTab: () => EditorTab | null;
}

function pathToId(p: string) {
  return p.replace(/[\/\\]/g, '__');
}

function nameFromPath(p: string) {
  return p.split('/').pop()?.replace('.md', '') || p;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (path) => {
    const id = pathToId(path);
    const existing = get().tabs.find((t) => t.id === id);
    if (existing) {
      set({ activeTabId: id });
      return;
    }

    const content = await electronAPI.readFile(path);
    const tab: EditorTab = {
      id,
      path,
      name: nameFromPath(path),
      content,
      isDirty: false,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
    }));
  },

  closeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
      }
      return { tabs, activeTabId };
    });
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
    if (!tab) return;
    await electronAPI.writeFile(tab.path, tab.content);
    get().markClean(id);
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || null;
  },
}));

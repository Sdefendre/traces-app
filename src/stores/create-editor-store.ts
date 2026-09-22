// Harness-visible: traces-app/src/stores/create-editor-store.ts
import { create } from 'zustand';
import { planTabClose } from '../../shared/tab-close-policy';
import type { CloseTabOptions, EditorTab } from '../types';
import { basenameWithoutExt, normalizeRelativePath } from '../lib/paths';

export interface EditorStoreDeps {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;

  openFile: (path: string) => Promise<void>;
  /** Returns true if tab was removed, false if kept open (save failed). */
  closeTab: (id: string, options?: CloseTabOptions) => Promise<boolean>;
  clearTabs: () => void;
  setTabContent: (id: string, content: string) => void;
  markClean: (id: string) => void;
  saveTab: (id: string) => Promise<void>;
  /** Returns false when any dirty note could not be written. */
  saveAllDirty: () => Promise<boolean>;
  getActiveTab: () => EditorTab | null;
  renameTab: (oldPath: string, newPath: string) => void;
  reloadTab: (path: string) => Promise<void>;
}

export function pathToId(p: string) {
  // Encoding keeps "a/b.md" and "a__b.md" from sharing one tab.
  return encodeURIComponent(normalizeRelativePath(p));
}

function nameFromPath(p: string) {
  return basenameWithoutExt(p);
}

type EditorSet = (
  partial: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)
) => void;

/** Mark a tab clean only when the text we wrote is still the text on screen. */
function markCleanIfUnchanged(
  set: EditorSet,
  get: () => EditorState,
  id: string,
  savedPath: string,
  snapshot: string
) {
  const current = get().tabs.find((t) => t.id === id);
  if (!current || current.path !== savedPath || current.content !== snapshot) return;
  set((state) => ({
    tabs: state.tabs.map((t) =>
      t.id === id ? { ...t, isDirty: false, saveError: null } : t
    ),
  }));
}

function removeTab(state: { tabs: EditorTab[]; activeTabId: string | null }, id: string) {
  const tabs = state.tabs.filter((t) => t.id !== id);
  let activeTabId = state.activeTabId;
  if (activeTabId === id) {
    activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
  }
  return { tabs, activeTabId };
}

export function createEditorStore(deps: EditorStoreDeps) {
  return create<EditorState>((set, get) => ({
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
        const content = await deps.readFile(normalizedPath);
        // A second open can finish while this read is still in flight.
        if (get().tabs.some((t) => t.id === id)) {
          set({ activeTabId: id });
          return;
        }
        const tab: EditorTab = {
          id,
          path: normalizedPath,
          name: nameFromPath(normalizedPath),
          content,
          isDirty: false,
          saveError: null,
        };

        set((state) => ({
          tabs: [...state.tabs, tab],
          activeTabId: id,
        }));
      } catch (err) {
        console.error('Failed to open file:', normalizedPath, err);
      }
    },

    closeTab: async (id, options) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return true;

      const action = planTabClose(
        { isDirty: tab.isDirty, saveError: tab.saveError },
        options
      );

      if (action === 'keep-open') {
        return false;
      }

      if (action === 'save-and-close') {
        const snapshot = tab.content;
        const savedPath = tab.path;
        try {
          await deps.writeFile(savedPath, snapshot);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('Failed to save tab on close:', tab.path, err);
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === id ? { ...t, saveError: message } : t
            ),
            activeTabId: state.activeTabId ?? id,
          }));
          return false;
        }
        const current = get().tabs.find((t) => t.id === id);
        // Typing landed while the save was in flight. Keep the tab open with the newer text.
        if (current && (current.content !== snapshot || current.path !== savedPath)) {
          return false;
        }
      }

      set((state) => removeTab(state, id));
      return true;
    },

    clearTabs: () => {
      set({ tabs: [], activeTabId: null });
    },

    setTabContent: (id, content) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, content, isDirty: true, saveError: null } : t
        ),
      }));
    },

    markClean: (id) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, isDirty: false, saveError: null } : t
        ),
      }));
    },

    saveTab: async (id) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab || !tab.isDirty) return;
      const snapshot = tab.content;
      const savedPath = tab.path;
      try {
        await deps.writeFile(savedPath, snapshot);
        markCleanIfUnchanged(set, get, id, savedPath, snapshot);
      } catch (err) {
        console.error('Failed to save tab:', tab.path, err);
        throw err;
      }
    },

    saveAllDirty: async () => {
      const dirtyTabs = get().tabs.filter((t) => t.isDirty);
      let ok = true;
      for (const tab of dirtyTabs) {
        const snapshot = tab.content;
        const savedPath = tab.path;
        try {
          await deps.writeFile(savedPath, snapshot);
          markCleanIfUnchanged(set, get, tab.id, savedPath, snapshot);
        } catch (err) {
          ok = false;
          console.error('Failed to save tab:', tab.path, err);
        }
      }
      return ok;
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
          t.id === oldId
            ? { ...t, id: newId, path: normalizedNew, name: nameFromPath(normalizedNew), saveError: null }
            : t
        ),
        activeTabId: state.activeTabId === oldId ? newId : state.activeTabId,
      }));
    },

    reloadTab: async (path) => {
      const normalizedPath = normalizeRelativePath(path);
      const id = pathToId(normalizedPath);
      const existing = get().tabs.find((t) => t.id === id);
      if (!existing || existing.isDirty) return;
      const baseline = existing.content;
      try {
        const content = await deps.readFile(normalizedPath);
        const current = get().tabs.find((t) => t.id === id);
        // The user typed while the disk read was in flight. Keep their text.
        if (!current || current.isDirty || current.content !== baseline) return;
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, content, isDirty: false, saveError: null } : t
          ),
        }));
      } catch {
        // File may have been deleted
      }
    },
  }));
}
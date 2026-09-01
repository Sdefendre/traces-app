import { create } from 'zustand';
import { useSettingsStore } from './settings-store';

interface UIState {
  sidebarWidth: number;
  editorWidth: number;
  chatOpen: boolean;
  chatWidth: number;
  graphFullscreen: boolean;
  graphCollapsed: boolean;
  sidebarCollapsed: boolean;
  editorCollapsed: boolean;
  editorLightMode: boolean;
  previewMode: boolean;
  settingsOpen: boolean;
  /** Lives here (not in FileTree) so the query survives collapsing the sidebar. */
  sidebarSearch: string;

  setSidebarWidth: (w: number) => void;
  setSidebarSearch: (q: string) => void;
  setEditorWidth: (w: number) => void;
  toggleChat: () => void;
  setChatOpen: (v: boolean) => void;
  setChatWidth: (w: number) => void;
  toggleGraphFullscreen: () => void;
  toggleGraphCollapsed: () => void;
  toggleSidebar: () => void;
  toggleEditorCollapsed: () => void;
  setEditorCollapsed: (v: boolean) => void;
  toggleEditorTheme: () => void;
  setEditorLightMode: (v: boolean) => void;
  togglePreview: () => void;
  toggleSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 240,
  editorWidth: 500,
  chatOpen: false,
  chatWidth: 360,
  graphFullscreen: false,
  graphCollapsed: false,
  sidebarCollapsed: false,
  editorCollapsed: false,
  editorLightMode: false,
  previewMode: false,
  settingsOpen: false,
  sidebarSearch: '',

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setSidebarSearch: (q) => set({ sidebarSearch: q }),
  setEditorWidth: (w) => set({ editorWidth: w }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatOpen: (v) => set({ chatOpen: v }),
  setChatWidth: (w) => set({ chatWidth: w }),
  toggleGraphFullscreen: () =>
    set((s) => ({ graphFullscreen: !s.graphFullscreen })),
  toggleGraphCollapsed: () =>
    set((s) => ({ graphCollapsed: !s.graphCollapsed })),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleEditorCollapsed: () =>
    set((s) => ({ editorCollapsed: !s.editorCollapsed })),
  setEditorCollapsed: (v) => set({ editorCollapsed: v }),
  setEditorLightMode: (v) => set({ editorLightMode: v }),
  toggleEditorTheme: () =>
    set((s) => {
      const editorLightMode = !s.editorLightMode;
      // Keep Settings > Editor > Light Mode in sync across restarts.
      useSettingsStore.getState().updateSettings({ editorLightMode });
      return { editorLightMode };
    }),
  togglePreview: () =>
    set((s) => ({ previewMode: !s.previewMode })),
  toggleSettings: () =>
    set((s) => ({ settingsOpen: !s.settingsOpen })),
}));

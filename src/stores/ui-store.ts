import { create } from 'zustand';

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

  setSidebarWidth: (w: number) => void;
  setEditorWidth: (w: number) => void;
  toggleChat: () => void;
  setChatWidth: (w: number) => void;
  toggleGraphFullscreen: () => void;
  toggleGraphCollapsed: () => void;
  toggleSidebar: () => void;
  toggleEditorCollapsed: () => void;
  setEditorCollapsed: (v: boolean) => void;
  toggleEditorTheme: () => void;
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

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setEditorWidth: (w) => set({ editorWidth: w }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
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
  toggleEditorTheme: () =>
    set((s) => ({ editorLightMode: !s.editorLightMode })),
}));

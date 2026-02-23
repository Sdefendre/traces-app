import { create } from 'zustand';

interface UIState {
  sidebarWidth: number;
  editorWidth: number;
  chatOpen: boolean;
  chatWidth: number;

  setSidebarWidth: (w: number) => void;
  setEditorWidth: (w: number) => void;
  toggleChat: () => void;
  setChatWidth: (w: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 240,
  editorWidth: 500,
  chatOpen: false,
  chatWidth: 360,

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setEditorWidth: (w) => set({ editorWidth: w }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatWidth: (w) => set({ chatWidth: w }),
}));

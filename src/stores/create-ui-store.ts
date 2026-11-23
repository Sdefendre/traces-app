import { create } from 'zustand';

export interface UIState {
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
  /** Lives here so Cmd+N / GraphEmptyState work even when FileTree is unmounted. */
  creatingNote: boolean;
  /** Consumed by FileTree (on mount or while mounted) so Cmd+F / search-notes work when collapsed. */
  pendingSearchFocus: boolean;

  setSidebarWidth: (w: number) => void;
  setSidebarSearch: (q: string) => void;
  setCreatingNote: (v: boolean) => void;
  requestNewNote: () => void;
  requestFocusSearch: (query?: string) => void;
  clearFocusSearch: () => void;
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

export function createUIStore(onEditorThemeChange?: (editorLightMode: boolean) => void) {
  return create<UIState>((set) => ({
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
    creatingNote: false,
    pendingSearchFocus: false,

    setSidebarWidth: (w) => set({ sidebarWidth: w }),
    setSidebarSearch: (q) => set({ sidebarSearch: q }),
    setCreatingNote: (v) => set({ creatingNote: v }),
    requestNewNote: () => set({ sidebarCollapsed: false, creatingNote: true }),
    requestFocusSearch: (query) =>
      set((s) => ({
        sidebarCollapsed: false,
        sidebarSearch: query !== undefined ? query : s.sidebarSearch,
        pendingSearchFocus: true,
      })),
    clearFocusSearch: () => set({ pendingSearchFocus: false }),
    setEditorWidth: (w) => set({ editorWidth: w }),
    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
    setChatOpen: (v) => set({ chatOpen: v }),
    setChatWidth: (w) => set({ chatWidth: w }),
    toggleGraphFullscreen: () =>
      set((s) => ({ graphFullscreen: !s.graphFullscreen })),
    toggleGraphCollapsed: () =>
      set((s) => ({ graphCollapsed: !s.graphCollapsed })),
    toggleSidebar: () =>
      set((s) => ({
        sidebarCollapsed: !s.sidebarCollapsed,
        ...(s.sidebarCollapsed ? {} : { creatingNote: false }),
      })),
    toggleEditorCollapsed: () =>
      set((s) => ({ editorCollapsed: !s.editorCollapsed })),
    setEditorCollapsed: (v) => set({ editorCollapsed: v }),
    setEditorLightMode: (v) => set({ editorLightMode: v }),
    toggleEditorTheme: () =>
      set((s) => {
        const editorLightMode = !s.editorLightMode;
        onEditorThemeChange?.(editorLightMode);
        return { editorLightMode };
      }),
    togglePreview: () =>
      set((s) => ({ previewMode: !s.previewMode })),
    toggleSettings: () =>
      set((s) => ({ settingsOpen: !s.settingsOpen })),
  }));
}

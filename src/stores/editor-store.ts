import { electronAPI } from '../lib/electron-api';
import { createEditorStore } from './create-editor-store';

export { createEditorStore, pathToId, type EditorStoreDeps } from './create-editor-store';

export const useEditorStore = createEditorStore({
  readFile: (path) => electronAPI.readFile(path),
  writeFile: (path, content) => electronAPI.writeFile(path, content),
});

/** Close tab without surfacing unhandled rejections to callers. */
export function safeCloseTab(id: string) {
  void useEditorStore.getState().closeTab(id).catch((err) => {
    console.error('Failed to close tab:', id, err);
  });
}
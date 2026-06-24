import { electronAPI } from '../lib/electron-api';
import { createEditorStore } from './create-editor-store';

export {
  createEditorStore,
  pathToId,
  type EditorStoreDeps,
} from './create-editor-store';
export type { CloseTabOptions } from '../types';

export const useEditorStore = createEditorStore({
  readFile: (path) => electronAPI.readFile(path),
  writeFile: (path, content) => electronAPI.writeFile(path, content),
});
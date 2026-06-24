import { electronAPI } from '../lib/electron-api';
import { createEditorStoreWithDeps } from './editor-store-factory';

export {
  createEditorStore,
  createEditorStoreWithDeps,
  pathToId,
  type EditorStoreDeps,
} from './editor-store-factory';
export type { CloseTabOptions } from '../types';

export const useEditorStore = createEditorStoreWithDeps({
  readFile: (path) => electronAPI.readFile(path),
  writeFile: (path, content) => electronAPI.writeFile(path, content),
});
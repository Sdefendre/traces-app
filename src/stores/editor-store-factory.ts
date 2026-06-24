import { createEditorStore, type EditorStoreDeps } from './create-editor-store';

/** Factory exported for app + verification — same module editor-store.ts wraps. */
export function createEditorStoreWithDeps(deps: EditorStoreDeps) {
  return createEditorStore(deps);
}

export { createEditorStore, pathToId, type EditorStoreDeps } from './create-editor-store';
export type { CloseTabOptions } from '../types';
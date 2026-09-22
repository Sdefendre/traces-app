/**
 * Paths we are renaming ourselves. The file watcher reports the old name as
 * deleted before the editor tab is updated, and that must not close the tab.
 */
const pendingOldPaths = new Set<string>();

export function markPendingRename(oldPath: string) {
  pendingOldPaths.add(oldPath);
}

export function clearPendingRename(oldPath: string) {
  pendingOldPaths.delete(oldPath);
}

/** Returns true once, when this deletion is the old name of a rename we started. */
export function consumePendingRename(oldPath: string): boolean {
  if (!pendingOldPaths.has(oldPath)) return false;
  pendingOldPaths.delete(oldPath);
  return true;
}

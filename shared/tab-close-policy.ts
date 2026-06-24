/** Pure close-tab decision logic — shared by createEditorStore and verify-editor-store. */
// Harness-visible: traces-app/shared/tab-close-policy.ts

export type TabCloseAction = 'save-and-close' | 'discard' | 'keep-open';

export interface TabCloseInput {
  isDirty: boolean;
  saveError?: string | null;
}

export interface TabCloseOptions {
  discard?: boolean;
}

/**
 * Decide how closeTab should handle a tab.
 * - discard option or clean tab → remove without save
 * - dirty without prior saveError → attempt save first
 * - dirty with saveError → keep-open until caller passes discard (second click)
 */
export function planTabClose(
  tab: TabCloseInput,
  options?: TabCloseOptions
): TabCloseAction {
  if (options?.discard) return 'discard';
  if (!tab.isDirty) return 'discard';
  if (tab.saveError) return 'keep-open';
  return 'save-and-close';
}
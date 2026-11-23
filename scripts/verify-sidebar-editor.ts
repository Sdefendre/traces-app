/**
 * Verifies:
 * 1. Collapsed sidebar actions (Cmd+N, Cmd+F, search-notes) expand the sidebar
 *    and record the pending intent in UI store so FileTree acts on mount.
 * 2. MarkdownEditor re-applies spellCheck and font size whenever tabId changes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createUIStore } from '../src/stores/create-ui-store';

const store = createUIStore();

// Collapse Files sidebar
store.getState().toggleSidebar();
assert.equal(store.getState().sidebarCollapsed, true);
assert.equal(store.getState().pendingSearchFocus, false);
assert.equal(store.getState().creatingNote, false);

// Cmd+F while collapsed expands sidebar and flags pendingSearchFocus
store.getState().requestFocusSearch();
assert.equal(store.getState().sidebarCollapsed, false);
assert.equal(store.getState().pendingSearchFocus, true);
store.getState().clearFocusSearch();
assert.equal(store.getState().pendingSearchFocus, false);

// Re-collapsing and expanding normally must not trigger search focus
store.getState().toggleSidebar();
store.getState().toggleSidebar();
assert.equal(store.getState().sidebarCollapsed, false);
assert.equal(store.getState().pendingSearchFocus, false);

// search-notes while collapsed expands sidebar, sets query, and requests focus
store.getState().toggleSidebar();
store.getState().requestFocusSearch('Verify Index');
assert.equal(store.getState().sidebarCollapsed, false);
assert.equal(store.getState().sidebarSearch, 'Verify Index');
assert.equal(store.getState().pendingSearchFocus, true);
store.getState().clearFocusSearch();

// Cmd+N while collapsed expands sidebar and opens create input
store.getState().toggleSidebar();
store.getState().requestNewNote();
assert.equal(store.getState().sidebarCollapsed, false);
assert.equal(store.getState().creatingNote, true);

// Collapsing sidebar clears creatingNote so re-expanding starts clean
store.getState().toggleSidebar();
assert.equal(store.getState().sidebarCollapsed, true);
assert.equal(store.getState().creatingNote, false);

// Regression guard: MarkdownEditor spellCheck effect depends on tabId
const editorPath = path.resolve(__dirname, '../../../src/components/editor/MarkdownEditor.tsx');
const editorSource = readFileSync(editorPath, 'utf8');
assert.match(
  editorSource,
  /view\.contentDOM\.spellcheck\s*=\s*appSettings\.spellCheck;[\s\S]*?\[tabId,\s*appSettings\.editorFontSize,\s*appSettings\.spellCheck\]/,
  'MarkdownEditor must re-apply spellCheck when tabId changes',
);

console.log('sidebar-editor verification passed');

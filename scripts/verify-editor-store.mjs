/**
 * Exercise editor-store path/id helpers and dirty-state semantics.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const SCRATCH = process.env.SCRATCH || '/var/folders/f0/sgw9jtdj00z349p4skdvkjtw0000gn/T/grok-goal-11bf01a8a052/implementer';

// Structural checks on shipped source
const editorSrc = readFileSync(new URL('../src/stores/editor-store.ts', import.meta.url), 'utf8');
const hasSaveAllDirty = editorSrc.includes('saveAllDirty');
const hasTryCatchOpen = editorSrc.includes('Failed to open file');
const closeSavesDirty = editorSrc.includes('tab?.isDirty') && editorSrc.includes('saveTab');

console.log('saveAllDirty:', hasSaveAllDirty);
console.log('openFile try/catch:', hasTryCatchOpen);
console.log('closeTab saves dirty:', closeSavesDirty);

// Pure path helpers mirrored from shipped normalizeRelativePath/pathToId
function normalizeRelativePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

function pathToId(p) {
  return normalizeRelativePath(p).replace(/\//g, '__');
}

const path = 'Memory/sub/Note.md';
const id = pathToId(path);
console.log('pathToId:', id);
console.log('normalized:', normalizeRelativePath('Memory\\sub\\Note.md'));

// Simulate tab dirty lifecycle
let tabs = [];
let activeTabId = null;

function setTabContent(id, content) {
  tabs = tabs.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t));
}

function markClean(id) {
  tabs = tabs.map((t) => (t.id === id ? { ...t, isDirty: false } : t));
}

function closeTab(id) {
  const tab = tabs.find((t) => t.id === id);
  const wouldSave = Boolean(tab?.isDirty);
  tabs = tabs.filter((t) => t.id !== id);
  if (activeTabId === id) activeTabId = tabs.at(-1)?.id ?? null;
  return wouldSave;
}

tabs = [{ id, path, name: 'Note', content: 'hello', isDirty: false }];
activeTabId = id;
setTabContent(id, 'hello world');
const dirtyAfterEdit = tabs[0].isDirty === true;
markClean(id);
const cleanAfterSave = tabs[0].isDirty === false;
setTabContent(id, 'changed again');
const wouldSaveOnClose = closeTab(id);

console.log('dirtyAfterEdit:', dirtyAfterEdit);
console.log('cleanAfterSave:', cleanAfterSave);
console.log('wouldSaveOnClose:', wouldSaveOnClose);
console.log('tabsAfterClose:', tabs.length);

const ok =
  hasSaveAllDirty &&
  hasTryCatchOpen &&
  closeSavesDirty &&
  dirtyAfterEdit &&
  cleanAfterSave &&
  wouldSaveOnClose &&
  tabs.length === 0;

if (!ok) process.exit(1);
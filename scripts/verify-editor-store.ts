import { createEditorStore, pathToId } from '../src/stores/create-editor-store';

const files: Record<string, string> = {};
const writes: string[] = [];

const store = createEditorStore({
  readFile: async (path) => files[path] ?? '',
  writeFile: async (path, content) => {
    files[path] = content;
    writes.push(`${path}:${content}`);
  },
});

async function runOnce(label: string) {
  const path = 'Memory/test.md';
  files[path] = '# Test\n\ninitial';
  writes.length = 0;

  await store.getState().openFile(path);
  const opened = store.getState().tabs.length === 1;
  const id = pathToId(path);

  store.getState().setTabContent(id, '# Test\n\nupdated content');
  const dirtyAfterEdit = store.getState().tabs[0]?.isDirty === true;

  await store.getState().saveTab(id);
  const cleanAfterSave = store.getState().tabs[0]?.isDirty === false;
  const savedOnce = files[path] === '# Test\n\nupdated content';

  store.getState().setTabContent(id, '# Test\n\nclose me');
  const dirtyBeforeClose = store.getState().tabs[0]?.isDirty === true;

  await store.getState().closeTab(id);
  const tabsAfterClose = store.getState().tabs.length;
  const writtenOnClose = files[path] === '# Test\n\nclose me';

  console.log(`[${label}] opened:`, opened);
  console.log(`[${label}] dirtyAfterEdit:`, dirtyAfterEdit);
  console.log(`[${label}] cleanAfterSave:`, cleanAfterSave);
  console.log(`[${label}] savedOnce:`, savedOnce);
  console.log(`[${label}] dirtyBeforeClose:`, dirtyBeforeClose);
  console.log(`[${label}] writtenOnClose:`, writtenOnClose);
  console.log(`[${label}] tabsAfterClose:`, tabsAfterClose);

  const ok =
    opened &&
    dirtyAfterEdit &&
    cleanAfterSave &&
    savedOnce &&
    dirtyBeforeClose &&
    writtenOnClose &&
    tabsAfterClose === 0;

  if (!ok) process.exit(1);
}

async function main() {
  await runOnce('run1');
  await runOnce('run2');
  console.log('editor-store verification passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
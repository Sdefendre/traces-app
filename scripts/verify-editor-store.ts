// Exercises real createEditorStore (open/save/close dirty tabs + save-failure recovery).
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

async function runOnce(label: string, includeSaveFailureRecovery: boolean) {
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

  const closedOk = await store.getState().closeTab(id);
  const tabsAfterClose = store.getState().tabs.length;
  const writtenOnClose = files[path] === '# Test\n\nclose me';

  console.log(`[${label}] opened:`, opened);
  console.log(`[${label}] dirtyAfterEdit:`, dirtyAfterEdit);
  console.log(`[${label}] cleanAfterSave:`, cleanAfterSave);
  console.log(`[${label}] savedOnce:`, savedOnce);
  console.log(`[${label}] dirtyBeforeClose:`, dirtyBeforeClose);
  console.log(`[${label}] closedOk:`, closedOk);
  console.log(`[${label}] writtenOnClose:`, writtenOnClose);
  console.log(`[${label}] tabsAfterClose:`, tabsAfterClose);

  let ok =
    opened &&
    dirtyAfterEdit &&
    cleanAfterSave &&
    savedOnce &&
    dirtyBeforeClose &&
    closedOk &&
    writtenOnClose &&
    tabsAfterClose === 0;

  if (includeSaveFailureRecovery) {
    const failPath = 'Memory/fail.md';
    files[failPath] = 'initial';
    const failStore = createEditorStore({
      readFile: async (p) => files[p] ?? '',
      writeFile: async () => {
        throw new Error('disk full');
      },
    });

    await failStore.getState().openFile(failPath);
    const failId = pathToId(failPath);
    failStore.getState().setTabContent(failId, 'dirty but cannot save');

    const keptOpen = (await failStore.getState().closeTab(failId)) === false;
    const tabKept = failStore.getState().tabs.length === 1;
    const contentPreserved =
      failStore.getState().tabs[0]?.content === 'dirty but cannot save';
    const hasSaveError = Boolean(failStore.getState().tabs[0]?.saveError);

    const discarded = await failStore.getState().closeTab(failId, { discard: true });
    const tabsAfterDiscard = failStore.getState().tabs.length;

    console.log(`[${label}] keptOpenOnFail:`, keptOpen);
    console.log(`[${label}] tabKept:`, tabKept);
    console.log(`[${label}] contentPreserved:`, contentPreserved);
    console.log(`[${label}] hasSaveError:`, hasSaveError);
    console.log(`[${label}] discarded:`, discarded);
    console.log(`[${label}] tabsAfterDiscard:`, tabsAfterDiscard);

    ok =
      ok &&
      keptOpen &&
      tabKept &&
      contentPreserved &&
      hasSaveError &&
      discarded &&
      tabsAfterDiscard === 0;
  }

  if (!ok) process.exit(1);
}

async function main() {
  await runOnce('run1', false);
  await runOnce('run2', true);
  console.log('editor-store verification passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
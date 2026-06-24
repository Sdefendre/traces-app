/**
 * Plan step 4: fresh node invocation via createEditorStoreWithDeps (editor-store wrapper).
 */
import { planTabClose } from '../shared/tab-close-policy';
import { createEditorStoreWithDeps, pathToId } from '../src/stores/editor-store-factory';

const files: Record<string, string> = {};

async function exerciseAllEditorPaths() {
  const useEditorStore = createEditorStoreWithDeps({
    readFile: async (path) => files[path] ?? '',
    writeFile: async (path, content) => {
      files[path] = content;
    },
  });

  const path = 'Memory/test.md';
  files[path] = '# Test\n\ninitial';

  await useEditorStore.getState().openFile(path);
  const id = pathToId(path);
  const opened = useEditorStore.getState().tabs.length === 1;

  useEditorStore.getState().setTabContent(id, '# Test\n\nupdated');
  const dirtyAfterEdit = useEditorStore.getState().tabs[0]?.isDirty === true;

  await useEditorStore.getState().saveTab(id);
  const cleanAfterSave = useEditorStore.getState().tabs[0]?.isDirty === false;

  useEditorStore.getState().setTabContent(id, '# Test\n\nclose me');
  const closedOk = await useEditorStore.getState().closeTab(id);
  const tabsAfterClose = useEditorStore.getState().tabs.length;
  const writtenOnClose = files[path] === '# Test\n\nclose me';

  files['Memory/rename.md'] = 'version one';
  await useEditorStore.getState().openFile('Memory/rename.md');
  useEditorStore.getState().renameTab('Memory/rename.md', 'Memory/renamed.md');
  const newId = pathToId('Memory/renamed.md');
  const renamedOk =
    useEditorStore.getState().tabs.find((t) => t.id === newId)?.path ===
    'Memory/renamed.md';

  files['Memory/renamed.md'] = 'version two from disk';
  await useEditorStore.getState().reloadTab('Memory/renamed.md');
  const reloadOk =
    useEditorStore.getState().tabs.find((t) => t.id === newId)?.content ===
    'version two from disk';

  const failStore = createEditorStoreWithDeps({
    readFile: async (p) => files[p] ?? '',
    writeFile: async () => {
      throw new Error('disk full');
    },
  });

  files['Memory/fail.md'] = 'initial';
  await failStore.getState().openFile('Memory/fail.md');
  const failId = pathToId('Memory/fail.md');
  failStore.getState().setTabContent(failId, 'dirty but cannot save');

  const policyBeforeFail = planTabClose({ isDirty: true, saveError: null });
  const keptOpen = (await failStore.getState().closeTab(failId)) === false;
  const tabKept = failStore.getState().tabs.length === 1;
  const contentPreserved =
    failStore.getState().tabs[0]?.content === 'dirty but cannot save';
  const hasSaveError = Boolean(failStore.getState().tabs[0]?.saveError);
  const policyWithError = planTabClose({
    isDirty: true,
    saveError: failStore.getState().tabs[0]?.saveError,
  });
  const discarded = await failStore.getState().closeTab(failId, { discard: true });
  const tabsAfterDiscard = failStore.getState().tabs.length;

  console.log('wrapper: editor-store-factory (exported by editor-store.ts)');
  console.log('opened:', opened);
  console.log('dirtyAfterEdit:', dirtyAfterEdit);
  console.log('cleanAfterSave:', cleanAfterSave);
  console.log('closedOk:', closedOk);
  console.log('writtenOnClose:', writtenOnClose);
  console.log('tabsAfterClose:', tabsAfterClose);
  console.log('renamedOk:', renamedOk);
  console.log('reloadOk:', reloadOk);
  console.log('policyBeforeFail:', policyBeforeFail);
  console.log('keptOpenOnFail:', keptOpen);
  console.log('tabKept:', tabKept);
  console.log('contentPreserved:', contentPreserved);
  console.log('hasSaveError:', hasSaveError);
  console.log('policyWithError:', policyWithError);
  console.log('discarded:', discarded);
  console.log('tabsAfterDiscard:', tabsAfterDiscard);

  const ok =
    opened &&
    dirtyAfterEdit &&
    cleanAfterSave &&
    closedOk &&
    writtenOnClose &&
    tabsAfterClose === 0 &&
    renamedOk &&
    reloadOk &&
    policyBeforeFail === 'save-and-close' &&
    keptOpen &&
    tabKept &&
    contentPreserved &&
    hasSaveError &&
    policyWithError === 'keep-open' &&
    discarded &&
    tabsAfterDiscard === 0;

  if (!ok) process.exit(1);
}

async function main() {
  await exerciseAllEditorPaths();
  console.log('editor-store verification passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
import { useSettingsStore } from './settings-store';
import { createUIStore } from './create-ui-store';

export { createUIStore, type UIState } from './create-ui-store';

export const useUIStore = createUIStore((editorLightMode) => {
  // Keep Settings > Editor > Light Mode in sync across restarts.
  useSettingsStore.getState().updateSettings({ editorLightMode });
});

import { create } from 'zustand';
import { electronAPI } from '@/lib/electron-api';

export type Provider = 'ollama' | 'openai' | 'anthropic' | 'xai' | 'google';

export interface AppSettings {
  // AI
  apiKeys: { openai: string; anthropic: string; xai: string; google: string };
  enabledModels: {
    openai: string[];
    anthropic: string[];
    xai: string[];
    google: string[];
  };
  defaultProvider: Provider;
  defaultModel: string;
  ollamaEndpoint: string;
  customSystemPrompt: string;

  // Editor
  editorFontSize: number;
  spellCheck: boolean;

  // General
  startupBehavior: 'graph' | 'lastNote' | 'empty';
  clearChatOnClose: boolean;
}

const ALL_OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini'];
const ALL_ANTHROPIC_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
];
const ALL_XAI_MODELS = ['grok-3-fast', 'grok-4-1-fast'];
const ALL_GOOGLE_MODELS = ['gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro'];

export const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: { openai: '', anthropic: '', xai: '', google: '' },
  enabledModels: {
    openai: [...ALL_OPENAI_MODELS],
    anthropic: [...ALL_ANTHROPIC_MODELS],
    xai: [...ALL_XAI_MODELS],
    google: [...ALL_GOOGLE_MODELS],
  },
  defaultProvider: 'anthropic',
  defaultModel: 'claude-opus-4-6',
  ollamaEndpoint: 'http://localhost:11434',
  customSystemPrompt: '',

  editorFontSize: 14,
  spellCheck: false,

  startupBehavior: 'graph',
  clearChatOnClose: false,
};

export { ALL_OPENAI_MODELS, ALL_ANTHROPIC_MODELS, ALL_XAI_MODELS, ALL_GOOGLE_MODELS };

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setApiKey: (provider: keyof AppSettings['apiKeys'], key: string) => void;
  toggleModel: (provider: keyof AppSettings['enabledModels'], model: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  loadSettings: async () => {
    const saved = await electronAPI.loadSettings();
    if (saved && Object.keys(saved).length > 0) {
      const merged = { ...DEFAULT_SETTINGS, ...saved } as AppSettings;
      // Deep merge nested objects
      if (saved.apiKeys) {
        merged.apiKeys = { ...DEFAULT_SETTINGS.apiKeys, ...(saved as Record<string, unknown>).apiKeys as Record<string, string> };
      }
      if (saved.enabledModels) {
        merged.enabledModels = { ...DEFAULT_SETTINGS.enabledModels, ...(saved as Record<string, unknown>).enabledModels as Record<string, string[]> };
      }
      set({ settings: merged, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  updateSettings: (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
    electronAPI.saveSettings(updated as unknown as Record<string, unknown>);
  },

  setApiKey: (provider, key) => {
    const current = get().settings;
    const updated = {
      ...current,
      apiKeys: { ...current.apiKeys, [provider]: key },
    };
    set({ settings: updated });
    electronAPI.saveSettings(updated as unknown as Record<string, unknown>);
  },

  toggleModel: (provider, model) => {
    const current = get().settings;
    const models = current.enabledModels[provider];
    const updated = models.includes(model)
      ? models.filter((m) => m !== model)
      : [...models, model];
    const newSettings = {
      ...current,
      enabledModels: { ...current.enabledModels, [provider]: updated },
    };
    set({ settings: newSettings });
    electronAPI.saveSettings(newSettings as unknown as Record<string, unknown>);
  },
}));

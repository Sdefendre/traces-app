'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import {
  useSettingsStore,
  ALL_OPENAI_MODELS,
  ALL_ANTHROPIC_MODELS,
  ALL_XAI_MODELS,
  ALL_GOOGLE_MODELS,
  ALL_VOICE_OPTIONS,
  ALL_GROK_VOICE_OPTIONS,
} from '@/stores/settings-store';
import type { VoiceOption, GrokVoiceOption, VoiceProvider } from '@/stores/settings-store';
import type { Provider } from '@/stores/settings-store';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X, Eye, EyeOff, Bot, Type, GitBranch, Cog } from 'lucide-react';
import { electronAPI } from '@/lib/electron-api';

// ---------------------------------------------------------------------------
// Shared row components — bigger text, more breathing room
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="text-sm tabular-nums text-zinc-100 font-medium">
          {value.toFixed(step < 0.1 ? 2 : 1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-[#6366f1]"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500 mb-4 mt-1">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Password input with show/hide
// ---------------------------------------------------------------------------

function ApiKeyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label} API key`}
          className="flex-1 text-sm rounded-lg px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#6366f1]/60 focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
        />
        <button
          onClick={() => setVisible(!visible)}
          className="flex items-center justify-center size-9 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model labels
// ---------------------------------------------------------------------------

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
  'gpt-5.2': 'GPT-5.2',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'grok-3-fast': 'Grok 3 Fast',
  'grok-4-1-fast': 'Grok 4.1 Fast',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
};

// ---------------------------------------------------------------------------
// Section navigation
// ---------------------------------------------------------------------------

type Section = 'ai' | 'editor' | 'graph' | 'general';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ai', label: 'AI & Models', icon: Bot },
  { id: 'editor', label: 'Editor', icon: Type },
  { id: 'graph', label: 'Graph', icon: GitBranch },
  { id: 'general', label: 'General', icon: Cog },
];

// ---------------------------------------------------------------------------
// Model checklist for a provider
// ---------------------------------------------------------------------------

function ModelChecklist({
  allModels,
  enabledModels,
  onToggle,
}: {
  allModels: string[];
  enabledModels: string[];
  onToggle: (model: string) => void;
}) {
  return (
    <div className="space-y-2.5 pl-1">
      {allModels.map((m) => (
        <label key={m} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={enabledModels.includes(m)}
            onChange={() => onToggle(m)}
            className="rounded border-white/20 bg-white/[0.04] accent-[#6366f1] size-4"
          />
          <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
            {MODEL_LABELS[m] || m}
          </span>
          <span className="text-xs text-zinc-600 font-mono ml-auto">{m}</span>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styled input wrapper
// ---------------------------------------------------------------------------
const inputClass =
  'w-full text-sm rounded-lg px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#6366f1]/60 focus:ring-1 focus:ring-[#6366f1]/20 transition-all';

const selectClass =
  'w-full text-sm rounded-lg px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-zinc-100 outline-none focus:border-[#6366f1]/60 cursor-pointer appearance-none';

// ---------------------------------------------------------------------------
// SettingsPanel (full-screen overlay)
// ---------------------------------------------------------------------------

export function SettingsPanel() {
  const { settings: graphSettings, updateSettings: updateGraphSettings } = useGraphStore();
  const { toggleSettings, editorLightMode, toggleEditorTheme } = useUIStore();
  const { settings, loadSettings, updateSettings, setApiKey, toggleModel } = useSettingsStore();
  const [activeSection, setActiveSection] = useState<Section>('ai');
  const [vaultPath, setVaultPath] = useState<string>('');
  const [apiKeysSavedAt, setApiKeysSavedAt] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Clear "Saved" indicator after 2 seconds
  useEffect(() => {
    if (apiKeysSavedAt == null) return;
    const t = setTimeout(() => setApiKeysSavedAt(null), 2000);
    return () => clearTimeout(t);
  }, [apiKeysSavedAt]);

  const handleSetApiKey = (provider: keyof typeof settings.apiKeys, key: string) => {
    setApiKey(provider, key);
    setApiKeysSavedAt(Date.now());
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSettings]);

  useEffect(() => {
    setVaultPath('~/Desktop/Traces Notes');
  }, []);

  const handleChangeVault = async () => {
    const selected = await electronAPI.openFolder();
    if (selected) {
      setVaultPath(selected);
    }
  };

  const providerOptions: { value: Provider; label: string }[] = [
    { value: 'ollama', label: 'Ollama (Local)' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'google', label: 'Google' },
    { value: 'xai', label: 'xAI' },
  ];

  const defaultProviderModels =
    settings.defaultProvider === 'ollama'
      ? []
      : settings.enabledModels[settings.defaultProvider] || [];

  return (
    <div
      className="fixed inset-0 z-[200] flex"
      style={{ backgroundColor: '#08080c' }}
    >
      {/* Titlebar drag area */}
      <div className="fixed top-0 left-0 right-0 h-8 titlebar-drag z-[210]" />

      {/* ---- Sidebar nav ---- */}
      <div
        className="flex flex-col w-[260px] flex-shrink-0 pb-6"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingLeft: 'var(--titlebar-safe-left)' }}
      >
        {/* Title — well below macOS traffic lights */}
        <div className="pr-4 mb-8" style={{ marginTop: 52 }}>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Settings</h1>
        </div>

        <nav className="flex-1 pr-3 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-white/[0.1] text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---- Content area ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div
          className="flex items-center justify-between pl-[var(--titlebar-safe-left)] pr-6 pb-5"
          style={{ paddingTop: 52, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h2>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSettings}
            title="Close settings (Esc)"
            className="titlebar-no-drag text-zinc-500 hover:text-zinc-100 size-8"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable content — centered with max-w */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl px-12 py-10 space-y-10">
            {/* ============ AI & Models ============ */}
            {activeSection === 'ai' && (
              <>
                {/* API Keys */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <SectionHeader>API Keys</SectionHeader>
                    {apiKeysSavedAt != null && (
                      <span className="text-xs text-emerald-400 font-medium">Saved</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <ApiKeyInput
                      label="Anthropic"
                      value={settings.apiKeys.anthropic}
                      onChange={(v) => handleSetApiKey('anthropic', v)}
                    />
                    <ApiKeyInput
                      label="OpenAI"
                      value={settings.apiKeys.openai}
                      onChange={(v) => handleSetApiKey('openai', v)}
                    />
                    <ApiKeyInput
                      label="Google"
                      value={settings.apiKeys.google}
                      onChange={(v) => handleSetApiKey('google', v)}
                    />
                    <ApiKeyInput
                      label="xAI"
                      value={settings.apiKeys.xai}
                      onChange={(v) => handleSetApiKey('xai', v)}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.04]" />

                {/* Ollama endpoint */}
                <div>
                  <SectionHeader>Ollama</SectionHeader>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-zinc-400">Endpoint URL</span>
                    <input
                      type="text"
                      value={settings.ollamaEndpoint}
                      onChange={(e) => updateSettings({ ollamaEndpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.04]" />

                {/* Enabled models per provider */}
                <div>
                  <SectionHeader>Enabled Models</SectionHeader>
                  <p className="text-sm text-zinc-500 mb-5 -mt-2">
                    Toggle which models appear in the chat model picker.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">Anthropic</h4>
                      <ModelChecklist
                        allModels={ALL_ANTHROPIC_MODELS}
                        enabledModels={settings.enabledModels.anthropic}
                        onToggle={(m) => toggleModel('anthropic', m)}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">OpenAI</h4>
                      <ModelChecklist
                        allModels={ALL_OPENAI_MODELS}
                        enabledModels={settings.enabledModels.openai}
                        onToggle={(m) => toggleModel('openai', m)}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">Google</h4>
                      <ModelChecklist
                        allModels={ALL_GOOGLE_MODELS}
                        enabledModels={settings.enabledModels.google}
                        onToggle={(m) => toggleModel('google', m)}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">xAI</h4>
                      <ModelChecklist
                        allModels={ALL_XAI_MODELS}
                        enabledModels={settings.enabledModels.xai}
                        onToggle={(m) => toggleModel('xai', m)}
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.04]" />

                {/* Default provider & model */}
                <div>
                  <SectionHeader>Defaults</SectionHeader>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-zinc-400">Default Provider</span>
                      <select
                        value={settings.defaultProvider}
                        onChange={(e) =>
                          updateSettings({ defaultProvider: e.target.value as Provider })
                        }
                        className={selectClass}
                      >
                        {providerOptions.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {settings.defaultProvider !== 'ollama' && defaultProviderModels.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm text-zinc-400">Default Model</span>
                        <select
                          value={settings.defaultModel}
                          onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                          className={selectClass}
                        >
                          {defaultProviderModels.map((m) => (
                            <option key={m} value={m}>
                              {MODEL_LABELS[m] || m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.04]" />

                {/* Custom system prompt */}
                <div>
                  <SectionHeader>System Prompt</SectionHeader>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-zinc-500">
                      Custom instructions prepended to every chat message
                    </span>
                    <textarea
                      value={settings.customSystemPrompt}
                      onChange={(e) => updateSettings({ customSystemPrompt: e.target.value })}
                      placeholder="e.g. Always respond in French..."
                      rows={4}
                      className="w-full text-sm rounded-lg px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#6366f1]/60 focus:ring-1 focus:ring-[#6366f1]/20 transition-all resize-y leading-relaxed"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.04]" />

                {/* Voice settings */}
                <div>
                  <SectionHeader>Voice</SectionHeader>
                  <p className="text-sm text-zinc-500 mb-5 -mt-2">
                    {settings.voice.voiceProvider === 'grok'
                      ? 'Requires an xAI API key. Uses the Grok Realtime API.'
                      : 'Requires an OpenAI API key. Uses the Realtime API.'}
                  </p>
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-zinc-400">Provider</span>
                      <select
                        value={settings.voice.voiceProvider}
                        onChange={(e) =>
                          updateSettings({
                            voice: { ...settings.voice, voiceProvider: e.target.value as VoiceProvider },
                          })
                        }
                        className={selectClass}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="grok">Grok (xAI)</option>
                      </select>
                    </div>

                    {settings.voice.voiceProvider === 'openai' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm text-zinc-400">Voice</span>
                        <select
                          value={settings.voice.voice}
                          onChange={(e) =>
                            updateSettings({
                              voice: { ...settings.voice, voice: e.target.value as VoiceOption },
                            })
                          }
                          className={selectClass}
                        >
                          {ALL_VOICE_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {v.charAt(0).toUpperCase() + v.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm text-zinc-400">Voice</span>
                        <select
                          value={settings.voice.grokVoice}
                          onChange={(e) =>
                            updateSettings({
                              voice: { ...settings.voice, grokVoice: e.target.value as GrokVoiceOption },
                            })
                          }
                          className={selectClass}
                        >
                          {ALL_GROK_VOICE_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <ToggleRow
                      label="Auto-play audio responses"
                      checked={settings.voice.autoPlayResponses}
                      onChange={(v) =>
                        updateSettings({
                          voice: { ...settings.voice, autoPlayResponses: v },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* ============ Editor ============ */}
            {activeSection === 'editor' && (
              <>
                <div>
                  <SectionHeader>Appearance</SectionHeader>
                  <div className="space-y-5">
                    <SliderRow
                      label="Font Size"
                      value={settings.editorFontSize}
                      min={12}
                      max={24}
                      step={1}
                      onChange={(v) => updateSettings({ editorFontSize: v })}
                    />
                    <ToggleRow
                      label="Light Mode"
                      checked={editorLightMode}
                      onChange={() => toggleEditorTheme()}
                    />
                  </div>
                </div>

                <div className="border-t border-white/[0.04]" />

                <div>
                  <SectionHeader>Behavior</SectionHeader>
                  <div className="space-y-5">
                    <ToggleRow
                      label="Spell Check"
                      checked={settings.spellCheck}
                      onChange={(v) => updateSettings({ spellCheck: v })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ============ Graph ============ */}
            {activeSection === 'graph' && (
              <div>
                <SectionHeader>Visualization</SectionHeader>
                <div className="space-y-5">
                  <SliderRow
                    label="Node Size"
                    value={graphSettings.nodeSize}
                    min={0.5}
                    max={4.0}
                    step={0.1}
                    onChange={(v) => updateGraphSettings({ nodeSize: v })}
                  />
                  <ToggleRow
                    label="Show Labels"
                    checked={graphSettings.showLabels}
                    onChange={(v) => updateGraphSettings({ showLabels: v })}
                  />
                  <SliderRow
                    label="Line Thickness"
                    value={graphSettings.lineThickness}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    onChange={(v) => updateGraphSettings({ lineThickness: v })}
                  />
                  <ToggleRow
                    label="Auto Rotate"
                    checked={graphSettings.autoRotate}
                    onChange={(v) => updateGraphSettings({ autoRotate: v })}
                  />
                  <SliderRow
                    label="Rotate Speed"
                    value={graphSettings.rotateSpeed}
                    min={0}
                    max={1.0}
                    step={0.05}
                    onChange={(v) => updateGraphSettings({ rotateSpeed: v })}
                  />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-zinc-300">Line Color</span>
                    <input
                      type="color"
                      value={graphSettings.lineColor || '#27272a'}
                      onInput={(e) =>
                        updateGraphSettings({ lineColor: (e.target as HTMLInputElement).value })
                      }
                      onChange={(e) => updateGraphSettings({ lineColor: e.target.value })}
                      className="w-8 h-6 border border-white/10 rounded-md cursor-pointer p-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============ General ============ */}
            {activeSection === 'general' && (
              <>
                <div>
                  <SectionHeader>Vault</SectionHeader>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-zinc-400">Vault Path</span>
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-zinc-300 font-mono bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 truncate">
                          {vaultPath}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleChangeVault}
                          className="text-sm flex-shrink-0 px-4 py-2 rounded-lg border border-white/[0.1] hover:bg-white/[0.06]"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.04]" />

                <div>
                  <SectionHeader>Startup</SectionHeader>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-zinc-400">On Launch</span>
                      <select
                        value={settings.startupBehavior}
                        onChange={(e) =>
                          updateSettings({
                            startupBehavior: e.target.value as 'graph' | 'lastNote' | 'empty',
                          })
                        }
                        className={selectClass}
                      >
                        <option value="graph">Show Graph</option>
                        <option value="lastNote">Open Last Note</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.04]" />

                <div>
                  <SectionHeader>Chat</SectionHeader>
                  <div className="space-y-5">
                    <ToggleRow
                      label="Clear chat history on close"
                      checked={settings.clearChatOnClose}
                      onChange={(v) => updateSettings({ clearChatOnClose: v })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import {
  useSettingsStore,
  ALL_VOICE_OPTIONS,
  ALL_GROK_VOICE_OPTIONS,
  type VoiceOption,
  type GrokVoiceOption,
} from '@/stores/settings-store';
import { electronAPI } from '@/lib/electron-api';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Send, ChevronLeft, ChevronRight, Eraser, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useRealtimeVoice, type TranscriptEvent, type VoiceToolCallEvent } from '@/hooks/useRealtimeVoice';
import { useGrokVoice } from '@/hooks/useGrokVoice';
import { VoiceWaveform } from './VoiceWaveform';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Provider = 'ollama' | 'openai' | 'anthropic' | 'xai' | 'google';

interface ToolCall {
  name: string;
  args: Record<string, string>;
  result: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  source?: 'voice';
}

interface OllamaModel {
  name: string;
  model: string;
}

// Friendly display names
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

function buildSystemPrompt(provider: string, model: string, customPrompt: string): string {
  const displayName = MODEL_LABELS[model] || model;
  const base = `You are TracesAI, an AI assistant embedded in a knowledge management app called Traces. You are currently running as ${displayName} (model ID: ${model}) from ${provider}. If the user asks what model you are, tell them you are ${displayName}. You can read, write, edit, search, and delete files in the user's vault. Use tools to help the user manage their notes and knowledge base. Always be helpful and proactive.`;
  return customPrompt ? `${customPrompt}\n\n${base}` : base;
}

// File-modifying tools that should trigger a refresh
const FILE_MODIFYING_TOOLS = new Set(['write_file', 'edit_file', 'delete_file']);

// ---------------------------------------------------------------------------
// Tool color mapping
// ---------------------------------------------------------------------------
const TOOL_COLORS: Record<string, string> = {
  read_file: '#3b82f6',
  write_file: '#22c55e',
  edit_file: '#f97316',
  delete_file: '#ef4444',
  search_files: '#a855f7',
  list_files: '#6b7280',
  list_voices: '#ec4899',
  change_voice: '#ec4899',
};

function getToolColor(name: string): string {
  return TOOL_COLORS[name] ?? '#6b7280';
}

// ---------------------------------------------------------------------------
// ToolCallCard
// ---------------------------------------------------------------------------
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = getToolColor(toolCall.name);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className="rounded-lg text-xs overflow-hidden"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeftWidth: 3,
          borderLeftColor: borderColor,
        }}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-left cursor-pointer"
            style={{ color: 'var(--text)' }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: borderColor }}
              />
              <span className="font-medium font-mono text-[11px]">
                {toolCall.name}
              </span>
              {toolCall.args.path && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {toolCall.args.path}
                </span>
              )}
            </span>
            <ChevronRight
              className="size-2.5 text-muted-foreground transition-transform duration-150"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className="px-2.5 pb-2 space-y-1.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {Object.keys(toolCall.args).length > 0 && (
              <div className="pt-1.5">
                <div className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold text-muted-foreground">
                  Arguments
                </div>
                <pre
                  className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded font-mono m-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text)' }}
                >
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
            )}

            {toolCall.result && (
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold text-muted-foreground">
                  Result
                </div>
                <pre
                  className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded font-mono m-0 max-h-[200px] overflow-y-auto"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text)' }}
                >
                  {toolCall.result}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------
export function ChatPanel() {
  const { toggleChat } = useUIStore();
  const { refreshFiles, vaultName, files } = useVaultStore();
  const { reloadTab } = useEditorStore();
  const { settings: appSettings, updateSettings } = useSettingsStore();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Model state — initialize from settings defaults
  const [provider, setProvider] = useState<Provider>(appSettings.defaultProvider);
  const [model, setModel] = useState(appSettings.defaultModel);

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const streamingTranscriptRef = useRef('');

  const handleTranscript = useCallback((event: TranscriptEvent) => {
    if (event.role === 'user' && event.final) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: event.content, source: 'voice' },
      ]);
      streamingTranscriptRef.current = '';
    } else if (event.role === 'assistant') {
      if (event.final) {
        // Replace the last streaming voice message with the final transcript
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.source === 'voice') {
            return [...prev.slice(0, -1), { role: 'assistant', content: event.content, source: 'voice' as const }];
          }
          return [...prev, { role: 'assistant', content: event.content, source: 'voice' as const }];
        });
        streamingTranscriptRef.current = '';
      } else {
        // Streaming delta — accumulate and update last message
        streamingTranscriptRef.current += event.content;
        const accumulated = streamingTranscriptRef.current;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.source === 'voice') {
            return [...prev.slice(0, -1), { role: 'assistant', content: accumulated, source: 'voice' as const }];
          }
          return [...prev, { role: 'assistant', content: accumulated, source: 'voice' as const }];
        });
      }
    }
  }, []);

  const handleVoiceError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setVoiceMode(false);
  }, []);

  const handleVoiceToolCall = useCallback((event: VoiceToolCallEvent) => {
    // Append tool call as an assistant message with toolCalls array
    setMessages((prev) => {
      const toolCall: ToolCall = { name: event.name, args: event.args, result: event.result };
      // If the last message is a voice assistant message, attach tool call to it
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.source === 'voice') {
        const updated = { ...last, toolCalls: [...(last.toolCalls || []), toolCall] };
        return [...prev.slice(0, -1), updated];
      }
      // Otherwise create a new assistant message with just the tool call
      return [...prev, { role: 'assistant', content: '', toolCalls: [toolCall], source: 'voice' as const }];
    });

    // Refresh files/editor for file-modifying tools
    if (FILE_MODIFYING_TOOLS.has(event.name)) {
      refreshFiles();
      if (event.args.path) {
        reloadTab(event.args.path);
      }
    }
  }, [refreshFiles, reloadTab]);

  // Voice provider — local state so user can switch without going to settings
  const [voiceProvider, setVoiceProvider] = useState<'openai' | 'grok'>(appSettings.voice.voiceProvider ?? 'openai');

  // Sync voiceProvider when settings load or user changes it in Settings
  useEffect(() => {
    setVoiceProvider(appSettings.voice.voiceProvider ?? 'openai');
  }, [appSettings.voice.voiceProvider]);

  const voiceInstructions = (() => {
    const modelName = voiceProvider === 'grok' ? 'Grok realtime' : 'gpt-realtime';
    const providerName = voiceProvider === 'grok' ? 'xAI' : 'OpenAI';
    const base = `You are TracesAI, a voice AI assistant embedded in a knowledge management app called Traces. You are running on the ${modelName} model from ${providerName}. Be conversational, helpful, and concise in your spoken responses. If the user asks what you are, tell them you are TracesAI. You have tools to manage the user's vault: list_files, read_file, write_file, edit_file, delete_file, and search_files. Use these tools when the user asks about their notes, wants to create or edit files, or search their vault.

You also have voice tools: list_voices (to show available voices) and change_voice (to switch your voice). Use list_voices when the user asks what voices you have or what options are available. Use change_voice when the user asks you to change your voice, sound different, or switch to another voice.

The user's current vault is called "${vaultName}" and contains ${files.length} note${files.length === 1 ? '' : 's'}.

The current date and time is ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}.`;
    const custom = appSettings.customSystemPrompt?.trim();
    return custom ? `${custom}\n\n${base}` : base;
  })();

  // Custom tool executor: handle voice tools in renderer (for correct provider + settings sync), delegate rest to main process
  const executeVoiceTool = useCallback(
    async (toolName: string, args: Record<string, string>): Promise<string> => {
      if (toolName === 'list_voices') {
        const voices = voiceProvider === 'grok' ? ALL_GROK_VOICE_OPTIONS : ALL_VOICE_OPTIONS;
        const current =
          voiceProvider === 'grok'
            ? appSettings.voice.grokVoice ?? 'Ara'
            : appSettings.voice.voice;
        return JSON.stringify({
          provider: voiceProvider === 'grok' ? 'Grok' : 'OpenAI',
          voices,
          current,
        });
      }
      if (toolName === 'change_voice') {
        const requested = args.voice?.trim();
        if (!requested) return 'Error: voice is required';
        const voices = voiceProvider === 'grok' ? ALL_GROK_VOICE_OPTIONS : ALL_VOICE_OPTIONS;
        if (!(voices as readonly string[]).includes(requested)) {
          return `Error: Invalid voice "${requested}". Available: ${voices.join(', ')}`;
        }
        updateSettings({
          voice: {
            ...appSettings.voice,
            ...(voiceProvider === 'grok'
              ? { grokVoice: requested as GrokVoiceOption }
              : { voice: requested as VoiceOption }),
          },
        });
        return `Voice changed to ${requested}. The new voice will apply to your next response.`;
      }
      return electronAPI.executeRealtimeTool({ toolName, args });
    },
    [
      voiceProvider,
      appSettings.voice,
      updateSettings,
    ]
  );

  // Both hooks are always called (React rules of hooks), but only the active one connects
  const openaiVoice = useRealtimeVoice({
    apiKey: appSettings.apiKeys.openai,
    voice: appSettings.voice.voice,
    instructions: voiceInstructions,
    onTranscript: handleTranscript,
    onToolCall: handleVoiceToolCall,
    onError: handleVoiceError,
    executeTool: executeVoiceTool,
  });

  const grokVoice = useGrokVoice({
    apiKey: appSettings.apiKeys.xai,
    voice: appSettings.voice.grokVoice ?? 'Ara',
    instructions: voiceInstructions,
    onTranscript: handleTranscript,
    onToolCall: handleVoiceToolCall,
    onError: handleVoiceError,
    executeTool: executeVoiceTool,
  });

  const activeVoice = voiceProvider === 'grok' ? grokVoice : openaiVoice;
  const { state: voiceState, connect: voiceConnect, disconnect: voiceDisconnect, audioLevel } = activeVoice;

  const toggleVoice = useCallback(() => {
    if (voiceMode) {
      voiceDisconnect();
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
      setError(null);
      voiceConnect().catch((err) => {
        const msg = err instanceof Error ? err.message : 'Voice connection failed';
        setError(msg);
        setVoiceMode(false);
      });
    }
  }, [voiceMode, voiceConnect, voiceDisconnect]);

  // Get enabled models from settings
  const enabledAnthropicModels = appSettings.enabledModels.anthropic;
  const enabledOpenaiModels = appSettings.enabledModels.openai;
  const enabledGoogleModels = appSettings.enabledModels.google;
  const enabledXaiModels = appSettings.enabledModels.xai;

  // System prompt — includes current model info + custom prompt
  const systemPrompt = buildSystemPrompt(provider, model, appSettings.customSystemPrompt);

  // Get API key for current provider from settings
  const getApiKey = useCallback(
    (prov: Provider): string | undefined => {
      const keyMap: Record<string, string> = {
        openai: appSettings.apiKeys.openai,
        anthropic: appSettings.apiKeys.anthropic,
        xai: appSettings.apiKeys.xai,
        google: appSettings.apiKeys.google,
      };
      return keyMap[prov] || undefined;
    },
    [appSettings.apiKeys],
  );

  // Auto-detect Ollama models on mount, then set defaults
  useEffect(() => {
    let cancelled = false;
    const ollamaEndpoint = appSettings.ollamaEndpoint || 'http://localhost:11434';

    async function detectOllama() {
      try {
        const res = await fetch(`${ollamaEndpoint}/api/tags`);
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        const models: string[] = (data.models ?? []).map((m: OllamaModel) => m.name);
        if (!cancelled) {
          setOllamaRunning(true);
          setOllamaModels(models);
          if (!initialized) {
            // Use settings default if not ollama, otherwise pick first ollama model
            if (appSettings.defaultProvider === 'ollama' && models.length > 0) {
              setProvider('ollama');
              setModel(models[0]);
            } else {
              setProvider(appSettings.defaultProvider);
              setModel(appSettings.defaultModel);
            }
            setInitialized(true);
          }
        }
      } catch {
        if (!cancelled) {
          setOllamaRunning(false);
          setOllamaModels([]);
          if (!initialized) {
            setProvider(appSettings.defaultProvider);
            setModel(appSettings.defaultModel);
            setInitialized(true);
          }
        }
      }
    }

    detectOllama();
    return () => { cancelled = true; };
  }, [appSettings.ollamaEndpoint, appSettings.defaultProvider, appSettings.defaultModel, initialized]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const [prov, mod] = value.split('::') as [Provider, string];
      setProvider(prov);
      setModel(mod);
    },
    [],
  );

  // Refresh files and editor after AI modifies files
  const handleFileRefresh = useCallback(
    (toolCalls: ToolCall[]) => {
      const hasFileChange = toolCalls.some((tc) => FILE_MODIFYING_TOOLS.has(tc.name));
      if (hasFileChange) {
        refreshFiles();
        // Reload any tabs for files that were modified
        const modifiedPaths = toolCalls
          .filter((tc) => FILE_MODIFYING_TOOLS.has(tc.name) && tc.args.path)
          .map((tc) => tc.args.path);
        for (const p of modifiedPaths) {
          reloadTab(p);
        }
      }
    },
    [refreshFiles, reloadTab],
  );

  // Send message
  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const apiKey = getApiKey(provider);

      const data = await electronAPI.chat({
        messages: [...messages, userMessage],
        provider,
        model,
        systemPrompt,
        ...(apiKey ? { apiKey } : {}),
      });

      const toolCalls = data.toolCalls || [];
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message || 'No response',
          toolCalls,
        },
      ]);

      // Refresh files if AI modified any
      handleFileRefresh(toolCalls);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to AI service';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectValue = `${provider}::${model}`;

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-full pt-2" style={{ color: 'var(--text)' }}>
      {/* Typing indicator keyframes */}
      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header — collapse + clear */}
      <div
        className="flex items-center justify-end px-3 pt-12 pb-2 relative z-[60] titlebar-drag"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm text-muted-foreground absolute left-1/2 -translate-x-1/2 font-medium">Chat</span>
        <div className="flex items-center gap-0.5 rounded-xl px-1.5 py-1 glass titlebar-no-drag">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={clearChat} title="Clear chat" className="text-muted-foreground hover:text-foreground transition-colors">
                <Eraser className="size-3.5" />
              </Button>
              <div className="w-px h-4 bg-white/10 mx-0.5" />
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={toggleChat} title="Collapse chat" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      </div>


      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div
              className="text-xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #2383e2, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.4))',
              }}
            >
              TracesAI
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="text-sm leading-relaxed max-w-[80%]"
              style={
                msg.role === 'user'
                  ? {
                      color: '#fff',
                      background: '#2383e2',
                      padding: '10px 16px',
                      borderRadius: '20px 20px 4px 20px',
                    }
                  : {
                      color: 'var(--text)',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      padding: '10px 16px',
                      borderRadius: '20px 20px 20px 4px',
                    }
              }
            >
              {/* Tool calls rendered before text content */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="space-y-1 mb-2">
                  {msg.toolCalls.map((tc, j) => (
                    <ToolCallCard key={j} toolCall={tc} />
                  ))}
                </div>
              )}

              <pre
                className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                style={{ margin: 0 }}
              >
                {msg.source === 'voice' && (
                  <Mic className="inline size-3 mr-1 opacity-50 align-text-bottom" />
                )}
                {msg.content}
              </pre>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 py-2 px-3 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--text-dim)',
                    animation: 'typingDot 1.4s infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="text-xs p-3 rounded-lg"
            style={{
              color: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 pb-8 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {voiceMode ? (
          /* ── Voice call UI ── */
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-4 shadow-lg"
            style={{
              backgroundColor: 'rgba(35,131,226,0.08)',
              border: '1px solid rgba(35,131,226,0.2)',
            }}
          >
            {/* Waveform + status */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <VoiceWaveform audioLevel={audioLevel} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold" style={{ color: voiceState === 'connected' ? '#2383e2' : 'var(--text-secondary)' }}>
                  {voiceState === 'connecting' ? 'Connecting...' : voiceState === 'connected' ? 'Listening...' : 'Voice mode'}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{voiceProvider === 'grok' ? 'grok' : 'gpt-realtime'}</span>
              </div>
            </div>

            {/* End call button */}
            <button
              onClick={toggleVoice}
              title="End call"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
              }}
            >
              <PhoneOff className="size-3.5" />
              End Session
            </button>
          </div>
        ) : (
          /* ── Text input UI ── */
          <div
            className="flex flex-col gap-2 rounded-2xl px-3 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-[rgba(35,131,226,0.15)] focus-within:border-white/20"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Text input row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Message your Traces..."
                className="flex-1 min-w-0 bg-transparent text-[14px] placeholder:text-muted-foreground/60 focus:outline-none px-1"
                style={{ color: 'var(--text)' }}
              />
              <Button
                variant="gradient"
                size="icon-sm"
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                title="Send message"
                className="flex-shrink-0 rounded-lg"
              >
                <Send className="size-3.5" />
              </Button>
            </div>

            {/* Bottom bar: model picker + voice controls */}
            <div className="flex items-center gap-2">
              {/* Model picker */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {ollamaRunning && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Ollama is active" />
                )}
                <select
                  value={selectValue}
                  onChange={handleModelChange}
                  className="text-[11px] font-medium rounded-md px-2 py-1 appearance-none cursor-pointer bg-white/[0.06] border border-white/[0.08] text-muted-foreground outline-none hover:bg-white/[0.1] hover:text-foreground transition-colors"
                  style={{
                    backgroundImage:
                      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23a1a1aa\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 6px center',
                    paddingRight: 20,
                  }}
                >
                  {ollamaModels.length > 0 && (
                    <optgroup label="Ollama (local)">
                      {ollamaModels.map((m) => (
                        <option key={`ollama::${m}`} value={`ollama::${m}`}>{m}</option>
                      ))}
                    </optgroup>
                  )}
                  {enabledAnthropicModels.length > 0 && (
                    <optgroup label="Claude">
                      {enabledAnthropicModels.map((m) => (
                        <option key={`anthropic::${m}`} value={`anthropic::${m}`}>{MODEL_LABELS[m] || m}</option>
                      ))}
                    </optgroup>
                  )}
                  {enabledOpenaiModels.length > 0 && (
                    <optgroup label="OpenAI">
                      {enabledOpenaiModels.map((m) => (
                        <option key={`openai::${m}`} value={`openai::${m}`}>{MODEL_LABELS[m] || m}</option>
                      ))}
                    </optgroup>
                  )}
                  {enabledGoogleModels.length > 0 && (
                    <optgroup label="Google Gemini">
                      {enabledGoogleModels.map((m) => (
                        <option key={`google::${m}`} value={`google::${m}`}>{MODEL_LABELS[m] || m}</option>
                      ))}
                    </optgroup>
                  )}
                  {enabledXaiModels.length > 0 && (
                    <optgroup label="xAI Grok">
                      {enabledXaiModels.map((m) => (
                        <option key={`xai::${m}`} value={`xai::${m}`}>{MODEL_LABELS[m] || m}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex-1" />

              {/* Voice provider toggle + mic */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setVoiceProvider(voiceProvider === 'openai' ? 'grok' : 'openai')}
                  title={`Voice: ${voiceProvider === 'openai' ? 'OpenAI' : 'Grok'} (click to switch)`}
                  className="flex items-center justify-center h-6 px-1.5 rounded-md text-[10px] font-medium transition-colors hover:bg-white/[0.1]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {voiceProvider === 'openai' ? 'GPT' : 'Grok'}
                </button>
                <button
                  onClick={toggleVoice}
                  title="Start voice conversation"
                  className="flex items-center justify-center size-6 rounded-md transition-colors hover:bg-white/[0.1]"
                >
                  <Mic className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

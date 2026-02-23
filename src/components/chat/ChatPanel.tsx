'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Send, ChevronLeft, Eraser } from 'lucide-react';

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
}

interface OllamaModel {
  name: string;
  model: string;
}

// Hard-coded cloud model options (use short aliases)
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini'];
const CLAUDE_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
];
const XAI_MODELS = ['grok-3-fast', 'grok-4-1-fast'];
const GOOGLE_MODELS = ['gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro'];

// Friendly display names
const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'grok-3-fast': 'Grok 3 Fast',
  'grok-4-1-fast': 'Grok 4.1 Fast',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
};

function buildSystemPrompt(provider: string, model: string): string {
  const displayName = MODEL_LABELS[model] || model;
  return `You are TracesAI, an AI assistant embedded in a knowledge management app called Traces. You are currently running as ${displayName} (model ID: ${model}) from ${provider}. If the user asks what model you are, tell them you are ${displayName}. You can read, write, edit, search, and delete files in the user's vault. Use tools to help the user manage their notes and knowledge base. Always be helpful and proactive.`;
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
  const { refreshFiles } = useVaultStore();
  const { reloadTab } = useEditorStore();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // System prompt — includes current model info
  const systemPrompt = buildSystemPrompt(provider, model);

  // Model state
  const [provider, setProvider] = useState<Provider>('ollama');
  const [model, setModel] = useState('');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaRunning, setOllamaRunning] = useState(false);

  // Auto-detect Ollama models on mount
  useEffect(() => {
    let cancelled = false;

    async function detectOllama() {
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        const models: string[] = (data.models ?? []).map((m: OllamaModel) => m.name);
        if (!cancelled) {
          setOllamaRunning(true);
          setOllamaModels(models);
          if (models.length > 0) {
            setProvider('ollama');
            setModel(models[0]);
          } else {
            setProvider('anthropic');
            setModel(CLAUDE_MODELS[0]);
          }
        }
      } catch {
        if (!cancelled) {
          setOllamaRunning(false);
          setOllamaModels([]);
          setProvider('anthropic');
          setModel(CLAUDE_MODELS[0]);
        }
      }
    }

    detectOllama();
    return () => { cancelled = true; };
  }, []);

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          provider,
          model,
          systemPrompt,
        }),
      });

      if (res.status === 503) {
        const data = await res.json();
        setError(data.error || 'API key not configured. Add the required key to .env.local');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
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
        className="flex items-center justify-between px-3 pt-10 pb-2 relative z-[60]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm text-muted-foreground">Chat</span>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-xs" onClick={clearChat} title="Clear chat" className="text-muted-foreground hover:text-foreground">
              <Eraser className="size-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={toggleChat} title="Collapse chat" className="titlebar-no-drag text-muted-foreground hover:text-foreground">
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

      {/* Input area + model picker — single row */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 transition-shadow focus-within:ring-2 focus-within:ring-[rgba(35,131,226,0.2)] focus-within:border-white/15"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Model picker */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ollamaRunning && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Ollama is running" />
            )}
            <select
              value={selectValue}
              onChange={handleModelChange}
              className="text-xs rounded-md px-2 py-1.5 appearance-none cursor-pointer bg-white/[0.06] border border-white/[0.08] text-muted-foreground outline-none hover:bg-white/[0.1] hover:text-foreground transition-colors"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23a1a1aa\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
                paddingRight: 22,
              }}
            >
              {ollamaModels.length > 0 && (
                <optgroup label="Ollama (local)">
                  {ollamaModels.map((m) => (
                    <option key={`ollama::${m}`} value={`ollama::${m}`}>{m}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Claude">
                {CLAUDE_MODELS.map((m) => (
                  <option key={`anthropic::${m}`} value={`anthropic::${m}`}>{MODEL_LABELS[m] || m}</option>
                ))}
              </optgroup>
              <optgroup label="OpenAI">
                {OPENAI_MODELS.map((m) => (
                  <option key={`openai::${m}`} value={`openai::${m}`}>{MODEL_LABELS[m] || m}</option>
                ))}
              </optgroup>
              <optgroup label="Google Gemini">
                {GOOGLE_MODELS.map((m) => (
                  <option key={`google::${m}`} value={`google::${m}`}>{MODEL_LABELS[m] || m}</option>
                ))}
              </optgroup>
              <optgroup label="xAI Grok">
                {XAI_MODELS.map((m) => (
                  <option key={`xai::${m}`} value={`xai::${m}`}>{MODEL_LABELS[m] || m}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Chat with your Traces..."
            className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-gray-500 focus:outline-none"
            style={{ color: 'var(--text)' }}
          />

          {/* Send */}
          <Button variant="gradient" size="icon-sm" onClick={handleSubmit} disabled={loading} title="Send" className="flex-shrink-0 rounded-lg">
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

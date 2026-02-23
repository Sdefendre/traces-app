'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Provider = 'ollama' | 'openai' | 'anthropic' | 'xai';

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
  'claude-opus-4-6-20250514',
  'claude-sonnet-4-6-20250514',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
];
const XAI_MODELS = ['grok-3-fast', 'grok-4-1-fast'];

// Friendly display names
const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6-20250514': 'Opus 4.6',
  'claude-sonnet-4-6-20250514': 'Sonnet 4.6',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'grok-3-fast': 'Grok 3 Fast',
  'grok-4-1-fast': 'Grok 4.1 Fast',
};

const DEFAULT_SYSTEM_PROMPT =
  'You are Traces, an AI assistant embedded in a knowledge management app called Traces. You can read, write, edit, search, and delete files in the user\'s vault. Use tools to help the user manage their notes and knowledge base. Always be helpful and proactive.';

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
    <div
      className="rounded-lg text-xs overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeftWidth: 3,
        borderLeftColor: borderColor,
      }}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 text-left cursor-pointer"
        style={{ color: 'var(--text)' }}
      >
        <span className="flex items-center gap-1.5">
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: borderColor,
              flexShrink: 0,
            }}
          />
          <span className="font-medium" style={{ fontFamily: 'monospace', fontSize: 11 }}>
            {toolCall.name}
          </span>
          {toolCall.args.path && (
            <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 10 }}>
              {toolCall.args.path}
            </span>
          )}
        </span>
        <span
          style={{
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--text-dim)',
            fontSize: 10,
          }}
        >
          &#9654;
        </span>
      </button>

      {expanded && (
        <div
          className="px-2.5 pb-2 space-y-1.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {Object.keys(toolCall.args).length > 0 && (
            <div className="pt-1.5">
              <div className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: 'var(--text-dim)' }}>
                Arguments
              </div>
              <pre
                className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded"
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.result && (
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: 'var(--text-dim)' }}>
                Result
              </div>
              <pre
                className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded"
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  color: 'var(--text)',
                  margin: 0,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
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

  // System prompt
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

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
  const modelLabel = MODEL_LABELS[model] || model;

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-full pt-10" style={{ color: 'var(--text)' }}>
      {/* Typing indicator keyframes */}
      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Chat</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
            {modelLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="transition-colors text-xs"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Clear
            </button>
          )}
          <button
            onClick={toggleChat}
            className="transition-colors text-sm"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Model Selector */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {ollamaRunning && (
          <span
            title="Ollama is running"
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              flexShrink: 0,
            }}
          />
        )}

        <select
          value={selectValue}
          onChange={handleModelChange}
          className="flex-1 text-xs rounded px-2 py-1.5 appearance-none cursor-pointer"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            outline: 'none',
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23a1a1aa\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: 28,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {ollamaModels.length > 0 && (
            <optgroup label="Ollama (local)">
              {ollamaModels.map((m) => (
                <option key={`ollama::${m}`} value={`ollama::${m}`}>
                  {m}
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="Claude">
            {CLAUDE_MODELS.map((m) => (
              <option key={`anthropic::${m}`} value={`anthropic::${m}`}>
                {MODEL_LABELS[m] || m}
              </option>
            ))}
          </optgroup>

          <optgroup label="OpenAI">
            {OPENAI_MODELS.map((m) => (
              <option key={`openai::${m}`} value={`openai::${m}`}>
                {MODEL_LABELS[m] || m}
              </option>
            ))}
          </optgroup>

          <optgroup label="xAI Grok">
            {XAI_MODELS.map((m) => (
              <option key={`xai::${m}`} value={`xai::${m}`}>
                {MODEL_LABELS[m] || m}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* System Prompt (collapsible) */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowSystemPrompt((prev) => !prev)}
          className="flex items-center gap-1.5 px-4 py-1.5 w-full text-left text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            style={{
              transition: 'transform 150ms',
              transform: showSystemPrompt ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: 8,
              display: 'inline-block',
            }}
          >
            &#9654;
          </span>
          System Prompt
        </button>
        {showSystemPrompt && (
          <div className="px-4 pb-2">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full text-xs rounded p-2 resize-y focus:outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'monospace',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Traces AI
            </div>
            <p className="text-xs" style={{ color: 'var(--text-dim)', maxWidth: 260, margin: '0 auto' }}>
              {ollamaRunning
                ? 'Select a model and start chatting. I can read, write, and manage your notes.'
                : 'Ollama is not running. Use Claude, OpenAI, or Grok (requires API keys in .env.local).'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="text-sm leading-relaxed rounded-2xl max-w-[85%]"
              style={
                msg.role === 'user'
                  ? {
                      color: '#fff',
                      background: 'linear-gradient(135deg, rgba(35,131,226,0.4), rgba(155,89,182,0.4))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '8px 14px',
                    }
                  : {
                      color: 'var(--text)',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '10px 14px',
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

      {/* Input area */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask Traces..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl placeholder:text-gray-500 focus:outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(35,131,226,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2.5 text-sm rounded-xl transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(35,131,226,0.5), rgba(155,89,182,0.5))',
              color: '#fff',
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

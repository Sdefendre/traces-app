'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';

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

// Hard-coded cloud model options
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini'];
const CLAUDE_MODELS = [
  'claude-opus-4-6-20250514',
  'claude-sonnet-4-6-20250514',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
];
const XAI_MODELS = ['grok-3-fast'];

const DEFAULT_SYSTEM_PROMPT =
  'You are Jarvis, an AI assistant embedded in a knowledge management app. You have tools to read, write, edit, search, and delete files in the user\'s vault. Be proactive and helpful.';

// ---------------------------------------------------------------------------
// Tool color mapping
// ---------------------------------------------------------------------------
const TOOL_BORDER_COLORS: Record<string, string> = {
  read_file: '#3b82f6',    // blue
  write_file: '#22c55e',   // green
  edit_file: '#f97316',    // orange
  delete_file: '#ef4444',  // red
  search_files: '#a855f7', // purple
  list_files: '#6b7280',   // gray
};

function getToolColor(name: string): string {
  return TOOL_BORDER_COLORS[name] ?? '#6b7280';
}

// ---------------------------------------------------------------------------
// ToolCallCard
// ---------------------------------------------------------------------------
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = getToolColor(toolCall.name);

  return (
    <div
      className="rounded text-xs overflow-hidden"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
        border: `1px solid var(--border, #e0e0e0)`,
        borderLeftWidth: 3,
        borderLeftColor: borderColor,
      }}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full px-2 py-1.5 text-left cursor-pointer"
        style={{ color: 'var(--text, #111)' }}
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
        </span>
        <span
          style={{
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--text-dim, #bbb)',
            fontSize: 10,
          }}
        >
          &#9654;
        </span>
      </button>

      {expanded && (
        <div
          className="px-2 pb-2 space-y-1.5"
          style={{ borderTop: '1px solid var(--border, #e0e0e0)' }}
        >
          {/* Args */}
          {Object.keys(toolCall.args).length > 0 && (
            <div className="pt-1.5">
              <div
                className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold"
                style={{ color: 'var(--text-dim, #bbb)' }}
              >
                Arguments
              </div>
              <pre
                className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded"
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg, #fff)',
                  color: 'var(--text, #111)',
                  margin: 0,
                }}
              >
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {toolCall.result && (
            <div>
              <div
                className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold"
                style={{ color: 'var(--text-dim, #bbb)' }}
              >
                Result
              </div>
              <pre
                className="whitespace-pre-wrap text-[11px] leading-relaxed p-1.5 rounded"
                style={{
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg, #fff)',
                  color: 'var(--text, #111)',
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

  // ------------------------------------------------------------------
  // Auto-detect Ollama models on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function detectOllama() {
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        const models: string[] = (data.models ?? []).map(
          (m: OllamaModel) => m.name,
        );
        if (!cancelled) {
          setOllamaRunning(true);
          setOllamaModels(models);
          if (models.length > 0) {
            setProvider('ollama');
            setModel(models[0]);
          } else {
            setProvider('openai');
            setModel(OPENAI_MODELS[0]);
          }
        }
      } catch {
        if (!cancelled) {
          setOllamaRunning(false);
          setOllamaModels([]);
          setProvider('openai');
          setModel(OPENAI_MODELS[0]);
        }
      }
    }

    detectOllama();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Scroll to bottom on new messages
  // ------------------------------------------------------------------
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // ------------------------------------------------------------------
  // Model selector change handler
  // ------------------------------------------------------------------
  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const [prov, mod] = value.split('::') as [Provider, string];
      setProvider(prov);
      setModel(mod);
    },
    [],
  );

  // ------------------------------------------------------------------
  // Send message
  // ------------------------------------------------------------------
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
        setError(
          data.error ||
            'API key not configured. Add the required key to .env.local',
        );
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message || 'No response',
          toolCalls: data.toolCalls || [],
        },
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to connect to AI service';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectValue = `${provider}::${model}`;

  const emptyStateText = ollamaRunning
    ? 'Select a model above and start chatting.'
    : 'Ollama is not running. You can still use OpenAI, Claude, or Grok (requires API keys in .env.local).';

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-full pt-10" style={{ backgroundColor: 'var(--bg, #fff)' }}>
      {/* Typing indicator keyframes */}
      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border, #e0e0e0)' }}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: 'var(--text, #111)' }}>
            AI Chat
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary, #888)' }}>
            {model || 'No model selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="transition-colors text-xs"
              style={{ color: 'var(--text-secondary, #888)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text, #111)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #888)')}
            >
              Clear chat
            </button>
          )}
          <button
            onClick={toggleChat}
            className="transition-colors text-sm"
            style={{ color: 'var(--text-dim, #bbb)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text, #111)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim, #bbb)')}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Model Selector */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border, #e0e0e0)' }}
      >
        {ollamaRunning && (
          <span
            title="Ollama is running"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              flexShrink: 0,
            }}
          />
        )}

        <select
          value={selectValue}
          onChange={handleModelChange}
          className="flex-1 text-sm rounded px-2 py-1.5 appearance-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg, #fff)',
            border: '1px solid var(--border, #e0e0e0)',
            color: 'var(--text, #111)',
            outline: 'none',
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23888\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: 28,
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = '#999';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'var(--border, #e0e0e0)';
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

          <optgroup label="OpenAI">
            {OPENAI_MODELS.map((m) => (
              <option key={`openai::${m}`} value={`openai::${m}`}>
                {m}
              </option>
            ))}
          </optgroup>

          <optgroup label="Claude">
            {CLAUDE_MODELS.map((m) => (
              <option key={`anthropic::${m}`} value={`anthropic::${m}`}>
                {m}
              </option>
            ))}
          </optgroup>

          <optgroup label="xAI Grok">
            {XAI_MODELS.map((m) => (
              <option key={`xai::${m}`} value={`xai::${m}`}>
                {m}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* System Prompt (collapsible) */}
      <div style={{ borderBottom: '1px solid var(--border, #e0e0e0)' }}>
        <button
          onClick={() => setShowSystemPrompt((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 w-full text-left text-xs"
          style={{ color: 'var(--text-secondary, #888)' }}
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
          <div className="px-3 pb-2">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full text-xs rounded p-2 resize-y focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                border: '1px solid var(--border, #e0e0e0)',
                color: 'var(--text, #111)',
                fontFamily: 'monospace',
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#999';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border, #e0e0e0)';
              }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-center mt-8">
            <p className="mb-2" style={{ color: 'var(--text-secondary, #888)' }}>
              Jarvis AI Assistant
            </p>
            <p style={{ color: 'var(--text-dim, #bbb)', maxWidth: 260, margin: '0 auto' }}>
              {emptyStateText}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className="text-sm leading-relaxed rounded p-2"
            style={
              msg.role === 'user'
                ? {
                    color: 'var(--text, #111)',
                    backgroundColor: 'var(--bg, #fff)',
                    border: '1px solid var(--border, #e0e0e0)',
                  }
                : {
                    color: 'var(--text, #111)',
                    borderLeft: '3px solid var(--text, #111)',
                    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
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
        ))}

        {loading && (
          <div className="flex items-center gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--text-dim, #bbb)',
                  animation: 'typingDot 1.4s infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            className="text-xs p-2 rounded"
            style={{
              color: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border, #e0e0e0)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask Jarvis..."
            className="flex-1 px-3 py-2 text-sm rounded placeholder:text-gray-400 focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary, #f5f5f5)',
              border: '1px solid var(--border, #e0e0e0)',
              color: 'var(--text, #111)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#999';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'var(--border, #e0e0e0)';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-2 text-sm rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--text, #111)',
              color: 'var(--bg, #fff)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.opacity = '0.8')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.opacity = '1')
            }
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

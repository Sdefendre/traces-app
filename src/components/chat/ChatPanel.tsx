'use client';

import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel() {
  const { toggleChat } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

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
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (res.status === 503) {
        setError('AI not configured. Add OPENAI_API_KEY to .env.local');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message || 'No response' },
      ]);
    } catch (err) {
      setError('Failed to connect to AI service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full pt-8">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-neon-purple glow-purple tracking-wider uppercase">
          AI Assistant
        </span>
        <button
          onClick={toggleChat}
          className="text-text-dim hover:text-text-primary transition-colors text-sm"
        >
          x
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-text-dim text-xs text-center mt-8">
            <p className="mb-2">Jarvis AI Assistant</p>
            <p className="text-text-dim/60">
              Configure OPENAI_API_KEY in .env.local to enable
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'text-text-primary bg-surface/50 rounded p-2'
                : 'text-text-secondary p-2 border-l-2 border-neon-purple/30'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="text-neon-purple text-xs animate-pulse-glow">
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-neon-orange text-xs p-2 bg-neon-orange/5 rounded border border-neon-orange/20">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask Jarvis..."
            className="flex-1 px-2 py-1.5 text-xs bg-void border border-border rounded
                       text-text-primary placeholder:text-text-dim
                       focus:outline-none focus:border-neon-purple/50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-neon-purple/20 text-neon-purple rounded
                       hover:bg-neon-purple/30 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

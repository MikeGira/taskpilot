'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Terminal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message { role: 'user' | 'assistant'; content: string; }

const WELCOME = "Hey! I'm Pilot 👋 — your TaskPilot assistant. I know the automation kit inside-out, the script generator, and PowerShell best practices. What can I help you with?";

const STARTERS = [
  'How do I configure the password reset script?',
  'What does the $19 kit include?',
  'How do I use the AI script generator?',
  'How do I set up Task Scheduler automation?',
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json() as { content?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Try again.'); return; }
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? '' }]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const showStarters = messages.length <= 1 && !loading;

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-[88px] right-4 sm:right-6 z-50',
          'w-[calc(100vw-2rem)] sm:w-[380px] max-h-[560px]',
          'flex flex-col rounded-2xl border border-white/10',
          'bg-[#080808] shadow-2xl shadow-black/70',
          'transition-all duration-300 ease-out origin-bottom-right',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shrink-0">
              <Terminal className="h-3.5 w-3.5" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-[#080808] animate-ping-slow" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-[#080808]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Pilot</p>
              <p className="text-[11px] text-[#555] mt-0.5">TaskPilot AI Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#444] hover:text-white transition-colors rounded-lg p-1.5 hover:bg-white/5"
            aria-label="Close chat"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hidden min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2.5 animate-fade-in',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black mt-1">
                  <Terminal className="h-3 w-3" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-white text-black rounded-tr-sm'
                    : 'bg-white/6 text-[#E4E4E7] border border-white/8 rounded-tl-sm'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing dots */}
          {loading && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black mt-1">
                <Terminal className="h-3 w-3" />
              </div>
              <div className="bg-white/6 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Starter suggestions */}
          {showStarters && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-[#444] px-1 uppercase tracking-wider">Quick questions</p>
              {STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs text-[#777] border border-white/8 bg-white/2 hover:bg-white/6 hover:text-white rounded-xl px-3 py-2 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-white/40 text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/8 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about TaskPilot…"
              className="flex-1 min-w-0 bg-white/4 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-white/25 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black disabled:opacity-25 hover:bg-zinc-100 transition-all active:scale-95"
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
          <p className="text-center text-[10px] text-[#2a2a2a] mt-1.5">Powered by Claude AI</p>
        </div>
      </div>

      {/* ── Trigger button ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-4 sm:right-6 z-50',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-white text-black shadow-lg shadow-black/40',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          open && 'rotate-45'
        )}
        aria-label={open ? 'Close Pilot assistant' : 'Open Pilot assistant'}
      >
        {open ? (
          <X className="h-5 w-5 transition-transform" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-black border-2 border-white animate-ping-slow" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-black border-2 border-white" />
          </div>
        )}
      </button>
    </>
  );
}

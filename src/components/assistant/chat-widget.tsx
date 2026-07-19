'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ArrowUp, ArrowRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Message { role: 'user' | 'assistant'; content: string; }

const WELCOME =
  "I'm Pilot. I can answer questions about TaskPilot, help you write better task descriptions for the script generator, or point you to the workflow generator. What do you need?";

const STARTERS = [
  'How do I configure the password reset script?',
  'What does the $19 kit include?',
  'How do I set up Task Scheduler automation?',
];

const MAX_COMPOSER_HEIGHT = 120;

function stripMarkdown(text: string): string {
  return text
    // Bold/italic asterisks and underscores
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')
    // Headers
    .replace(/^#{1,6}\s+/gm, '')
    // Bullet points (-, *, +) and numbered lists
    .replace(/^[\-\*\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Code fences and inline code
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    // Links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Blockquotes
    .replace(/^>\s*/gm, '')
    // Em-dashes (long dash)
    .replace(/\s*[—–]\s*/g, ', ') // ai-tell-ok: this strips dashes from AI output
    // Collapse excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Main widget ──────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Auto-follow only while the reader is near the bottom; a scroll-up locks it
  const followRef = useRef(true);

  useEffect(() => {
    if (open) setTimeout(() => composerRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [input]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  const sendChat = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || streaming) return;
    const history: Message[] = [...messages, { role: 'user', content: t }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    setError('');
    followRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || contentType.includes('application/json')) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        // Put the message back in the composer so send acts as retry
        setMessages(messages);
        setInput(t);
        setError(data.error ?? 'Pilot could not respond. Try again.');
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setMessages([...history, { role: 'assistant', content: snapshot }]);
      }
      setMessages([...history, { role: 'assistant', content: stripMarkdown(full) }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User pressed Stop — keep whatever streamed; drop an empty placeholder
        setMessages(prev =>
          prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content
            ? prev.slice(0, -1)
            : prev
        );
        return;
      }
      setMessages(messages);
      setInput(t);
      setError('Network error. Check your connection and try again.');
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  function stopStreaming() {
    abortRef.current?.abort();
  }

  async function copyMessage(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const showStarters = messages.length <= 1 && !streaming;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-[72px] left-2 right-2 z-50 sm:left-auto sm:right-6 sm:w-[420px]',
          'flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0A0A0A]',
          'transition-all duration-200 ease-out',
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        )}
        style={{ maxHeight: 'min(640px, calc(100dvh - 96px))' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
          <div>
            <p className="text-sm font-semibold leading-none text-white">Pilot</p>
            <p className="mt-1 text-xs text-[#6B7280]">TaskPilot assistant</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors duration-150 hover:text-white"
            aria-label="Close"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 scrollbar-hidden"
          aria-live="polite"
        >
          {messages.map((msg, i) => {
            const isStreamingThis = streaming && i === messages.length - 1 && msg.role === 'assistant';
            return msg.role === 'user' ? (
              <div key={i} className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm leading-relaxed text-[#F9FAFB]">
                {msg.content}
              </div>
            ) : (
              <div key={i} className="group">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Pilot</p>
                  {msg.content && !isStreamingThis && (
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.content, i)}
                      aria-label="Copy message"
                      className="text-[#6B7280] opacity-0 transition-opacity duration-150 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      {copiedIndex === i ? <Check className="h-3.5 w-3.5 text-[#3ECF8E]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-[#E4E4E7]', isStreamingThis && 'stream-caret')}>
                  {msg.content}
                </p>
              </div>
            );
          })}

          {showStarters && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Quick questions</p>
              {STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendChat(q)}
                  className="w-full rounded-lg border border-white/8 px-3 py-2 text-left text-xs text-[#A1A1AA] transition-colors duration-150 hover:border-white/25 hover:text-white"
                >
                  {q}
                </button>
              ))}
              <Link
                href="/generate"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-left text-xs font-medium text-[#3ECF8E] transition-colors duration-150 hover:border-[rgba(62,207,142,0.4)]"
              >
                Generate a custom script <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => sendChat(input)}
                className="font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/8 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-white/12 bg-[#111] px-3 py-2 transition-colors duration-150 focus-within:border-[rgba(62,207,142,0.5)]">
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChat(input);
                  }
                }}
                placeholder="Ask Pilot"
                rows={1}
                maxLength={2000}
                className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-white placeholder:text-[#6B7280] focus:outline-none"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="pb-0.5 text-[13px] font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3ECF8E] text-black transition-opacity duration-150 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/8 bg-white text-black transition-transform duration-150 active:scale-95 sm:right-6"
        aria-label={open ? 'Close Pilot' : 'Open Pilot'}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/pilot.svg" alt="Pilot" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
        )}
      </button>
    </>
  );
}

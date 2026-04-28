'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, ChevronDown, Wand2, MessageSquare, Download, Copy, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerateResult } from '@/app/api/generate/route';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Message { role: 'user' | 'assistant'; content: string; }
type Panel = 'chat' | 'generate';
type GenStep = 'os' | 'env' | 'task' | 'loading' | 'result';

const OS_OPTS = [
  { id: 'windows',        label: 'Windows',        emoji: '⊞' },
  { id: 'linux',          label: 'Linux',           emoji: '$' },
  { id: 'macos',          label: 'macOS',           emoji: '' },
  { id: 'cross-platform', label: 'Cross-Platform',  emoji: '⚡' },
];
const ENV_OPTS = [
  { id: 'on-premises', label: 'On-Premises' },
  { id: 'hybrid',      label: 'Hybrid'      },
  { id: 'cloud',       label: 'Cloud'       },
  { id: 'multi-cloud', label: 'Multi-Cloud' },
];
const GEN_EXAMPLES = [
  'Onboard a new employee — create AD account, assign groups, set temp password',
  'Offboard a departing employee — disable account, revoke access, archive data',
  'Provision a new laptop — join domain, install software, configure settings',
  'Decommission an old device — backup data, wipe disk, remove from inventory',
  'Run a monthly user access review and export to CSV',
  'Monitor disk space and alert when drives fall below 15%',
  'Auto-disable accounts inactive for 90 days with audit report',
  'Restart failed services automatically and log each event',
];

const WELCOME = "Hey, I'm Pilot 👨‍✈️ — your TaskPilot co-pilot. I can answer questions about the platform OR generate a custom script for you. What do you need?";
const STARTERS = [
  'How do I configure the password reset script?',
  'What does the $19 kit include?',
  'How do I set up Task Scheduler automation?',
];

function PilotAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 24 : 36;
  const cls = size === 'sm' ? 'h-6 w-6' : 'h-9 w-9';
  return (
    <div className={cn('shrink-0 rounded-full bg-[#0d1117] overflow-hidden flex items-center justify-center select-none', cls)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pilot.svg" alt="Pilot" width={dim} height={dim} className="w-full h-full object-cover" />
    </div>
  );
}

function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic asterisks and underscores
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Convert bullet/dash list items to numbered or plain
    .replace(/^[\-\*\+]\s+/gm, '')
    // Remove numbered list markers (keep the content)
    .replace(/^\d+\.\s+/gm, (_, offset, str) => {
      // Keep numbers if they look like actual lists
      return offset === 0 || str[offset - 1] === '\n' ? '' : '';
    })
    // Remove inline code backticks
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    // Remove markdown links — keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Main widget ──────────────────────────────────────────────────────────── */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Generate state
  const [genStep, setGenStep] = useState<GenStep>('os');
  const [genOs, setGenOs] = useState('');
  const [genEnv, setGenEnv] = useState('');
  const [genTask, setGenTask] = useState('');
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genCopied, setGenCopied] = useState(false);

  useEffect(() => {
    if (open && panel === 'chat') setTimeout(() => chatInputRef.current?.focus(), 150);
  }, [open, panel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  /* ── Chat send ─────────────────────────────────────────────────────────── */
  const sendChat = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || chatLoading) return;
    const next: Message[] = [...messages, { role: 'user', content: t }];
    setMessages(next);
    setChatInput('');
    setChatLoading(true);
    setChatError('');
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json() as { content?: string; error?: string };
      if (!res.ok) { setChatError(data.error ?? 'Something went wrong.'); return; }
      setMessages(prev => [...prev, { role: 'assistant', content: stripMarkdown(data.content ?? '') }]);
    } catch { setChatError('Network error. Try again.'); }
    finally { setChatLoading(false); }
  }, [messages, chatLoading]);

  /* ── Script generate ───────────────────────────────────────────────────── */
  async function runGenerate() {
    setGenStep('loading');
    setGenResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os: genOs, environment: genEnv, taskDescription: genTask }),
      });
      const data: GenerateResult & { error?: string } = await res.json();
      if (!res.ok) { setGenStep('task'); return; }
      if (data.needsClarification && data.question) {
        // Treat clarification as another task description update
        setGenTask(prev => prev + '\n\n' + data.question);
        setGenStep('task');
        return;
      }
      setGenResult(data);
      setGenStep('result');
    } catch { setGenStep('task'); }
  }

  function resetGenerate() {
    setGenStep('os');
    setGenOs('');
    setGenEnv('');
    setGenTask('');
    setGenResult(null);
    setGenCopied(false);
  }

  function copyScript() {
    if (!genResult?.script) return;
    navigator.clipboard.writeText(genResult.script);
    setGenCopied(true);
    setTimeout(() => setGenCopied(false), 2000);
  }

  function downloadScript() {
    if (!genResult?.script) return;
    const blob = new Blob([genResult.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = genResult.filename ?? 'script.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const showStarters = messages.length <= 1 && !chatLoading;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'fixed bottom-[88px] right-4 sm:right-6 z-50',
        'w-[calc(100vw-2rem)] sm:w-[400px] max-h-[580px]',
        'flex flex-col rounded-2xl border border-indigo-500/20',
        'bg-[#070710] shadow-2xl shadow-indigo-900/20',
        'transition-all duration-300 ease-out origin-bottom-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-indigo-950/20 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <PilotAvatar />
            <div>
              <p className="text-sm font-semibold text-white leading-none">Pilot</p>
              <p className="text-[11px] text-indigo-400/70 mt-0.5">TaskPilot AI Co-Pilot</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-1" />
            <button onClick={() => setOpen(false)} className="text-[#777] hover:text-white transition-colors rounded-lg p-1.5 hover:bg-white/5" aria-label="Close">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/8 shrink-0">
          {(['chat', 'generate'] as Panel[]).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                panel === p ? 'text-white border-b-2 border-indigo-500' : 'text-[#888] hover:text-[#ccc]'
              )}
            >
              {p === 'chat' ? <MessageSquare className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
              {p === 'chat' ? 'Ask Pilot' : 'Generate Script'}
            </button>
          ))}
        </div>

        {/* ── CHAT panel ────────────────────────────────────────────────────── */}
        {panel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hidden min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2.5 animate-fade-in', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  {msg.role === 'assistant' && <PilotAvatar size="sm" />}
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-indigo-950/40 text-[#E4E4E7] border border-indigo-500/15 rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2.5 animate-fade-in">
                  <PilotAvatar size="sm" />
                  <div className="bg-indigo-950/40 border border-indigo-500/15 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,150,300].map((d) => <div key={d} className="h-1.5 w-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              {showStarters && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-[#888] px-1 uppercase tracking-wider font-medium">Quick questions</p>
                  {STARTERS.map((q) => (
                    <button key={q} onClick={() => sendChat(q)} className="w-full text-left text-xs text-[#aaa] border border-indigo-500/25 bg-indigo-950/30 hover:bg-indigo-950/60 hover:text-white rounded-xl px-3 py-2 transition-colors">{q}</button>
                  ))}
                  <button onClick={() => setPanel('generate')} className="w-full text-left text-xs text-indigo-300 border border-indigo-400/30 bg-indigo-900/30 hover:bg-indigo-900/50 hover:text-white rounded-xl px-3 py-2 transition-colors flex items-center gap-1.5 font-medium">
                    <Wand2 className="h-3 w-3" /> Generate a custom script for my environment →
                  </button>
                </div>
              )}
              {chatError && <p className="text-[11px] text-red-400/60 text-center">{chatError}</p>}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-white/8 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }} className="flex gap-2">
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Pilot anything…"
                  className="flex-1 min-w-0 rounded-full px-4 py-2 text-sm text-white placeholder:text-[#777] focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all"
                  style={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(99,102,241,0.2)' }}
                  disabled={chatLoading}
                />
                <button type="submit" disabled={!chatInput.trim() || chatLoading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-25 transition-all active:scale-95">
                  {chatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </form>
              <p className="text-center text-[10px] text-[#aaa] mt-1.5">Powered by Claude AI</p>
            </div>
          </>
        )}

        {/* ── GENERATE panel ─────────────────────────────────────────────────── */}
        {panel === 'generate' && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* STEP: OS */}
            {genStep === 'os' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden">
                <p className="text-xs font-semibold text-white mb-1">What OS are you targeting?</p>
                <p className="text-[11px] text-[#888] mb-4">Determines the scripting language used.</p>
                <div className="grid grid-cols-2 gap-2">
                  {OS_OPTS.map((o) => (
                    <button key={o.id} onClick={() => { setGenOs(o.id); setGenStep('env'); }}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 hover:border-indigo-500/40 hover:bg-indigo-950/30 px-3 py-3 text-sm text-white transition-all group">
                      <span className="text-base">{o.emoji}</span>
                      <span className="font-medium">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: Environment */}
            {genStep === 'env' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden">
                <button onClick={() => setGenStep('os')} className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white mb-3 transition-colors">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <p className="text-xs font-semibold text-white mb-1">What&apos;s your environment?</p>
                <p className="text-[11px] text-[#888] mb-4">Determines which tools and APIs the script uses.</p>
                <div className="grid grid-cols-2 gap-2">
                  {ENV_OPTS.map((e) => (
                    <button key={e.id} onClick={() => { setGenEnv(e.id); setGenStep('task'); }}
                      className="rounded-xl border border-white/10 bg-white/3 hover:border-indigo-500/40 hover:bg-indigo-950/30 px-3 py-3 text-sm font-medium text-white transition-all">
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: Task */}
            {genStep === 'task' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-3">
                <button onClick={() => setGenStep('env')} className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white transition-colors w-fit">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">What do you want to automate?</p>
                  <p className="text-[11px] text-[#888]">Describe in plain English. More detail = better script.</p>
                </div>
                <textarea
                  value={genTask}
                  onChange={(e) => setGenTask(e.target.value)}
                  placeholder="e.g. Offboard a leaving employee — disable their AD account, remove from all groups, archive their home folder, and send a report to HR..."
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl text-sm text-white placeholder:text-[#777] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40 p-3"
                  style={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(99,102,241,0.2)' }}
                />
                <div>
                  <p className="text-[10px] text-[#aaa] mb-1.5 uppercase tracking-wider">Examples</p>
                  <div className="flex flex-col gap-1">
                    {GEN_EXAMPLES.slice(0, 4).map((ex) => (
                      <button key={ex} onClick={() => setGenTask(ex)}
                        className="text-left text-[11px] text-[#999] hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors truncate">
                        → {ex}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={runGenerate}
                  disabled={genTask.trim().length < 10}
                  className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-all active:scale-95"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate Script
                </button>
              </div>
            )}

            {/* STEP: Loading */}
            {genStep === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 border-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Generating your script…</p>
                  <p className="text-xs text-[#888] mt-1">Adding error handling, logging & config section</p>
                </div>
              </div>
            )}

            {/* STEP: Result */}
            {genStep === 'result' && genResult && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{genResult.title ?? 'Script ready'}</p>
                    {genResult.explanation && <p className="text-[11px] text-[#999] leading-relaxed mt-0.5 line-clamp-2">{genResult.explanation}</p>}
                  </div>
                  <button onClick={resetGenerate} className="text-[11px] text-indigo-400 hover:text-indigo-300 shrink-0 whitespace-nowrap">New script</button>
                </div>

                {/* Script block */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-white/4 border-b border-white/8">
                    <span className="text-[11px] font-mono text-[#888]">{genResult.filename ?? 'script'}</span>
                    <div className="flex gap-1.5">
                      <button onClick={copyScript} className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white px-2 py-1 rounded-md hover:bg-white/8 transition-colors">
                        {genCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {genCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={downloadScript} className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white px-2 py-1 rounded-md hover:bg-white/8 transition-colors">
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </div>
                  </div>
                  <pre className="overflow-auto p-3 text-[11px] text-[#C9D1D9] font-mono leading-relaxed scrollbar-hidden max-h-[180px]">
                    <code>{genResult.script}</code>
                  </pre>
                </div>

                {/* Config notes */}
                {genResult.configNotes && genResult.configNotes.length > 0 && (
                  <div className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-3">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Before you run</p>
                    <ul className="space-y-1">
                      {genResult.configNotes.map((n, i) => (
                        <li key={i} className="text-[11px] text-[#C9A84C] flex gap-1.5 leading-relaxed">
                          <span className="shrink-0 text-amber-500/60">→</span>{n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={() => { setPanel('chat'); sendChat(`I just generated a script: "${genResult.title}". Can you help me understand how to configure it?`); }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors text-center py-1">
                  Ask Pilot about this script →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ boxShadow: '0 0 0 4px rgba(99,102,241,0.2), 0 8px 30px rgba(99,102,241,0.15)' }}
        aria-label={open ? 'Close Pilot' : 'Open Pilot'}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <span className="text-xl select-none" role="img" aria-label="Pilot">👨‍✈️</span>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-ping-slow" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
        )}
      </button>
    </>
  );
}

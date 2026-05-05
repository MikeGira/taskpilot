'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, ChevronDown, Wand2, MessageSquare, Download, Copy, Check, ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { cn, copyToClipboard, downloadTextFile, buildDownloadContent } from '@/lib/utils';
import type { GenerateResult } from '@/app/api/generate/route';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Message { role: 'user' | 'assistant'; content: string; }
type Panel = 'chat' | 'generate';
type GenStep = 'os' | 'env' | 'tool' | 'task' | 'clarify' | 'loading' | 'result';

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
const TOOL_CATEGORIES_PILOT = [
  { label: 'Scripting', tools: [
    { id: 'powershell',        label: 'PowerShell',        emoji: '❯_' },
    { id: 'bash',              label: 'Bash / Shell',       emoji: '$_' },
    { id: 'python',            label: 'Python',             emoji: '🐍' },
  ]},
  { label: 'IaC', tools: [
    { id: 'terraform',         label: 'Terraform',          emoji: '🏗' },
    { id: 'pulumi',            label: 'Pulumi',             emoji: '🔷' },
    { id: 'aws-cdk',           label: 'AWS CDK',            emoji: '☁' },
    { id: 'azure-bicep',       label: 'Azure Bicep',        emoji: '🔵' },
    { id: 'arm-templates',     label: 'ARM Templates',      emoji: '{}' },
    { id: 'packer',            label: 'Packer',             emoji: '📦' },
  ]},
  { label: 'Config Management', tools: [
    { id: 'ansible',           label: 'Ansible',            emoji: '📋' },
    { id: 'puppet',            label: 'Puppet',             emoji: '🎭' },
  ]},
  { label: 'CI/CD & GitOps', tools: [
    { id: 'github-actions',    label: 'GitHub Actions',     emoji: '⚙' },
    { id: 'gitlab-ci',         label: 'GitLab CI',          emoji: '🦊' },
    { id: 'jenkins',           label: 'Jenkins',            emoji: '🔧' },
    { id: 'azure-devops',      label: 'Azure DevOps',       emoji: '🔵' },
    { id: 'argocd',            label: 'ArgoCD',             emoji: '🔄' },
  ]},
  { label: 'Containers', tools: [
    { id: 'docker',            label: 'Docker',             emoji: '🐳' },
    { id: 'kubernetes',        label: 'K8s / Helm',         emoji: '☸' },
  ]},
  { label: 'Security', tools: [
    { id: 'cis-hardening',     label: 'CIS Hardening',      emoji: '🛡' },
    { id: 'vault',             label: 'Vault',              emoji: '🔑' },
    { id: 'security-scanning', label: 'Sec Scanning',       emoji: '🔍' },
  ]},
  { label: 'AI / ML', tools: [
    { id: 'mlops',             label: 'AI/ML Ops',          emoji: '🧠' },
    { id: 'langchain',         label: 'LangChain/RAG',      emoji: '🤖' },
  ]},
  { label: 'Monitoring', tools: [
    { id: 'prometheus-grafana', label: 'Prometheus',        emoji: '📊' },
    { id: 'elk-stack',          label: 'ELK Stack',         emoji: '📈' },
  ]},
  { label: 'Database', tools: [
    { id: 'database-admin',    label: 'DB Admin',           emoji: '🗄' },
  ]},
  { label: 'Network', tools: [
    { id: 'network-automation', label: 'Network Auto',      emoji: '🌐' },
  ]},
];
const TOOL_OPTS = TOOL_CATEGORIES_PILOT.flatMap((c) => c.tools);
const CLOUD_PROVIDER_OPTS = [
  { id: 'AWS',          label: 'AWS'          },
  { id: 'Azure',        label: 'Azure'        },
  { id: 'GCP',          label: 'GCP'          },
  { id: 'DigitalOcean', label: 'DigitalOcean' },
  { id: 'Linode',       label: 'Linode'       },
  { id: 'Supabase',     label: 'Supabase'     },
];
const GEN_EXAMPLES = [
  'Onboard a new employee create AD account, assign groups, set temp password',
  'Offboard a departing employee disable account, revoke access, archive data',
  'Provision a new laptop join domain, install software, configure settings',
  'Decommission an old device backup data, wipe disk, remove from inventory',
  'Run a monthly user access review and export to CSV',
  'Monitor disk space and alert when drives fall below 15%',
  'Auto-disable accounts inactive for 90 days with audit report',
  'Restart failed services automatically and log each event',
];

const WELCOME = "Hey, I'm Pilot 👨‍✈️ your TaskPilot co-pilot. I can answer questions about the platform or generate a custom script for you. What do you need?";
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
    .replace(/\s*[—–]\s*/g, ', ')
    // Collapse excess blank lines
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
  const [genTool, setGenTool] = useState('');
  const [genTask, setGenTask] = useState('');
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genCopied, setGenCopied] = useState(false);
  const [genCloudProviders, setGenCloudProviders] = useState<string[]>([]);
  const [genClarifyQuestion, setGenClarifyQuestion] = useState('');
  const [genClarifyAnswer, setGenClarifyAnswer] = useState('');
  const [genError, setGenError] = useState('');
  const [genFeedbackRating, setGenFeedbackRating] = useState<1 | -1 | null>(null);
  const [genFeedbackComment, setGenFeedbackComment] = useState('');
  const [genFeedbackSubmitted, setGenFeedbackSubmitted] = useState(false);
  const [genFeedbackSubmitting, setGenFeedbackSubmitting] = useState(false);

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
  async function runGenerate(clarificationAnswer?: string) {
    setGenStep('loading');
    setGenResult(null);
    setGenError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          os: genOs,
          environment: genEnv,
          cloudProviders: genCloudProviders.length > 0 ? genCloudProviders : undefined,
          tool: genTool || undefined,
          taskDescription: genTask,
          clarificationAnswer,
          previousQuestion: clarificationAnswer ? genClarifyQuestion : undefined,
        }),
      });
      const data: GenerateResult & { error?: string } = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? 'Generation failed. Please try again.');
        setGenStep('task');
        return;
      }
      if (data.needsClarification && data.question) {
        setGenClarifyQuestion(data.question);
        setGenClarifyAnswer('');
        setGenStep('clarify');
        return;
      }
      setGenResult(data);
      setGenStep('result');
    } catch {
      setGenError('Network error. Please try again.');
      setGenStep('task');
    }
  }

  function toggleGenCloud(id: string) {
    setGenCloudProviders(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function resetGenerate() {
    setGenStep('os');
    setGenOs('');
    setGenEnv('');
    setGenTool('');
    setGenCloudProviders([]);
    setGenTask('');
    setGenResult(null);
    setGenCopied(false);
    setGenClarifyQuestion('');
    setGenClarifyAnswer('');
    setGenError('');
    setGenFeedbackRating(null);
    setGenFeedbackComment('');
    setGenFeedbackSubmitted(false);
    setGenFeedbackSubmitting(false);
  }

  async function submitGenFeedback(rating: 1 | -1) {
    if (genFeedbackSubmitted || genFeedbackSubmitting) return;
    setGenFeedbackRating(rating);
    setGenFeedbackSubmitting(true);
    try {
      await fetch('/api/generate/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          os: genOs,
          environment: genEnv,
          language: genResult?.language ?? undefined,
          rating,
          comment: genFeedbackComment.trim() || undefined,
        }),
      });
    } catch { /* non-fatal */ }
    setGenFeedbackSubmitting(false);
    setGenFeedbackSubmitted(true);
  }

  async function copyScript() {
    if (!genResult?.script) return;
    await copyToClipboard(genResult.script);
    setGenCopied(true);
    setTimeout(() => setGenCopied(false), 2500);
  }

  function downloadScript() {
    if (!genResult?.script) return;
    downloadTextFile(buildDownloadContent(genResult), genResult.filename ?? 'script.txt');
  }

  const showStarters = messages.length <= 1 && !chatLoading;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        // Position: above trigger button, full-width on mobile, 400px on desktop
        'fixed bottom-[88px] right-2 left-2 sm:left-auto sm:right-6 z-50',
        'sm:w-[400px]',
        // Height: caps at viewport height minus space for trigger + safe area
        'flex flex-col rounded-2xl border border-indigo-500/50',
        'shadow-2xl shadow-black/80 shadow-indigo-950/40',
        'transition-all duration-300 ease-out origin-bottom-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      )}
      style={{
        background: '#0f0f20',
        maxHeight: 'min(580px, calc(100dvh - 104px))',
      }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 bg-indigo-950/20 rounded-t-2xl shrink-0">
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
        <div className="flex border-b border-white/15 shrink-0">
          {(['chat', 'generate'] as Panel[]).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                panel === p ? 'text-white border-b-2 border-indigo-500' : 'text-[#A0A0A0] hover:text-[#ccc]'
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
                  <p className="text-[10px] text-[#A0A0A0] px-1 uppercase tracking-wider font-medium">Quick questions</p>
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
            <div className="p-3 border-t border-white/15 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }} className="flex gap-2">
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Pilot anything…"
                  className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(99,102,241,0.35)', fontSize: '16px' }}
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
                <p className="text-[11px] text-[#A0A0A0] mb-4">Determines the scripting language used.</p>
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
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-3">
                <button onClick={() => setGenStep('os')} className="flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white transition-colors w-fit">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">What&apos;s your environment?</p>
                  <p className="text-[11px] text-[#A0A0A0]">Determines which tools and APIs the script uses.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ENV_OPTS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { setGenEnv(e.id); setGenCloudProviders([]); }}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-sm font-medium text-white transition-all',
                        genEnv === e.id
                          ? 'border-indigo-500/60 bg-indigo-950/40'
                          : 'border-white/10 bg-white/3 hover:border-indigo-500/40 hover:bg-indigo-950/30'
                      )}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>

                {/* Cloud providers — shown for Cloud / Hybrid / Multi-Cloud */}
                {genEnv && genEnv !== 'on-premises' && (
                  <div>
                    <p className="text-[10px] text-[#aaa] mb-2 uppercase tracking-wider">
                      Cloud providers <span className="normal-case text-[#9CA3AF]">(select all that apply)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {CLOUD_PROVIDER_OPTS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => toggleGenCloud(c.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                            genCloudProviders.includes(c.id)
                              ? 'border-indigo-500/50 bg-indigo-950/50 text-indigo-300'
                              : 'border-white/10 bg-white/3 text-[#9CA3AF] hover:border-white/20 hover:text-white'
                          )}
                        >
                          {genCloudProviders.includes(c.id) && <span className="mr-1 text-emerald-400">✓</span>}
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Continue — visible once an environment is selected */}
                {genEnv && (
                  <button
                    onClick={() => setGenStep('tool')}
                    className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Continue
                  </button>
                )}
              </div>
            )}

            {/* STEP: Tool */}
            {genStep === 'tool' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-2">
                <button onClick={() => setGenStep('env')} className="flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white transition-colors w-fit mb-1">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <p className="text-xs font-semibold text-white mb-0.5">What tool or language?</p>
                <p className="text-[11px] text-[#A0A0A0] mb-2">Determines script format and best practices applied.</p>
                {TOOL_CATEGORIES_PILOT.map((cat) => (
                  <div key={cat.label} className="mb-3">
                    <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.tools.map((t) => (
                        <button key={t.id} onClick={() => { setGenTool(t.id); setGenStep('task'); }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium text-white transition-all',
                            genTool === t.id
                              ? 'border-indigo-500/60 bg-indigo-950/40'
                              : 'border-white/10 bg-white/3 hover:border-indigo-500/40 hover:bg-indigo-950/30'
                          )}>
                          <span className="text-sm">{t.emoji}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP: Task */}
            {genStep === 'task' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-3">
                <button onClick={() => setGenStep('tool')} className="flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white transition-colors w-fit">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">What do you want to automate?</p>
                  <p className="text-[11px] text-[#A0A0A0]">Describe in plain English. More detail = better script.</p>
                </div>
                <textarea
                  value={genTask}
                  onChange={(e) => setGenTask(e.target.value)}
                  placeholder="e.g. Offboard a leaving employee disable their AD account, remove from all groups, archive their home folder, and send a report to HR..."
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl text-white placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 p-3 leading-relaxed"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(99,102,241,0.35)', fontSize: '16px' }}
                />
                <div>
                  <p className="text-[10px] text-[#aaa] mb-1.5 uppercase tracking-wider">Examples</p>
                  <div className="flex flex-col gap-1">
                    {GEN_EXAMPLES.slice(0, 4).map((ex) => (
                      <button key={ex} onClick={() => setGenTask(ex)}
                        className="text-left text-[11px] text-[#9CA3AF] hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors truncate">
                        → {ex}
                      </button>
                    ))}
                  </div>
                </div>
                {genError && (
                  <p className="text-[11px] text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">{genError}</p>
                )}
                <button
                  onClick={() => runGenerate()}
                  disabled={genTask.trim().length < 10}
                  className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-all active:scale-95"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate Script
                </button>
              </div>
            )}

            {/* STEP: Clarify */}
            {genStep === 'clarify' && (
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hidden flex flex-col gap-3">
                <button onClick={() => setGenStep('task')} className="flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white transition-colors w-fit">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3 flex gap-2">
                  <Wand2 className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-[#E4E4E7] leading-relaxed">{genClarifyQuestion}</p>
                </div>
                <textarea
                  value={genClarifyAnswer}
                  onChange={(e) => setGenClarifyAnswer(e.target.value)}
                  placeholder="Your answer…"
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl text-white placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 p-3 leading-relaxed"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(99,102,241,0.35)', fontSize: '16px' }}
                  autoFocus
                />
                <button
                  onClick={() => runGenerate(genClarifyAnswer.trim())}
                  disabled={!genClarifyAnswer.trim()}
                  className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-all active:scale-95"
                >
                  <Wand2 className="h-4 w-4" />
                  Answer &amp; Generate
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
                  <p className="text-xs text-[#A0A0A0] mt-1">Adding error handling, logging & config section</p>
                </div>
              </div>
            )}

            {/* STEP: Result */}
            {genStep === 'result' && genResult && (
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── Sticky header: title + New script ── */}
                <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/8 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{genResult.title ?? 'Script ready'}</p>
                    {genResult.explanation && (
                      <p className="text-[11px] text-[#9CA3AF] leading-relaxed mt-0.5 line-clamp-1">{genResult.explanation}</p>
                    )}
                  </div>
                  <button onClick={resetGenerate} className="text-[11px] text-indigo-400 hover:text-indigo-300 shrink-0 whitespace-nowrap">New script</button>
                </div>

                {/* ── Sticky action bar: always visible Copy + Download ── */}
                {genResult.script ? (
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/[0.02]">
                    <span className="text-[11px] font-mono text-[#9CA3AF] flex-1 truncate">{genResult.filename ?? 'script'}</span>
                    <button onClick={copyScript} className={cn(
                      'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors',
                      genCopied
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                        : 'border-white/20 bg-white/5 text-[#ccc] hover:border-white/30 hover:text-white hover:bg-white/10'
                    )}>
                      {genCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {genCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={downloadScript} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md border border-indigo-500/30 bg-indigo-950/30 text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-950/50 hover:text-white transition-colors">
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 px-4 py-3 border-b border-white/8 flex items-center gap-2">
                    <p className="text-[11px] text-[#9CA3AF] flex-1">Script could not be extracted. Add more detail and try again.</p>
                    <button onClick={resetGenerate} className="text-[11px] text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" /> Retry
                    </button>
                  </div>
                )}

                {/* ── Scrollable body: script preview + config notes ── */}
                <div className="flex-1 overflow-y-auto scrollbar-hidden flex flex-col gap-3 p-4">
                  {genResult.script && (
                    <pre className="overflow-auto rounded-xl border border-white/10 p-3 text-[11px] text-[#C9D1D9] font-mono leading-relaxed scrollbar-hidden max-h-[200px]">
                      <code>{genResult.script}</code>
                    </pre>
                  )}

                  {genResult.script && genResult.configNotes && genResult.configNotes.length > 0 && (
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

                  {genResult.script && (
                    <button
                      onClick={() => { setPanel('chat'); sendChat(`I just generated a script: "${genResult.title ?? genResult.filename ?? 'a custom IT script'}". Can you help me understand how to configure it?`); }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors text-center py-1"
                    >
                      Ask Pilot about this script →
                    </button>
                  )}

                  {/* Feedback */}
                  {genResult.script && (
                    genFeedbackSubmitted ? (
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <p className="text-[11px] text-[#9CA3AF]">Thanks, your feedback helps improve the AI.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/3 p-3">
                        <p className="text-[10px] text-[#666] mb-2 uppercase tracking-wider">Was this script useful?</p>
                        {genFeedbackRating === null && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitGenFeedback(1)}
                              disabled={genFeedbackSubmitting}
                              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg border border-white/15 bg-white/4 text-[#ccc] hover:border-emerald-500/40 hover:bg-emerald-950/30 hover:text-emerald-400 transition-colors disabled:opacity-40"
                            >
                              <ThumbsUp className="h-3 w-3" /> Worked great
                            </button>
                            <button
                              onClick={() => setGenFeedbackRating(-1)}
                              disabled={genFeedbackSubmitting}
                              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg border border-white/15 bg-white/4 text-[#ccc] hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              <ThumbsDown className="h-3 w-3" /> Needs work
                            </button>
                          </div>
                        )}
                        {genFeedbackRating === -1 && (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={genFeedbackComment}
                              onChange={(e) => setGenFeedbackComment(e.target.value)}
                              placeholder="What went wrong? (optional)"
                              rows={2}
                              className="w-full rounded-lg text-[11px] text-white placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 p-2 leading-relaxed"
                              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(99,102,241,0.25)', fontSize: '16px' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitGenFeedback(-1)}
                                disabled={genFeedbackSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
                              >
                                {genFeedbackSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                                Submit
                              </button>
                              <button
                                onClick={() => setGenFeedbackRating(null)}
                                disabled={genFeedbackSubmitting}
                                className="text-[11px] text-[#666] hover:text-[#9CA3AF] px-3 transition-colors disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pilot.svg" alt="Pilot" width={36} height={36} className="h-9 w-9 object-cover rounded-full" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-ping-slow" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
        )}
      </button>
    </>
  );
}

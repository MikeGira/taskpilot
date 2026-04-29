'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Monitor, Terminal, Apple, Layers, Server, GitMerge, Cloud,
  ArrowRight, ArrowLeft, Wand2, Copy, Download, CheckCircle2,
  RefreshCw, Loader2, AlertCircle, Check, ChevronRight, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { cn, copyToClipboard, downloadTextFile } from '@/lib/utils';
import type { GenerateResult } from '@/app/api/generate/route';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'os' | 'environment' | 'task' | 'generating' | 'clarify' | 'result';

interface OS { id: string; label: string; desc: string; icon: React.ElementType; color: string; accent: string; }
interface Env { id: string; label: string; desc: string; icon: React.ElementType; color: string; accent: string; }
interface Cloud { id: string; label: string; short: string; }

// ── Data ─────────────────────────────────────────────────────────────────────

const OS_OPTIONS: OS[] = [
  { id: 'windows',        label: 'Windows',        desc: 'Server 2016–2022 · Windows 10/11 · PowerShell', icon: Monitor,  color: 'border-blue-500/60   bg-blue-500/20   hover:border-blue-400     hover:bg-blue-500/30',   accent: 'text-blue-300'   },
  { id: 'linux',          label: 'Linux',          desc: 'Ubuntu · RHEL/CentOS · Debian · Amazon Linux',  icon: Terminal, color: 'border-yellow-500/60 bg-yellow-500/20 hover:border-yellow-400   hover:bg-yellow-500/30', accent: 'text-yellow-300' },
  { id: 'macos',          label: 'macOS',          desc: 'macOS 12+ · Admin or MDM managed',              icon: Apple,    color: 'border-zinc-400/60   bg-zinc-400/15   hover:border-zinc-300     hover:bg-zinc-400/25',   accent: 'text-zinc-200'   },
  { id: 'cross-platform', label: 'Cross-Platform', desc: 'Works on Windows, Linux & macOS · Python',      icon: Layers,   color: 'border-violet-500/60 bg-violet-500/20 hover:border-violet-400   hover:bg-violet-500/30', accent: 'text-violet-300' },
];

const ENV_OPTIONS: Env[] = [
  { id: 'on-premises', label: 'On-Premises', desc: 'Active Directory · Local servers · No cloud', icon: Server,   color: 'border-indigo-500/60  bg-indigo-500/20  hover:border-indigo-400   hover:bg-indigo-500/30',  accent: 'text-indigo-300'  },
  { id: 'hybrid',      label: 'Hybrid',      desc: 'On-prem + cloud · Best of both worlds',       icon: GitMerge, color: 'border-cyan-500/60    bg-cyan-500/20    hover:border-cyan-400     hover:bg-cyan-500/30',    accent: 'text-cyan-300'    },
  { id: 'cloud',       label: 'Cloud',       desc: 'AWS · Azure · GCP · Fully managed',           icon: Cloud,    color: 'border-emerald-500/60 bg-emerald-500/20 hover:border-emerald-400  hover:bg-emerald-500/30', accent: 'text-emerald-300' },
  { id: 'multi-cloud', label: 'Multi-Cloud', desc: 'Multiple providers · Complex infrastructure', icon: Layers,   color: 'border-amber-500/60   bg-amber-500/20   hover:border-amber-400    hover:bg-amber-500/30',   accent: 'text-amber-300'   },
];

const CLOUD_PROVIDERS: Cloud[] = [
  { id: 'AWS', label: 'Amazon Web Services', short: 'AWS' },
  { id: 'Azure', label: 'Microsoft Azure', short: 'Azure' },
  { id: 'GCP', label: 'Google Cloud', short: 'GCP' },
  { id: 'DigitalOcean', label: 'DigitalOcean', short: 'DO' },
  { id: 'Linode', label: 'Akamai / Linode', short: 'Linode' },
  { id: 'Supabase', label: 'Supabase', short: 'Supabase' },
];

const TASK_EXAMPLES = [
  // User lifecycle
  'Onboard a new employee: create AD account, assign groups, set temp password, email HR',
  'Offboard a departing employee: disable account, remove from all groups, archive home folder',
  'Run a monthly user access review and export stale accounts to CSV',
  'Auto-disable accounts inactive for 90 days with full audit report',
  // Device lifecycle
  'Provision a new laptop: join domain, install approved software, apply GPO settings',
  'Decommission an old device: backup data, wipe disk, remove from AD and inventory',
  'Generate a device inventory report with OS version, last seen, and patch status',
  // Day-to-day automation
  'Monitor disk space on all servers and alert when below 15%',
  'Auto-restart a failed Windows service and log the event with timestamp',
  'Bulk-create user accounts from a CSV file with group assignments',
  'Generate a weekly security report of failed logins and locked accounts',
  'Sync files between two servers on a nightly schedule',
];

const LOADING_MESSAGES = [
  'Analyzing your environment…',
  'Selecting the right scripting approach…',
  'Writing error handlers and logging…',
  'Adding safety checks…',
  'Finalizing your script…',
];

const LANG_LABELS: Record<string, string> = {
  powershell: 'PowerShell',
  bash: 'Bash',
  python: 'Python',
  zsh: 'Zsh',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i < current ? 'bg-white flex-1' : i === current ? 'bg-white/40 flex-[2]' : 'bg-white/10 flex-1'
          )}
        />
      ))}
    </div>
  );
}

function SelectionCard<T extends { id: string; label: string; desc: string; icon: React.ElementType; color: string; accent: string }>({
  option, selected, onClick,
}: { option: T; selected: boolean; onClick: () => void }) {
  const Icon = option.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-left rounded-xl border p-5 transition-all duration-200 group cursor-pointer',
        option.color,
        selected && 'ring-2 ring-white/30 ring-offset-2 ring-offset-[#000000]'
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-white flex items-center justify-center">
          <Check className="h-3 w-3 text-black" />
        </div>
      )}
      <Icon className={cn('h-6 w-6 mb-3', option.accent)} />
      <div className="font-semibold text-[#F9FAFB] mb-1">{option.label}</div>
      <div className="text-xs text-[#6B7280] leading-relaxed">{option.desc}</div>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 min-w-[80px]">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

function ScriptBlock({ script, filename, language, locked = false }: {
  script: string; filename: string | null; language: string | null; locked?: boolean;
}) {
  const langLabel = language ? (LANG_LABELS[language] ?? language) : 'Script';
  const displayScript = locked ? script.split('\n').slice(0, 18).join('\n') : script;
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-white/5" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-white/5" />
          </div>
          <span className="text-xs text-[#6B7280] ml-2 font-mono">{filename ?? 'script'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#4B5563] border border-white/10 px-2 py-0.5 rounded">{langLabel}</span>
          {!locked && <CopyButton text={script} />}
        </div>
      </div>
      <div className="relative">
        <pre className={cn(
          'p-5 text-sm text-[#E2E8F0] font-mono leading-relaxed scrollbar-hidden',
          locked ? 'overflow-hidden max-h-[200px] select-none' : 'overflow-x-auto max-h-[480px] overflow-y-auto'
        )}>
          <code>{displayScript}</code>
        </pre>
        {locked && (
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col items-center justify-end pb-5 gap-1.5">
            <p className="text-sm font-semibold text-[#F9FAFB]">Pro script: upgrade to unlock</p>
            <p className="text-xs text-[#6B7280]">Copy, download and save to history with Pro</p>
            <Button asChild size="sm" className="mt-1">
              <a href="/checkout">Upgrade to Pro, $12/mo</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function GeneratorWizard({ initialTask = '' }: { initialTask?: string }) {
  // When arriving from a kit card, the task is pre-filled — start on OS step still
  // so user can pick their OS/env, but task textarea will be pre-populated
  const [step, setStep] = useState<Step>('os');
  const [os, setOs] = useState('');
  const [env, setEnv] = useState('');
  const [cloudProviders, setCloudProviders] = useState<string[]>([]);
  const [task, setTask] = useState(initialTask);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(0);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    if (step === 'generating') {
      setLoadingMsg(0);
      loadingRef.current = setInterval(() => {
        setLoadingMsg((m) => (m + 1) % LOADING_MESSAGES.length);
      }, 1800);
    } else {
      if (loadingRef.current) clearInterval(loadingRef.current);
    }
    return () => { if (loadingRef.current) clearInterval(loadingRef.current); };
  }, [step]);

  function toggleCloud(id: string) {
    setCloudProviders((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function generate(clarificationAnswer?: string, previousQuestion?: string) {
    setStep('generating');
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          os,
          environment: env,
          cloudProviders: cloudProviders.length > 0 ? cloudProviders : undefined,
          taskDescription: task,
          clarificationAnswer,
          previousQuestion,
        }),
      });
      const data: GenerateResult & { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.');
        setStep('task');
        return;
      }

      if (data.needsClarification && data.question) {
        setResult(data);
        setStep('clarify');
      } else {
        setResult(data);
        setStep('result');
      }
    } catch {
      setError('Network error. Please try again.');
      setStep('task');
    }
  }

  async function submitFeedback(rating: 1 | -1) {
    if (feedbackSubmitted || feedbackSubmitting) return;
    setFeedbackRating(rating);
    setFeedbackSubmitting(true);
    try {
      await fetch('/api/generate/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          os,
          environment: env,
          language: result?.language ?? undefined,
          rating,
          comment: feedbackComment.trim() || undefined,
        }),
      });
    } catch {
      // Feedback is non-critical — fail silently
    } finally {
      setFeedbackSubmitted(true);
      setFeedbackSubmitting(false);
    }
  }

  function reset() {
    setStep('os');
    setOs('');
    setEnv('');
    setCloudProviders([]);
    setTask('');
    setClarifyAnswer('');
    setResult(null);
    setError('');
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setFeedbackSubmitting(false);
  }

  const needsCloud = env === 'cloud' || env === 'hybrid' || env === 'multi-cloud';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* Step: OS selection */}
      {step === 'os' && (
        <div className="animate-slide-up">
          <StepIndicator current={0} total={3} />
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">What OS are you targeting?</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">This determines the scripting language and available tools.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {OS_OPTIONS.map((o) => (
              <SelectionCard
                key={o.id}
                option={o}
                selected={os === o.id}
                onClick={() => { setOs(o.id); setStep('environment'); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step: Environment selection */}
      {step === 'environment' && (
        <div className="animate-slide-up">
          <StepIndicator current={1} total={3} />
          <button onClick={() => setStep('os')} className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/8 hover:bg-white/14 border border-white/20 rounded-full px-3 py-1.5 mb-5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">What&apos;s your environment?</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">This determines which tools and APIs the script uses.</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {ENV_OPTIONS.map((e) => (
              <SelectionCard
                key={e.id}
                option={e}
                selected={env === e.id}
                onClick={() => setEnv(e.id)}
              />
            ))}
          </div>

          {/* Cloud provider sub-selection */}
          {needsCloud && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-5">
              <p className="text-sm font-medium text-[#9CA3AF] mb-3">
                Which cloud provider(s)? <span className="text-[#4B5563]">(select all that apply)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {CLOUD_PROVIDERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCloud(c.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150',
                      cloudProviders.includes(c.id)
                        ? 'border-white/12 bg-white/5 text-zinc-300'
                        : 'border-white/10 bg-white/4 text-[#9CA3AF] hover:border-white/20 hover:bg-white/8'
                    )}
                  >
                    {cloudProviders.includes(c.id) && <span className="mr-1">✓</span>}
                    {c.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => { if (env) setStep('task'); }}
            disabled={!env}
            size="lg"
            className="w-full"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step: Task description */}
      {step === 'task' && (
        <div className="animate-slide-up">
          <StepIndicator current={2} total={3} />
          <button onClick={() => setStep('environment')} className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/8 hover:bg-white/14 border border-white/20 rounded-full px-3 py-1.5 mb-5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">What do you want to automate?</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">
            Describe the task in plain English. Be specific: the more detail you give, the better the script.
          </p>

          <div className="mb-4">
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. I want to automatically disable user accounts that haven't logged in for 90 days and send an email to IT with the list of disabled accounts."
              rows={5}
              maxLength={2000}
              className="resize-none text-base sm:text-sm"
              style={{ fontSize: 'max(16px, 1rem)' }}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1.5">
              {error && (
                <p className="text-xs text-white flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{error}
                </p>
              )}
              <span className="text-xs text-[#4B5563] ml-auto">{task.length}/2000</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-[#6B7280] mb-2 font-medium">Need inspiration?</p>
            <div className="flex flex-wrap gap-2">
              {TASK_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTask(ex)}
                  className="text-xs px-2.5 py-1 rounded-md border border-white/8 bg-white/4 text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-white/15 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => generate()}
            disabled={task.trim().length < 10}
            size="lg"
            className="w-full"
          >
            <Wand2 className="h-4 w-4" />
            Generate Script
          </Button>
        </div>
      )}

      {/* Step: Generating (loading) */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative mb-8">
            <div className="h-20 w-20 rounded-full border-2 border-white/12 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-t-red-400 border-white/12 animate-spin" />
            </div>
            <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-[#F9FAFB] mb-2">Generating your script…</h2>
          <p className="text-sm text-[#9CA3AF] transition-all duration-500 min-h-[20px]">
            {LOADING_MESSAGES[loadingMsg]}
          </p>
        </div>
      )}

      {/* Step: Clarification needed */}
      {step === 'clarify' && result?.question && (
        <div className="animate-slide-up">
          <StepIndicator current={2} total={3} />
          <div className="rounded-xl border border-white/12 bg-white/5 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <Wand2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">One quick question</p>
                <p className="text-sm text-[#F9FAFB] leading-relaxed">{result.question}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              placeholder="Your answer…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && clarifyAnswer.trim()) {
                  generate(clarifyAnswer.trim(), result.question!);
                }
              }}
            />
            <Button
              onClick={() => generate(clarifyAnswer.trim(), result.question!)}
              disabled={!clarifyAnswer.trim()}
              size="lg"
              className="w-full"
            >
              Answer & Generate Script <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="animate-slide-up space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {result.script
                  ? <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                  : <AlertCircle className="h-5 w-5 text-[#9CA3AF] shrink-0" />}
                <h2 className="font-bold text-[#F9FAFB]">
                  {result.script ? (result.title ?? 'Your script is ready') : 'Generation incomplete'}
                </h2>
              </div>
              {result.script && result.explanation && (
                <p className="text-sm text-[#9CA3AF] leading-relaxed pl-7">{result.explanation}</p>
              )}
              {!result.script && (
                <p className="text-sm text-[#9CA3AF] leading-relaxed pl-7 mt-1">
                  The AI could not produce a complete script. Add more detail: specify the OS, exact tools or systems involved, and what each step should do.
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> {result.script ? 'New' : 'Try again'}
            </Button>
          </div>

          {/* Script */}
          {result.script && (
            <ScriptBlock script={result.script} filename={result.filename} language={result.language} />
          )}

          {/* Config notes */}
          {result.configNotes && result.configNotes.length > 0 && (
            <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/6 p-4">
              <p className="text-xs font-semibold text-yellow-400 mb-2.5 uppercase tracking-wider">
                Before you run this script
              </p>
              <ul className="space-y-1.5">
                {result.configNotes.map((note, i) => (
                  <li key={i} className="text-xs text-[#D1D5DB] flex items-start gap-2">
                    <span className="text-yellow-500/70 mt-0.5 shrink-0">→</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback */}
          {feedbackSubmitted ? (
            <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
              <p className="text-sm text-[#D1D5DB]">Thanks, your feedback helps improve the AI.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/2 p-4">
              <p className="text-xs font-medium text-[#9CA3AF] mb-3">Did this script work for you?</p>
              {feedbackRating === null && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submitFeedback(1)}
                    disabled={feedbackSubmitting}
                    className="gap-1.5 flex-1"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Worked great
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedbackRating(-1)}
                    disabled={feedbackSubmitting}
                    className="gap-1.5 flex-1"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Needs work
                  </Button>
                </div>
              )}
              {feedbackRating === -1 && (
                <div className="space-y-3">
                  <Textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="What went wrong? (optional, helps improve the AI)"
                    rows={2}
                    maxLength={500}
                    className="resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => submitFeedback(-1)}
                      disabled={feedbackSubmitting}
                      className="gap-1.5"
                    >
                      {feedbackSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Submit Feedback
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFeedbackRating(null)}
                      disabled={feedbackSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                if (!result.script) return;
                downloadTextFile(result.script, result.filename ?? 'script.txt');
              }}
              disabled={!result.script}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download {result.filename ?? 'script'}
            </Button>
            <Button onClick={reset} variant="ghost" className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Generate another
            </Button>
          </div>

          {/* Upsell */}
          <div className="rounded-xl border border-white/12 bg-white/5 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#F9FAFB] mb-0.5">Want 4 ready-to-deploy scripts?</p>
              <p className="text-xs text-[#9CA3AF]">The Starter Kit includes pre-tested scripts for the most common IT tasks, just $19.</p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <a href="/checkout">Get the Kit →</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

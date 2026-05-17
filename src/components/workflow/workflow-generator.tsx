'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LivePill } from '@/components/ui/live-pill';
import {
  Webhook, Clock, Play, Mail, FormInput, Database,
  ArrowRight, ArrowLeft, Wand2, Copy, Download, CheckCircle2,
  RefreshCw, Loader2, AlertCircle, Check, ChevronRight,
  ThumbsUp, ThumbsDown, Zap,
} from 'lucide-react';
import { cn, copyToClipboard, downloadTextFile } from '@/lib/utils';
import type { WorkflowResult } from '@/app/api/workflow/generate/route';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'trigger' | 'integrations' | 'describe' | 'generating' | 'clarify' | 'result';

interface Trigger { id: string; label: string; desc: string; icon: React.ElementType; color: string; accent: string; }
interface Integration { id: string; label: string; color: string; }
interface Complexity { id: string; label: string; desc: string; nodes: string; }

// ── Data ──────────────────────────────────────────────────────────────────────

const TRIGGERS: Trigger[] = [
  { id: 'webhook',  label: 'Webhook',  desc: 'Triggered by an incoming HTTP request',     icon: Webhook,    color: 'border-violet-500/60 bg-violet-500/10 hover:border-violet-400 hover:bg-violet-500/20', accent: 'text-violet-400' },
  { id: 'schedule', label: 'Schedule', desc: 'Runs on a cron interval (e.g. daily 9 am)', icon: Clock,      color: 'border-blue-500/60   bg-blue-500/10   hover:border-blue-400   hover:bg-blue-500/20',   accent: 'text-blue-400'   },
  { id: 'manual',   label: 'Manual',   desc: 'Click "Execute" in n8n to run',             icon: Play,       color: 'border-white/20      bg-white/5       hover:border-white/35   hover:bg-white/8',        accent: 'text-white'      },
  { id: 'email',    label: 'Email',    desc: 'Fires when a new email arrives',             icon: Mail,       color: 'border-cyan-500/60   bg-cyan-500/10   hover:border-cyan-400   hover:bg-cyan-500/20',   accent: 'text-cyan-400'   },
  { id: 'form',     label: 'Form',     desc: 'Triggered by a web form submission',         icon: FormInput,  color: 'border-emerald-500/60 bg-emerald-500/10 hover:border-emerald-400 hover:bg-emerald-500/20', accent: 'text-emerald-400' },
  { id: 'database', label: 'Database', desc: 'Reacts to new or changed database rows',    icon: Database,   color: 'border-amber-500/60  bg-amber-500/10  hover:border-amber-400  hover:bg-amber-500/20',  accent: 'text-amber-400'  },
];

const INTEGRATIONS: Integration[] = [
  { id: 'Slack',           label: 'Slack',          color: 'hover:border-amber-400/60   hover:text-amber-300'    },
  { id: 'Gmail',           label: 'Gmail',          color: 'hover:border-red-400/60     hover:text-red-300'      },
  { id: 'Notion',          label: 'Notion',         color: 'hover:border-white/50       hover:text-white'        },
  { id: 'GitHub',          label: 'GitHub',         color: 'hover:border-white/50       hover:text-white'        },
  { id: 'Stripe',          label: 'Stripe',         color: 'hover:border-violet-400/60  hover:text-violet-300'   },
  { id: 'PostgreSQL',      label: 'PostgreSQL',     color: 'hover:border-blue-400/60    hover:text-blue-300'     },
  { id: 'Supabase',        label: 'Supabase',       color: 'hover:border-emerald-400/60 hover:text-emerald-300'  },
  { id: 'HTTP Request',    label: 'HTTP Request',   color: 'hover:border-cyan-400/60    hover:text-cyan-300'     },
  { id: 'Claude AI',       label: 'Claude AI',      color: 'hover:border-orange-400/60  hover:text-orange-300'   },
  { id: 'Google Sheets',   label: 'Google Sheets',  color: 'hover:border-green-400/60   hover:text-green-300'    },
  { id: 'Airtable',        label: 'Airtable',       color: 'hover:border-yellow-400/60  hover:text-yellow-300'   },
  { id: 'Discord',         label: 'Discord',        color: 'hover:border-indigo-400/60  hover:text-indigo-300'   },
  { id: 'Microsoft Teams', label: 'Teams',          color: 'hover:border-blue-400/60    hover:text-blue-300'     },
  { id: 'Jira',            label: 'Jira',           color: 'hover:border-blue-500/60    hover:text-blue-300'     },
  { id: 'Trello',          label: 'Trello',         color: 'hover:border-blue-400/60    hover:text-blue-300'     },
  { id: 'HubSpot',         label: 'HubSpot',        color: 'hover:border-orange-400/60  hover:text-orange-300'   },
  { id: 'Salesforce',      label: 'Salesforce',     color: 'hover:border-sky-400/60     hover:text-sky-300'      },
  { id: 'Twilio',          label: 'Twilio',         color: 'hover:border-red-400/60     hover:text-red-300'      },
  { id: 'Telegram',        label: 'Telegram',       color: 'hover:border-cyan-400/60    hover:text-cyan-300'     },
  { id: 'WhatsApp',        label: 'WhatsApp',       color: 'hover:border-green-400/60   hover:text-green-300'    },
  { id: 'Linear',          label: 'Linear',         color: 'hover:border-violet-400/60  hover:text-violet-300'   },
  { id: 'Asana',           label: 'Asana',          color: 'hover:border-pink-400/60    hover:text-pink-300'     },
  { id: 'PagerDuty',       label: 'PagerDuty',      color: 'hover:border-green-400/60   hover:text-green-300'    },
  { id: 'Datadog',         label: 'Datadog',        color: 'hover:border-violet-400/60  hover:text-violet-300'   },
  { id: 'AWS S3',          label: 'AWS S3',         color: 'hover:border-orange-400/60  hover:text-orange-300'   },
  { id: 'Dropbox',         label: 'Dropbox',        color: 'hover:border-blue-400/60    hover:text-blue-300'     },
  { id: 'SendGrid',        label: 'SendGrid',       color: 'hover:border-blue-400/60    hover:text-blue-300'     },
  { id: 'Mailchimp',       label: 'Mailchimp',      color: 'hover:border-yellow-400/60  hover:text-yellow-300'   },
  { id: 'RSS Feed',        label: 'RSS Feed',       color: 'hover:border-orange-400/60  hover:text-orange-300'   },
  { id: 'Webhook Out',     label: 'Webhook Out',    color: 'hover:border-violet-400/60  hover:text-violet-300'   },
];

const COMPLEXITY_OPTIONS: Complexity[] = [
  { id: 'simple',   label: 'Simple',   desc: 'Linear flow, minimal branching',              nodes: '2–4 nodes'   },
  { id: 'standard', label: 'Standard', desc: 'Conditionals, transformations, error paths',  nodes: '5–10 nodes'  },
  { id: 'complex',  label: 'Complex',  desc: 'Multi-branch, AI-powered, multi-step logic',  nodes: '10–15 nodes' },
];

const TASK_EXAMPLES = [
  'When a new GitHub issue is labeled "urgent", post to Slack #alerts and create a Jira ticket',
  "Every morning at 9am, fetch yesterday's Stripe revenue and post a summary to Slack",
  'When a form is submitted, save to Google Sheets and send a confirmation email via Gmail',
  'When a new row appears in PostgreSQL, analyze it with Claude AI and update a Notion database',
  'Send a daily digest of new GitHub PRs to the team Slack channel',
  'When a Stripe payment fails, send a recovery email via SendGrid and log to Airtable',
  'Every hour, check RSS feed for new articles and post summaries to Discord',
  'When a user signs up, add to Mailchimp, send welcome email, and create a HubSpot contact',
];

const LOADING_MESSAGES = [
  'Mapping your workflow structure…',
  'Selecting the right n8n nodes…',
  'Building connections between nodes…',
  'Adding error handling branches…',
  'Finalizing your workflow…',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-500',
            i < current  ? 'bg-white flex-1' :
            i === current ? 'bg-white/60 flex-[2]' :
                            'bg-white/28 flex-1'
          )}
        />
      ))}
    </div>
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
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 min-w-[76px]">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

// ── Node Diagram Preview ──────────────────────────────────────────────────────

function NodeDiagramPreview({ workflow }: { workflow: Record<string, unknown> }) {
  const nodes = (workflow.nodes as { name?: string; type?: string }[]) ?? [];
  if (nodes.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/22 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Workflow nodes</p>
      <div className="flex flex-wrap gap-2">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/22 rounded-lg px-2.5 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/85 shrink-0" />
              <span className="text-xs text-[#E2E8F0] font-mono">{node.name ?? node.type?.split('.').pop() ?? `Node ${i + 1}`}</span>
            </div>
            {i < nodes.length - 1 && (
              <ChevronRight className="h-3 w-3 text-[#9CA3AF] shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function WorkflowGenerator() {
  const [step, setStep] = useState<Step>('trigger');
  const [triggerType, setTriggerType] = useState('');
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [complexity, setComplexity] = useState('standard');
  const [task, setTask] = useState('');
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [slowGen, setSlowGen] = useState(false);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowGenRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [pillVisible, setPillVisible] = useState(false);

  useEffect(() => {
    if (step === 'generating') {
      setLoadingMsg(0);
      setSlowGen(false);
      loadingRef.current = setInterval(() => setLoadingMsg((m) => (m + 1) % LOADING_MESSAGES.length), 1800);
      slowGenRef.current = setTimeout(() => setSlowGen(true), 14_000);
    } else {
      if (loadingRef.current) clearInterval(loadingRef.current);
      if (slowGenRef.current) clearTimeout(slowGenRef.current);
    }
    return () => {
      if (loadingRef.current) clearInterval(loadingRef.current);
      if (slowGenRef.current) clearTimeout(slowGenRef.current);
    };
  }, [step]);

  function toggleIntegration(id: string) {
    setSelectedIntegrations((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 8 ? [...prev, id] : prev
    );
  }

  async function generate(clarificationAnswer?: string, previousQuestion?: string) {
    setStep('generating');
    setError('');
    try {
      const res = await fetch('/api/workflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType,
          integrations: selectedIntegrations,
          complexity,
          taskDescription: task,
          clarificationAnswer,
          previousQuestion,
        }),
      });
      const data: WorkflowResult & { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.');
        setStep('describe');
        return;
      }

      if (data.needsClarification && data.question) {
        setResult(data);
        setStep('clarify');
      } else {
        setResult(data);
        setStep('result');
        setTimeout(() => setPillVisible(true), 600);
      }
    } catch {
      setError('Network error. Please try again.');
      setStep('describe');
    }
  }

  async function submitFeedback(rating: 1 | -1) {
    if (feedbackSubmitted || feedbackSubmitting) return;
    setFeedbackRating(rating);
    setFeedbackSubmitting(true);
    try {
      await fetch('/api/workflow/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType,
          integrations: selectedIntegrations,
          complexity,
          rating,
          comment: feedbackComment.trim() || undefined,
        }),
      });
    } catch { /* non-critical */ }
    finally {
      setFeedbackSubmitted(true);
      setFeedbackSubmitting(false);
    }
  }

  function reset() {
    setPillVisible(false);
    setStep('trigger');
    setTriggerType('');
    setSelectedIntegrations([]);
    setComplexity('standard');
    setTask('');
    setClarifyAnswer('');
    setResult(null);
    setError('');
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setFeedbackSubmitting(false);
  }

  const workflowJson = result?.workflow ? JSON.stringify(result.workflow, null, 2) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* ── Step: Trigger ──────────────────────────────────────────────────── */}
      {step === 'trigger' && (
        <div className="animate-slide-up">
          <StepIndicator current={0} total={3} />
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">How does the workflow start?</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">Choose the event that kicks off your automation.</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {TRIGGERS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => { setTriggerType(t.id); setStep('integrations'); }}
                  className={cn(
                    'card-lift relative w-full text-left rounded-xl border p-4 transition-colors duration-200 group',
                    t.color,
                    triggerType === t.id && 'ring-1 ring-white/20 ring-offset-1 ring-offset-black'
                  )}
                >
                  {triggerType === t.id && (
                    <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-black" />
                    </div>
                  )}
                  <Icon className={cn('h-5 w-5 mb-2.5', t.accent)} />
                  <div className="font-semibold text-[#F9FAFB] text-sm mb-0.5">{t.label}</div>
                  <div className="text-xs text-[#9CA3AF] leading-relaxed">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step: Integrations ─────────────────────────────────────────────── */}
      {step === 'integrations' && (
        <div className="animate-slide-up">
          <StepIndicator current={1} total={3} />
          <button type="button" onClick={() => setStep('trigger')} className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/8 hover:bg-white/14 border border-white/12 rounded-full px-3 py-1.5 mb-5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">Which apps do you need?</h2>
          <p className="text-sm text-[#9CA3AF] mb-1">Select up to 8 integrations. Skip if not sure.</p>
          {selectedIntegrations.length > 0 && (
            <p className="text-xs text-[#9CA3AF] mb-4">{selectedIntegrations.length}/8 selected</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-6">
            {INTEGRATIONS.map((i) => {
              const active = selectedIntegrations.includes(i.id);
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => toggleIntegration(i.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                    active
                      ? 'border-white/25 bg-white/10 text-white'
                      : cn('border-white/22 bg-white/6 text-[#C9CACB]', i.color),
                    !active && selectedIntegrations.length >= 8 && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {active && <span className="mr-1 text-emerald-400">✓</span>}
                  {i.label}
                </button>
              );
            })}
          </div>

          {/* Complexity */}
          <div className="mb-6">
            <p className="text-sm font-medium text-[#9CA3AF] mb-3">Workflow complexity</p>
            <div className="grid grid-cols-3 gap-2">
              {COMPLEXITY_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setComplexity(c.id)}
                  className={cn(
                    'card-lift text-left rounded-xl border p-3 transition-colors duration-150',
                    complexity === c.id
                      ? 'border-white/38 bg-white/14 text-white'
                      : 'border-white/22 bg-white/6 text-[#C9CACB] hover:border-white/32 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <div className="font-semibold text-sm mb-0.5">{c.label}</div>
                  <div className="text-[10px] text-[#9CA3AF]">{c.nodes}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => setStep('describe')} size="lg" className="w-full">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Step: Describe ─────────────────────────────────────────────────── */}
      {step === 'describe' && (
        <div className="animate-slide-up">
          <StepIndicator current={2} total={3} />
          <button type="button" onClick={() => setStep('integrations')} className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/8 hover:bg-white/14 border border-white/12 rounded-full px-3 py-1.5 mb-5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">Describe your automation</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">Plain English. Include the trigger event, what to do, and where to send results.</p>

          <div className="mb-4">
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. When a new GitHub issue is labeled 'urgent', post a Slack message to #alerts and create a Jira ticket with the issue title and URL."
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
              <span className="text-xs text-[#9CA3AF] ml-auto">{task.length}/2000</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-[#9CA3AF] mb-2 font-medium">Examples</p>
            <div className="flex flex-wrap gap-1.5">
              {TASK_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTask(ex)}
                  className="text-xs px-2.5 py-1 rounded-md border border-white/22 bg-white/6 text-[#C9CACB] hover:text-white hover:border-white/32 transition-colors text-left"
                >
                  {ex.length > 60 ? ex.slice(0, 60) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => generate()} disabled={task.trim().length < 10} size="lg" className="w-full">
            <Wand2 className="h-4 w-4" />
            Generate Workflow
          </Button>
        </div>
      )}

      {/* ── Step: Generating ───────────────────────────────────────────────── */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative mb-8">
            <div className="h-20 w-20 rounded-full border-2 border-white/25 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-t-violet-400 border-white/25 animate-spin" />
            </div>
            <Zap className="absolute inset-0 m-auto h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-[#F9FAFB] mb-2">Building your workflow…</h2>
          <p className="text-sm text-[#9CA3AF] transition-all duration-500 min-h-[20px]">
            {LOADING_MESSAGES[loadingMsg]}
          </p>
          {slowGen && (
            <p className="text-xs text-[#9CA3AF] mt-3 animate-fade-in">
              Complex workflows can take up to 30 seconds. Still building…
            </p>
          )}
        </div>
      )}

      {/* ── Step: Clarify ──────────────────────────────────────────────────── */}
      {step === 'clarify' && result?.question && (
        <div className="animate-slide-up">
          <StepIndicator current={2} total={3} />
          <div className="rounded-xl border border-white/25 bg-white/8 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <Wand2 className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9CA3AF] mb-1.5 uppercase tracking-wider">One quick question</p>
                <p className="text-sm text-[#F9FAFB] leading-relaxed">{result.question}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              placeholder="Your answer…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && clarifyAnswer.trim()) generate(clarifyAnswer.trim(), result.question!);
              }}
            />
            <Button
              onClick={() => generate(clarifyAnswer.trim(), result.question!)}
              disabled={!clarifyAnswer.trim()}
              size="lg"
              className="w-full"
            >
              Answer & Generate <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Result ───────────────────────────────────────────────────── */}
      {step === 'result' && result && (
        <div className="animate-slide-up space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {result.workflow
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  : <AlertCircle className="h-5 w-5 text-[#9CA3AF] shrink-0" />}
                <h2 className="font-bold text-[#F9FAFB]">
                  {result.workflow ? (result.workflowName ?? 'Your workflow is ready') : 'Generation incomplete'}
                </h2>
              </div>
              {result.workflow && result.nodeCount && (
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-xs text-[#9CA3AF]">{result.nodeCount} nodes</span>
                  {result.description && (
                    <><span className="text-[#9CA3AF]">·</span><span className="text-xs text-[#9CA3AF]">{result.description}</span></>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> New
            </Button>
          </div>

          {/* Node diagram */}
          {result.workflow && <NodeDiagramPreview workflow={result.workflow} />}

          {/* JSON output */}
          {workflowJson && (
            <div className="rounded-xl border border-white/25 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/8 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/5" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/5" />
                  </div>
                  <span className="text-xs text-[#C9CACB] ml-1.5 font-mono">workflow.json</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#9CA3AF] border border-white/22 px-2 py-0.5 rounded font-mono">n8n JSON</span>
                  <CopyButton text={workflowJson} />
                </div>
              </div>
              <pre className="p-5 text-xs text-[#9CA3AF] font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-hidden">
                <code>{workflowJson}</code>
              </pre>
            </div>
          )}

          {/* Credentials */}
          {result.credentials && result.credentials.length > 0 && (
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-2.5">Credentials required</p>
              <ul className="space-y-1">
                {result.credentials.map((cred, i) => (
                  <li key={i} className="text-xs text-[#D1D5DB] flex items-start gap-2">
                    <span className="text-amber-500/70 shrink-0 mt-0.5">→</span>
                    {cred}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Import instructions */}
          {result.importInstructions && result.importInstructions.length > 0 && (
            <div className="rounded-xl border border-white/22 bg-white/6 p-4">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2.5">How to import</p>
              <ol className="space-y-1">
                {result.importInstructions.map((step, i) => (
                  <li key={i} className="text-xs text-[#9CA3AF] flex items-start gap-2.5">
                    <span className="text-[10px] font-bold text-[#9CA3AF] shrink-0 mt-0.5 w-3.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Feedback */}
          {feedbackSubmitted ? (
            <div className="rounded-xl border border-white/22 bg-white/6 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-[#9CA3AF]">Thanks. Your feedback helps improve the AI.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/22 bg-white/6 p-4">
              <p className="text-xs font-medium text-[#9CA3AF] mb-3">Did this workflow work?</p>
              {feedbackRating === null && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => submitFeedback(1)} disabled={feedbackSubmitting} className="gap-1.5 flex-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> Worked
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackRating(-1)} disabled={feedbackSubmitting} className="gap-1.5 flex-1">
                    <ThumbsDown className="h-3.5 w-3.5" /> Needs work
                  </Button>
                </div>
              )}
              {feedbackRating === -1 && (
                <div className="space-y-3">
                  <Textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="What went wrong? (optional)"
                    rows={2}
                    maxLength={500}
                    className="resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitFeedback(-1)} disabled={feedbackSubmitting} className="gap-1.5">
                      {feedbackSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Submit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setFeedbackRating(null)} disabled={feedbackSubmitting}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live pill — download or regenerate */}
          <div className="flex justify-center py-1">
            <LivePill
              label="Workflow ready"
              sublabel={result.workflowName ?? undefined}
              visible={pillVisible}
              acceptLabel={<Download className="h-3.5 w-3.5" />}
              declineLabel={<RefreshCw className="h-3.5 w-3.5" />}
              onAccept={() => {
                if (workflowJson) downloadTextFile(workflowJson, `${result.workflowName?.toLowerCase().replace(/\s+/g, '-') ?? 'workflow'}.json`);
                setPillVisible(false);
              }}
              onDecline={() => { setPillVisible(false); reset(); }}
            />
          </div>

          {/* Download + reset fallback */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              onClick={() => { if (workflowJson) downloadTextFile(workflowJson, `${result.workflowName?.toLowerCase().replace(/\s+/g, '-') ?? 'workflow'}.json`); }}
              disabled={!workflowJson}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download workflow.json
            </Button>
            <Button onClick={reset} variant="ghost" className="flex-1 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Generate another
            </Button>
          </div>

          {/* Upsell */}
          <div className="rounded-xl border border-white/22 bg-white/6 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#F9FAFB] mb-0.5">Need production-ready scripts too?</p>
              <p className="text-xs text-[#9CA3AF]">The Starter Kit includes 9 pre-built PowerShell scripts for the most common IT tasks. Just $19.</p>
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

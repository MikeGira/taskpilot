'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CodeBlock } from '@/components/ui/code-block';
import { TaskComposer } from '@/components/generator/task-composer';
import {
  Monitor, Terminal, Apple, Layers, Server, GitMerge, Cloud,
  ArrowRight, ArrowLeft, Download, CheckCircle2,
  RefreshCw, Loader2, AlertCircle, Check, Info, ThumbsUp, ThumbsDown,
  Code, Box, GitBranch, Settings, Shield, Key, Brain, Database, Activity, Package, Workflow, Network,
} from 'lucide-react';
import { cn, downloadTextFile, buildDownloadContent, buildScriptGuide } from '@/lib/utils';
import type { GenerateResult } from '@/app/api/generate/route';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'os' | 'environment' | 'tool' | 'task' | 'generating' | 'clarify' | 'result';

interface Option { id: string; label: string; desc: string; icon: React.ElementType; }
interface ToolOption extends Option { category: string; }
interface CloudProvider { id: string; label: string; short: string; }

// ── Data ─────────────────────────────────────────────────────────────────────

const OS_OPTIONS: Option[] = [
  { id: 'windows',        label: 'Windows',        desc: 'Server 2016–2022 · Windows 10/11 · PowerShell', icon: Monitor  },
  { id: 'linux',          label: 'Linux',          desc: 'Ubuntu · RHEL/CentOS · Debian · Amazon Linux',  icon: Terminal },
  { id: 'macos',          label: 'macOS',          desc: 'macOS 12+ · Admin or MDM managed',              icon: Apple    },
  { id: 'cross-platform', label: 'Cross-Platform', desc: 'Works on Windows, Linux & macOS · Python',      icon: Layers   },
];

const ENV_OPTIONS: Option[] = [
  { id: 'on-premises', label: 'On-Premises', desc: 'Active Directory · Local servers · No cloud', icon: Server   },
  { id: 'hybrid',      label: 'Hybrid',      desc: 'On-prem + cloud · Best of both worlds',       icon: GitMerge },
  { id: 'cloud',       label: 'Cloud',       desc: 'AWS · Azure · GCP · Fully managed',           icon: Cloud    },
  { id: 'multi-cloud', label: 'Multi-Cloud', desc: 'Multiple providers · Complex infrastructure', icon: Layers   },
];

const TOOL_CATEGORY_ORDER = [
  'Scripting',
  'Infrastructure as Code',
  'Configuration Management',
  'CI/CD & GitOps',
  'Containers & Orchestration',
  'Security & Compliance',
  'AI / ML & Data',
  'Monitoring & Observability',
  'Database & Storage',
  'Network Automation',
] as const;

const TOOL_OPTIONS: ToolOption[] = [
  // Scripting
  { category: 'Scripting',                  id: 'powershell',         label: 'PowerShell',          desc: 'Windows automation, Active Directory, Exchange',                icon: Terminal  },
  { category: 'Scripting',                  id: 'bash',               label: 'Bash / Shell',        desc: 'Linux/Unix system admin, cron jobs, pipelines',                 icon: Terminal  },
  { category: 'Scripting',                  id: 'python',             label: 'Python',              desc: 'Cross-platform automation, APIs, data processing',              icon: Code      },
  // Infrastructure as Code
  { category: 'Infrastructure as Code',     id: 'terraform',          label: 'Terraform',           desc: 'IaC: provision VMs, networks, cloud resources',                 icon: Server    },
  { category: 'Infrastructure as Code',     id: 'pulumi',             label: 'Pulumi',              desc: 'TypeScript/Python IaC, modern Terraform alternative',           icon: Code      },
  { category: 'Infrastructure as Code',     id: 'aws-cdk',            label: 'AWS CDK',             desc: 'AWS Cloud Development Kit in TypeScript/Python',                icon: Cloud     },
  { category: 'Infrastructure as Code',     id: 'azure-bicep',        label: 'Azure Bicep',         desc: 'Azure-native IaC DSL, modern replacement for ARM JSON',         icon: Cloud     },
  { category: 'Infrastructure as Code',     id: 'arm-templates',      label: 'ARM Templates',       desc: 'Azure Resource Manager JSON, enterprise legacy and marketplace', icon: Code      },
  { category: 'Infrastructure as Code',     id: 'packer',             label: 'Packer',              desc: 'Build hardened VM and container images across providers',        icon: Package   },
  // Configuration Management
  { category: 'Configuration Management',   id: 'ansible',            label: 'Ansible',             desc: 'YAML playbooks, agentless SSH config management',               icon: Settings  },
  { category: 'Configuration Management',   id: 'puppet',             label: 'Puppet',              desc: 'Manifests and Hiera, agent-based config management',            icon: Settings  },
  // CI/CD & GitOps
  { category: 'CI/CD & GitOps',             id: 'github-actions',     label: 'GitHub Actions',      desc: 'CI/CD pipelines with security scanning built in',               icon: GitBranch },
  { category: 'CI/CD & GitOps',             id: 'gitlab-ci',          label: 'GitLab CI',           desc: 'CI/CD pipelines with SAST/DAST, .gitlab-ci.yml',                icon: GitBranch },
  { category: 'CI/CD & GitOps',             id: 'jenkins',            label: 'Jenkins',             desc: 'Declarative Jenkinsfile pipeline, Groovy DSL',                   icon: Workflow  },
  { category: 'CI/CD & GitOps',             id: 'azure-devops',       label: 'Azure DevOps',        desc: 'Azure Pipelines YAML, multi-stage with approval gates',          icon: Workflow  },
  { category: 'CI/CD & GitOps',             id: 'argocd',             label: 'ArgoCD',              desc: 'GitOps continuous delivery, App-of-Apps pattern',               icon: GitBranch },
  // Containers & Orchestration
  { category: 'Containers & Orchestration', id: 'docker',             label: 'Docker',              desc: 'Dockerfile: multi-stage, non-root, health checks',              icon: Box       },
  { category: 'Containers & Orchestration', id: 'kubernetes',         label: 'Kubernetes / Helm',   desc: 'Manifests and Helm charts with security context and policies',   icon: Layers    },
  // Security & Compliance
  { category: 'Security & Compliance',      id: 'cis-hardening',      label: 'CIS Hardening',       desc: 'CIS Benchmark scripts to harden Linux or Windows servers',       icon: Shield    },
  { category: 'Security & Compliance',      id: 'vault',              label: 'HashiCorp Vault',     desc: 'Secrets management: policies, dynamic creds, PKI',              icon: Key       },
  { category: 'Security & Compliance',      id: 'security-scanning',  label: 'Security Scanning',   desc: 'Trivy, Semgrep, Gitleaks, Checkov: multi-layer SAST and SCA',   icon: Shield    },
  // AI / ML & Data
  { category: 'AI / ML & Data',             id: 'mlops',              label: 'AI/ML Ops',           desc: 'MLflow, model serving, drift monitoring, inference API',         icon: Brain     },
  { category: 'AI / ML & Data',             id: 'langchain',          label: 'LangChain / RAG',     desc: 'LLM pipelines, RAG, vector stores, prompt engineering',          icon: Brain     },
  // Monitoring & Observability
  { category: 'Monitoring & Observability', id: 'prometheus-grafana', label: 'Prometheus + Grafana', desc: 'Metrics, alerting rules, dashboards as code',                  icon: Activity  },
  { category: 'Monitoring & Observability', id: 'elk-stack',          label: 'ELK Stack',           desc: 'Elasticsearch, Logstash, Kibana: log pipelines and ILM',       icon: Activity  },
  // Database & Storage
  { category: 'Database & Storage',         id: 'database-admin',     label: 'Database Admin',      desc: 'PostgreSQL / MySQL: backup, replication, user management',     icon: Database  },
  // Network Automation
  { category: 'Network Automation',         id: 'network-automation', label: 'Network Automation',  desc: 'netmiko, NAPALM, Nornir: multi-vendor network config',         icon: Network   },
];

const CLOUD_PROVIDERS: CloudProvider[] = [
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

const EXAMPLES_PREVIEW_COUNT = 6;
const SLOW_GEN_SECONDS = 15;

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs text-[#6B7280]">
        Step {current + 1} of {total}
      </p>
      <div className="h-px w-full bg-white/8">
        <div
          className="h-px bg-[#3ECF8E] transition-[width] duration-200 ease-out"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 flex items-center gap-1.5 text-[13px] font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function SelectionCard({
  option, selected, onClick,
}: { option: Option; selected: boolean; onClick: () => void }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'card-lift relative w-full rounded-xl border bg-[#0D0D0D] p-4 text-left',
        selected ? 'border-[rgba(62,207,142,0.4)]' : 'border-white/8'
      )}
    >
      {selected && <Check className="absolute right-3 top-3 h-3.5 w-3.5 text-[#3ECF8E]" />}
      <Icon className="mb-3 h-4 w-4 text-[#6B7280]" />
      <div className="mb-1 text-sm font-medium text-[#F9FAFB]">{option.label}</div>
      <div className="text-xs leading-relaxed text-[#A1A1AA]">{option.desc}</div>
    </button>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function GeneratorWizard({ initialTask = '' }: { initialTask?: string }) {
  // When arriving from a kit card, the task is pre-filled — start on OS step still
  // so user can pick their OS/env, but task composer will be pre-populated
  const [step, setStep] = useState<Step>('os');
  const [os, setOs] = useState('');
  const [env, setEnv] = useState('');
  const [tool, setTool] = useState('');
  const [cloudProviders, setCloudProviders] = useState<string[]>([]);
  const [task, setTask] = useState(initialTask);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState('');
  const [showAllExamples, setShowAllExamples] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [slowGen, setSlowGen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    if (step !== 'generating') return;
    setElapsed(0);
    setSlowGen(false);
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    const slow = setTimeout(() => setSlowGen(true), SLOW_GEN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(slow);
    };
  }, [step]);

  function toggleCloud(id: string) {
    setCloudProviders((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function generate(clarificationAnswer?: string, previousQuestion?: string) {
    const controller = new AbortController();
    abortRef.current = controller;
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
          tool: tool || undefined,
          taskDescription: task,
          clarificationAnswer,
          previousQuestion,
        }),
        signal: controller.signal,
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
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Network error. Check your connection and try again.');
      setStep('task');
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setStep('task');
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
    setTool('');
    setCloudProviders([]);
    setTask('');
    setClarifyAnswer('');
    setResult(null);
    setError('');
    setShowAllExamples(false);
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setFeedbackSubmitting(false);
  }

  const needsCloud = env === 'cloud' || env === 'hybrid' || env === 'multi-cloud';
  const toolLabel = TOOL_OPTIONS.find((t) => t.id === tool)?.label;
  const visibleExamples = showAllExamples ? TASK_EXAMPLES : TASK_EXAMPLES.slice(0, EXAMPLES_PREVIEW_COUNT);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* Step: OS selection */}
      {step === 'os' && (
        <div className="animate-slide-up">
          <StepIndicator current={0} total={4} />
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F9FAFB]">What OS are you targeting?</h2>
          <p className="mb-6 text-sm text-[#A1A1AA]">This determines the scripting language and available tools.</p>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <StepIndicator current={1} total={4} />
          <BackLink onClick={() => setStep('os')} />
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F9FAFB]">What&apos;s your environment?</h2>
          <p className="mb-6 text-sm text-[#A1A1AA]">This determines which tools and APIs the script uses.</p>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
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
            <div className="mb-5 rounded-xl border border-white/8 p-4">
              <p className="mb-3 text-sm font-medium text-[#F9FAFB]">
                Which cloud provider(s)? <span className="text-[#6B7280]">Select all that apply.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {CLOUD_PROVIDERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCloud(c.id)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150',
                      cloudProviders.includes(c.id)
                        ? 'border-[rgba(62,207,142,0.4)] text-[#3ECF8E]'
                        : 'border-white/8 text-[#A1A1AA] hover:border-white/25 hover:text-white'
                    )}
                  >
                    {cloudProviders.includes(c.id) && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {c.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => { if (env) setStep('tool'); }}
            disabled={!env}
            size="lg"
            className="w-full"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step: Tool selection */}
      {step === 'tool' && (
        <div className="animate-slide-up">
          <StepIndicator current={2} total={4} />
          <BackLink onClick={() => setStep('environment')} />
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F9FAFB]">What tool or language?</h2>
          <p className="mb-6 text-sm text-[#A1A1AA]">This determines the script format, file type, and enterprise best practices applied.</p>
          {TOOL_CATEGORY_ORDER.map((category) => {
            const tools = TOOL_OPTIONS.filter((t) => t.category === category);
            return (
              <div key={category} className="mb-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">{category}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tools.map((t) => (
                    <SelectionCard
                      key={t.id}
                      option={t}
                      selected={tool === t.id}
                      onClick={() => { setTool(t.id); setStep('task'); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step: Task description */}
      {step === 'task' && (
        <div className="animate-slide-up">
          <StepIndicator current={3} total={4} />
          <BackLink onClick={() => setStep('tool')} />
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F9FAFB]">What do you want to automate?</h2>
          <p className="mb-6 text-sm text-[#A1A1AA]">
            Describe the task in plain English. More detail produces a better script.
          </p>

          <div className="mb-4">
            <TaskComposer
              value={task}
              onChange={setTask}
              onSubmit={() => { if (task.trim().length >= 10) generate(); }}
              disabled={task.trim().length < 10}
              maxLength={2000}
              placeholder="e.g. Disable user accounts that haven't logged in for 90 days and email IT the list of disabled accounts."
              submitLabel="Generate"
              error={error || undefined}
              autoFocus
            />
            {task.length > 800 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-[#A1A1AA]">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Focused tasks generate the most complete scripts. For complex multi-system requests, describe the core goal. The script will include TODO markers for advanced features.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Examples</p>
            <div className="flex flex-wrap gap-2">
              {visibleExamples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTask(ex)}
                  className="rounded-lg border border-white/8 px-2.5 py-1 text-left text-xs text-[#A1A1AA] transition-colors duration-150 hover:border-white/25 hover:text-[#F9FAFB]"
                >
                  {ex}
                </button>
              ))}
              {!showAllExamples && (
                <button
                  onClick={() => setShowAllExamples(true)}
                  className="rounded-lg px-2.5 py-1 text-xs text-[#6B7280] transition-colors duration-150 hover:text-white"
                >
                  More
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step: Generating (loading) */}
      {step === 'generating' && (
        <div className="animate-fade-in py-8">
          <div className="mb-6 rounded-xl border border-white/8 bg-[#0D0D0D] p-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Task</p>
            <p className="text-sm leading-relaxed text-[#A1A1AA]">{task}</p>
          </div>
          <div className="flex items-center justify-between" aria-live="polite">
            <p className="stream-caret text-sm text-[#F9FAFB]">
              {toolLabel ? `Writing your ${toolLabel} script` : 'Writing your script'}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs tabular-nums text-[#6B7280]">{elapsed}s</span>
              <button
                type="button"
                onClick={stopGeneration}
                className="text-[13px] font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
              >
                Stop
              </button>
            </div>
          </div>
          {slowGen && (
            <p className="mt-3 text-xs text-[#6B7280]">Complex scripts can take up to 30 seconds.</p>
          )}
        </div>
      )}

      {/* Step: Clarification needed */}
      {step === 'clarify' && result?.question && (
        <div className="animate-slide-up">
          <StepIndicator current={3} total={4} />
          <div className="mb-6 rounded-xl border border-white/8 bg-[#0D0D0D] p-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6B7280]">One question before generating</p>
            <p className="text-sm leading-relaxed text-[#F9FAFB]">{result.question}</p>
          </div>
          <div className="space-y-4">
            <Input
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              placeholder="Your answer"
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
              Answer and generate
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="animate-slide-up space-y-5">
          {/* Header */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              {result.script
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3ECF8E]" />
                : <AlertCircle className="h-4 w-4 shrink-0 text-[#A1A1AA]" />}
              <h2 className="text-xl font-semibold tracking-tight text-[#F9FAFB]">
                {result.script ? (result.title ?? 'Your script is ready') : 'Generation incomplete'}
              </h2>
            </div>
            {result.script && result.explanation && (
              <p className="pl-6 text-sm leading-relaxed text-[#A1A1AA]">{result.explanation}</p>
            )}
            {!result.script && (
              <p className="mt-1 pl-6 text-sm leading-relaxed text-[#A1A1AA]">
                The generator could not produce a complete script. Add more detail: specify the OS, exact tools or systems involved, and what each step should do.
              </p>
            )}
          </div>

          {/* Script */}
          {result.script && (
            <CodeBlock code={result.script} filename={result.filename} language={result.language} />
          )}

          {/* Actions */}
          {result.script ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  const filename = result.filename ?? 'script.txt';
                  downloadTextFile(buildDownloadContent(result), filename);
                  const guideName = filename.replace(/\.[^.]+$/, '') + '-guide.md';
                  setTimeout(() => downloadTextFile(buildScriptGuide(result), guideName), 150);
                }}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download script + guide
              </Button>
              <Button onClick={reset} variant="ghost" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                New script
              </Button>
            </div>
          ) : (
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}

          {/* Config notes */}
          {result.configNotes && result.configNotes.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
                Before you run
              </p>
              <ul className="space-y-1.5">
                {result.configNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#A1A1AA]">
                    <span className="mt-0.5 shrink-0 text-[#6B7280]">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback */}
          {result.script && (
            feedbackSubmitted ? (
              <p className="text-xs text-[#A1A1AA]">Thanks. This improves future scripts.</p>
            ) : feedbackRating === -1 ? (
              <div className="space-y-3">
                <Textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="What went wrong? Optional, helps improve the generator."
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
                    Submit feedback
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
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-[#A1A1AA]">Did this script work?</p>
                <button
                  type="button"
                  aria-label="Yes, it worked"
                  onClick={() => submitFeedback(1)}
                  disabled={feedbackSubmitting}
                  className="rounded-lg border border-white/8 p-1.5 text-[#A1A1AA] transition-colors duration-150 hover:border-white/25 hover:text-white"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="No, it needs work"
                  onClick={() => setFeedbackRating(-1)}
                  disabled={feedbackSubmitting}
                  className="rounded-lg border border-white/8 p-1.5 text-[#A1A1AA] transition-colors duration-150 hover:border-white/25 hover:text-white"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          )}

          {/* Upsell */}
          {result.script && (
            <p className="text-[13px] text-[#A1A1AA]">
              Prefer pre-built scripts?{' '}
              <a href="/checkout" className="font-medium text-[#3ECF8E] transition-colors duration-150 hover:text-[#5FDCA5]">
                The Starter Kit has 9 for $19
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}

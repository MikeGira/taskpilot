import Link from 'next/link';
import {
  ShieldCheck, HardDrive, Users, Activity, FileText, Laptop,
  CheckCircle2, ArrowRight, Zap, Clock, Download, Wand2,
  XCircle, Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { NewsletterForm } from '@/components/landing/newsletter-form';
import { ContactForm } from '@/components/landing/contact-form';
import { FadeInSection } from '@/components/animations/fade-in-section';
import { AnimatedTerminal } from '@/components/animations/animated-terminal';
import { HeroBeams } from '@/components/animations/hero-beams';
import { AnimatedArcs } from '@/components/animations/animated-arcs';

const SCRIPTS = [
  { icon: ShieldCheck, name: 'Password Reset Automation',  color: 'text-blue-300',    bg: 'bg-blue-500/25',    desc: 'Reset AD passwords with one command. Full audit log and optional user notification.',              task: 'Reset Active Directory passwords, log every action with timestamp, and optionally send email notification to the user when their password is reset' },
  { icon: HardDrive,   name: 'Disk Cleanup + Alerts',      color: 'text-cyan-300',    bg: 'bg-cyan-500/25',    desc: 'Auto-clears temp files and emails alerts before drives fill up.',                                 task: 'Monitor disk space on all servers and send email alerts when drives fall below a configurable threshold, then auto-clean temp files' },
  { icon: Users,       name: 'User Onboarding',            color: 'text-emerald-300', bg: 'bg-emerald-500/25', desc: 'Create AD accounts from CSV, assign groups, set temp password, notify manager.',                 task: 'Create new employee AD account from CSV input, assign to appropriate groups, set temporary password, and notify the manager by email' },
  { icon: Users,       name: 'User Offboarding',           color: 'text-orange-300',  bg: 'bg-orange-500/25',  desc: 'Disable account, remove group memberships, archive home folder, email HR report.',              task: 'Offboard a departing employee: disable their AD account, remove from all groups, archive home folder to a backup location, and send report to HR' },
  { icon: Activity,    name: 'Daily Health Check',         color: 'text-violet-300',  bg: 'bg-violet-500/25',  desc: 'CPU, RAM, and disk usage tracked on schedule. Summary email waiting every morning.',            task: 'Run a daily health check on all servers: monitor CPU, RAM, and disk usage, check critical services, and email a summary report each morning' },
  { icon: ShieldCheck, name: 'Account Deactivation',       color: 'text-amber-300',   bg: 'bg-amber-500/25',   desc: 'Disable accounts inactive for 90 days, move to disabled OU, generate audit report.',            task: 'Find and disable Active Directory accounts that have been inactive for 90 days, move them to a disabled OU, and generate an audit report' },
  { icon: FileText,    name: 'Security Report',            color: 'text-red-300',     bg: 'bg-red-500/25',     desc: 'Weekly report of failed logins and locked accounts, exported to CSV and HTML.',                 task: 'Generate a weekly security report of failed login attempts and locked accounts across all Windows servers, export to CSV and HTML, and email it to the security team' },
  { icon: Laptop,      name: 'Device Provisioning',        color: 'text-pink-300',    bg: 'bg-pink-500/25',    desc: 'Join domain, deploy approved software, apply GPO, tag in asset inventory. One command.',        task: 'Provision a new device: join it to the domain, deploy approved software packages, apply group policy settings, and register in the asset inventory' },
  { icon: HardDrive,   name: 'Device Decommission',        color: 'text-indigo-300',  bg: 'bg-indigo-500/25',  desc: 'Backup data, secure wipe, remove from domain, update asset inventory automatically.',          task: 'Decommission an old device: backup user data, perform a secure disk wipe, remove from the domain, and update the asset inventory' },
  { icon: Zap,         name: 'Config Template',            color: 'text-yellow-300',  bg: 'bg-yellow-500/25',  desc: 'Edit 6 fields in config.json and every script is ready for your environment.',                  task: null },
  { icon: Clock,       name: 'Task Scheduler Template',    color: 'text-white',       bg: 'bg-white/8',        desc: 'Pre-built scheduler.xml. Import it once, scripts run on your schedule forever.',                 task: null },
  { icon: Download,    name: 'Step-by-Step Setup Guide',   color: 'text-white',       bg: 'bg-white/8',        desc: 'From ZIP to running in 7 clear steps. No guesswork.',                                           task: null },
];

const WITHOUT = [
  'Manually resetting passwords one by one',
  'Surprise disk full alerts at 2am',
  'Copy-pasting user setup steps from a Word doc',
  'Guessing system health from memory',
  'Spending 20 minutes on tasks that should take 20 seconds',
];

const WITH = [
  'One command resets any password with a log entry',
  'Automated alerts before disks fill up',
  'New users created and configured in under 10 seconds',
  'Scheduled health report waiting in your inbox every morning',
  'Spend those 20 minutes on work that actually matters',
];

const ENVIRONMENTS = [
  { color: 'bg-blue-400',    border: 'border-blue-500/50',    bg: 'bg-blue-500/10',    title: 'Windows', desc: 'Server 2016 to 2022, plus Windows 10 and 11' },
  { color: 'bg-yellow-400',  border: 'border-yellow-500/50',  bg: 'bg-yellow-500/10',  title: 'Linux',   desc: 'Ubuntu, RHEL, Amazon Linux' },
  { color: 'bg-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', title: 'Cloud',   desc: 'AWS, Azure, GCP, DigitalOcean' },
  { color: 'bg-violet-400',  border: 'border-violet-500/50',  bg: 'bg-violet-500/10',  title: 'Hybrid',  desc: 'On-premises Active Directory' },
];

const STEPS = [
  { num: '01', title: 'Download', desc: 'Buy, get the ZIP, extract to any folder on your server.' },
  { num: '02', title: 'Configure', desc: 'Edit 6 fields in config.json: your domain, OUs, log path, and alert threshold.' },
  { num: '03', title: 'Run or Schedule', desc: 'Execute manually or import scheduler.xml into Task Scheduler. Done.' },
];

const FAQS = [
  { q: 'Do I need Active Directory?', a: 'The password reset and new user scripts require Active Directory (on-prem or Azure AD DS). Disk cleanup and health check work on any Windows Server 2016+ without AD.' },
  { q: 'Which Windows versions are supported?', a: 'All scripts require PowerShell 5.1+, which ships with Windows Server 2016 and later. Windows 10/11 workstations with RSAT installed also work for the AD scripts.' },
  { q: "What if I'm not sure it'll work in my environment?", a: 'Every script has a config file with clear comments. Test in a lab or a non-production OU first. The setup guide walks you through a safe first run. If you hit a wall, email me and I respond within one business day.' },
  { q: 'How do I get updates when you add new scripts?', a: "Subscribe to the weekly newsletter and you'll be the first to know. Existing customers get a discount on any future bundle. There's no subscription. You buy once, you own it." },
  { q: 'Can I use this for multiple clients?', a: "Yes. One purchase covers your own use. If you're an MSP or consultant using these for clients as part of a managed service, reach out via the contact form for a commercial license." },
];

export default function HomePage({ searchParams }: { searchParams: { subscribed?: string; cancelled?: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {searchParams.subscribed && (
        <div className="bg-white/5 border-b border-white/20 text-center py-2 text-sm text-white">
          You&apos;re subscribed! Check your inbox to confirm.
        </div>
      )}
      {searchParams.cancelled && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-center py-2 text-sm text-yellow-400">
          Checkout cancelled. Questions? Use the contact form below.
        </div>
      )}

      <main className="flex-1">

        {/* Hero */}
        <section className="relative overflow-hidden bg-black">
          <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', animation: 'glow-drift-indigo 8s ease-in-out infinite' }} />
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%)', animation: 'glow-drift-cyan 10s ease-in-out infinite' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-96 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, transparent 70%)' }} />

          {/* Center spotlight — the main overhead glow */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-20 h-[700px] w-[900px] rounded-full"
            style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.2) 0%, rgba(34,211,238,0.07) 28%, transparent 60%)' }} />

          <div className="absolute inset-y-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-y-0 w-[2px] bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent animate-beam" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white mb-8 animate-float-up">
              <Zap className="h-3 w-3" />
              Built by an IT pro with 10+ years in the field
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.1] mb-6 animate-fade-in">
              Stop doing IT busywork.{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                Start automating it.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-[#888] max-w-2xl mx-auto mb-10 text-balance animate-slide-up">
              9 production-ready PowerShell scripts that handle your most repetitive helpdesk
              tasks: password resets, disk cleanup, user onboarding, and more.
              Configure once, run forever.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/checkout">
                  Get the Kit $19
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/generate">
                  <Wand2 className="h-4 w-4" />
                  Try Generator Free
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {['9 production-ready scripts', 'Instant download', 'One-time $19', 'No subscription'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-[#555]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500/50 shrink-0" />
                  {item}
                </span>
              ))}
            </div>

            <HeroBeams />
            <AnimatedTerminal />

            <p className="mt-6 text-xs text-[#777]">
              <Link href="/generate" className="text-[#888] hover:text-white underline underline-offset-2 transition-colors">
                Try the AI script generator
              </Link>
              {' '}to pick your OS, describe your task, and get a working script in seconds.
            </p>
          </div>

          {/* Metrics strip */}
          <div className="relative border-t border-white/8 py-6">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                {[
                  { stat: '9',      label: 'Scripts included',   accent: false },
                  { stat: '< 1 hr', label: 'Time to first run',  accent: false },
                  { stat: '$19',    label: 'One-time, no sub',   accent: true  },
                  { stat: '∞',      label: 'Runs on your server', accent: false },
                ].flatMap(({ stat, label, accent }, i, arr) => [
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-bold leading-none ${accent ? 'text-emerald-400' : 'text-white'}`}>{stat}</div>
                    <div className="text-[11px] text-[#555] mt-1 tracking-wide uppercase">{label}</div>
                  </div>,
                  i < arr.length - 1
                    ? <div key={`sep-${i}`} className="hidden sm:block h-8 w-px bg-white/10 shrink-0" />
                    : null,
                ])}
              </div>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section id="includes" className="py-20 border-t border-white/12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything in the kit</h2>
                <p className="text-[#888] max-w-xl mx-auto">
                  9 scripts. Ready to deploy. No assembly required beyond editing 6 config values.
                </p>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SCRIPTS.map((s, i) => {
                const cardContent = (
                  <Card className={`p-5 group transition-all duration-200 h-full ${s.task ? 'hover:border-white/35 hover:bg-white/4 cursor-pointer' : 'hover:border-white/28 hover:bg-white/2'}`}>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <h3 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                      {s.name}
                      {s.task && <span className="text-[10px] text-[#555] font-normal group-hover:text-[#888] transition-colors">Generate →</span>}
                    </h3>
                    <p className="text-sm text-[#777] leading-relaxed">{s.desc}</p>
                  </Card>
                );
                return (
                  <FadeInSection key={s.name} delay={i * 60}>
                    {s.task ? (
                      <Link href={`/generate?task=${encodeURIComponent(s.task)}`}>
                        {cardContent}
                      </Link>
                    ) : cardContent}
                  </FadeInSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 border-t border-white/12 bg-black">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Up and running in 3 steps</h2>
              </div>
            </FadeInSection>
            <div className="grid sm:grid-cols-3 gap-5">
              {STEPS.map((step, i) => (
                <FadeInSection key={step.num} delay={i * 100}>
                  <Card className="p-6 h-full flex flex-col items-center text-center hover:border-white/35 transition-all duration-200 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white font-bold text-lg mb-5 group-hover:border-white/40 group-hover:bg-white/8 transition-all duration-200">
                      {step.num}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#888] leading-relaxed">{step.desc}</p>
                  </Card>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Deploy everywhere */}
        <section className="py-16 border-t border-white/12 overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <FadeInSection>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/4 px-3 py-1 text-xs font-medium text-white mb-5">
                    <Zap className="h-3 w-3 text-cyan-400" /> Works everywhere
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                    One kit.<br />
                    <span className="text-white/50">Every environment.</span>
                  </h2>
                  <p className="text-[#888] leading-relaxed mb-6">
                    Whether your servers are on-premises, in Azure, AWS, or spread across a hybrid estate. TaskPilot scripts adapt to your environment with a single config file.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {ENVIRONMENTS.map(({ color, border, bg, title, desc }) => (
                      <div key={title} className={`rounded-xl border ${border} ${bg} p-3.5`}>
                        <div className={`inline-block h-2.5 w-2.5 rounded-full ${color} mb-2.5`} />
                        <div className="text-sm font-semibold text-white mb-1">{title}</div>
                        <div className="text-xs text-[#777] leading-relaxed">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeInSection>
              <FadeInSection delay={150}>
                <AnimatedArcs />
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* Before / After */}
        <section className="py-20 border-t border-white/12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your Monday, before and after</h2>
              </div>
            </FadeInSection>
            <div className="grid md:grid-cols-2 gap-6">
              <FadeInSection delay={0}>
                <Card className="p-6 border-red-500/30 bg-red-950/5 h-full">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                      <XCircle className="h-4 w-4 text-red-400" />
                    </div>
                    Without TaskPilot
                  </h3>
                  <ul className="space-y-3">
                    {WITHOUT.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#888]">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeInSection>
              <FadeInSection delay={120}>
                <Card className="p-6 border-emerald-500/30 bg-emerald-950/5 h-full">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                      <Rocket className="h-4 w-4 text-emerald-400" />
                    </div>
                    With TaskPilot
                  </h3>
                  <ul className="space-y-3">
                    {WITH.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-white">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 border-t border-white/12 bg-black">
          <div className="mx-auto max-w-md px-4 sm:px-6 text-center">
            <FadeInSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple pricing</h2>
              <p className="text-[#888] mb-10">One price. Everything included. No subscription.</p>

              <div className="relative">
                {/* Glow above the pricing card */}
                <div className="pointer-events-none absolute inset-x-0 -top-20 flex justify-center">
                  <div className="h-40 w-80 rounded-full blur-3xl opacity-75"
                    style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
                </div>
                <Card className="relative overflow-hidden p-8 border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-transparent hover:border-indigo-500/50 transition-colors duration-300">
                  {/* Top gradient accent line */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />
                  <div className="mb-6">
                    <div className="text-5xl font-extrabold bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent mb-1">$19</div>
                    <div className="text-sm text-[#888]">one-time · instant download</div>
                  </div>
                  <ul className="space-y-3 mb-8 text-left">
                    {[
                      '9 production-ready PowerShell scripts',
                      'Config template (edit 6 fields)',
                      'Windows Task Scheduler XML',
                      'Step-by-step setup guide',
                      'Works on Windows Server 2016+',
                      'Email support',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-white">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400/70" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="w-full">
                    <Link href="/checkout">
                      Buy Now $19
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="mt-4 text-xs text-[#777]">
                    Secure checkout via Stripe. We never see your card details.
                  </p>
                </Card>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 border-t border-white/12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <FadeInSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-14">
                Frequently asked questions
              </h2>
            </FadeInSection>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <FadeInSection key={faq.q} delay={i * 50}>
                  <Card className="p-6 hover:border-white/30 transition-colors duration-200">
                    <h3 className="font-semibold text-white mb-3">{faq.q}</h3>
                    <p className="text-sm text-[#888] leading-relaxed">{faq.a}</p>
                  </Card>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-20 border-t border-white/12 bg-black">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <FadeInSection>
              <Card className="p-8 sm:p-10 text-center hover:border-white/30 transition-colors duration-300">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/4 px-4 py-1.5 text-xs font-medium text-white mb-6">
                  Free weekly tips
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  1 automation tip every week
                </h2>
                <p className="text-[#888] mb-8">Short, practical, and ready to use. No fluff. Unsubscribe any time.</p>
                <NewsletterForm />
              </Card>
            </FadeInSection>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 border-t border-white/12">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Need custom automation?</h2>
                <p className="text-[#888]">
                  Describe your environment and the problem. I&apos;ll give you an honest answer within one business day.
                </p>
              </div>
              <Card className="p-6 sm:p-8 hover:border-white/30 transition-colors duration-300">
                <ContactForm />
              </Card>
            </FadeInSection>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

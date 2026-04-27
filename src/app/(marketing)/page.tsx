import Link from 'next/link';
import {
  ShieldCheck,
  HardDrive,
  Users,
  Activity,
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock,
  Download,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { NewsletterForm } from '@/components/landing/newsletter-form';
import { ContactForm } from '@/components/landing/contact-form';

const SCRIPTS = [
  {
    icon: ShieldCheck,
    name: 'Password Reset Automation',
    desc: 'Reset AD passwords with one command. Logs every action with timestamp.',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
  },
  {
    icon: HardDrive,
    name: 'Disk Cleanup + Alerts',
    desc: 'Auto-clears temp files and alerts when drives fall below your threshold.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
  },
  {
    icon: Users,
    name: 'New User Onboarding',
    desc: 'Create AD users, assign groups, and set temp passwords in seconds.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    icon: Activity,
    name: 'Daily Health Check',
    desc: 'CPU, RAM, and disk usage report — schedule it once and forget it.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: Zap,
    name: 'Config Template',
    desc: 'Edit 6 fields in config.json and every script is ready for your environment.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
  {
    icon: Clock,
    name: 'Task Scheduler Template',
    desc: 'Pre-built scheduler.xml — import it and your scripts run automatically.',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
  },
  {
    icon: Download,
    name: 'Step-by-Step Setup Guide',
    desc: 'From ZIP to running in 7 clear steps. No guesswork, no prerequisites hunting.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
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

const FAQS = [
  {
    q: 'Do I need Active Directory?',
    a: 'The password reset and new user scripts require Active Directory (on-prem or Azure AD DS). Disk cleanup and health check work on any Windows Server 2016+ without AD.',
  },
  {
    q: 'Which Windows versions are supported?',
    a: 'All scripts require PowerShell 5.1+, which ships with Windows Server 2016 and later. Windows 10/11 workstations with RSAT installed also work for the AD scripts.',
  },
  {
    q: "What if I'm not sure it'll work in my environment?",
    a: 'Every script has a config file with clear comments. Test in a lab or a non-production OU first. The setup guide walks you through a safe first run. If you hit a wall, email me — I respond within one business day.',
  },
  {
    q: 'How do I get updates when you add new scripts?',
    a: 'Subscribe to the weekly newsletter and you\'ll be the first to know. Existing customers get a discount on any future bundle. There\'s no subscription — you buy once, you own it.',
  },
  {
    q: 'Can I use this for multiple clients?',
    a: 'Yes. One purchase covers your own use. If you\'re an MSP or consultant using these for clients as part of a managed service, reach out via the contact form for a commercial license.',
  },
];

export default function HomePage({
  searchParams,
}: {
  searchParams: { subscribed?: string; cancelled?: string };
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {searchParams.subscribed && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-center py-2 text-sm text-emerald-400">
          You&apos;re subscribed! Check your inbox to confirm.
        </div>
      )}
      {searchParams.cancelled && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-center py-2 text-sm text-yellow-400">
          Checkout cancelled. Questions? Use the contact form below.
        </div>
      )}

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0B0F1A]">
          <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-radial from-sky-500/8 via-transparent to-transparent pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/8 px-4 py-1.5 text-xs font-medium text-sky-400 mb-8">
              <Zap className="h-3 w-3" />
              Built by an IT pro with 10+ years in the field
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F9FAFB] text-balance leading-[1.1] mb-6">
              Stop doing IT busywork.{' '}
              <span className="text-sky-400">Start automating it.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#9CA3AF] max-w-2xl mx-auto mb-10 text-balance">
              7 production-ready PowerShell scripts that handle your most repetitive helpdesk tasks —
              password resets, disk cleanup, user onboarding, and health checks. Configure once,
              run forever.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="xl" className="w-full sm:w-auto shadow-xl shadow-sky-500/25">
                <Link href="/checkout">
                  Get the Kit — $19
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20 text-white border-0"
              >
                <Link href="/generate">
                  <Wand2 className="h-5 w-5" />
                  Generate a Script — Free
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-[#6B7280]">
              <Link href="/generate" className="text-violet-400 hover:underline">Try the AI script generator</Link>
              {' '}— pick your OS and environment, describe your task, get a working script in seconds.
            </p>

            <p className="mt-6 text-sm text-[#6B7280]">
              Instant download · Works on Windows Server 2016+ · One-time purchase
            </p>
          </div>
        </section>

        {/* ── What's included ──────────────────────────────────────────────── */}
        <section id="includes" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4">
                Everything in the kit
              </h2>
              <p className="text-[#9CA3AF] max-w-xl mx-auto">
                7 files. Ready to deploy. No assembly required beyond editing 6 config values.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SCRIPTS.map((s) => (
                <Card key={s.name} className="p-5 hover:border-white/15 transition-colors">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} mb-4`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <h3 className="font-semibold text-[#F9FAFB] mb-1.5">{s.name}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{s.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6 bg-[#0D1221]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4">
                Up and running in 3 steps
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { num: '01', title: 'Download', desc: 'Buy, get the ZIP, extract to any folder on your server.' },
                { num: '02', title: 'Configure', desc: 'Edit 6 fields in config.json — your domain, OUs, log path, and alert threshold.' },
                { num: '03', title: 'Run or Schedule', desc: 'Execute manually or import scheduler.xml into Task Scheduler. Done.' },
              ].map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/8 text-sky-400 font-bold text-lg mb-5">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-[#F9FAFB] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Before / After ──────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4">
                Your Monday, before and after
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-red-500/15">
                <h3 className="font-semibold text-red-400 mb-5 flex items-center gap-2">
                  <span className="text-lg">😩</span> Without TaskPilot
                </h3>
                <ul className="space-y-3">
                  {WITHOUT.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[#9CA3AF]">
                      <span className="mt-0.5 h-4 w-4 shrink-0 text-red-400">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6 border-emerald-500/15">
                <h3 className="font-semibold text-emerald-400 mb-5 flex items-center gap-2">
                  <span className="text-lg">🚀</span> With TaskPilot
                </h3>
                <ul className="space-y-3">
                  {WITH.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[#F9FAFB]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 border-t border-white/6 bg-[#0D1221]">
          <div className="mx-auto max-w-md px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4">
              Simple pricing
            </h2>
            <p className="text-[#9CA3AF] mb-10">One price. Everything included. No subscription.</p>

            <Card className="p-8 border-sky-500/20 bg-gradient-to-b from-sky-500/5 to-transparent">
              <div className="mb-6">
                <div className="text-5xl font-extrabold text-[#F9FAFB] mb-1">$19</div>
                <div className="text-sm text-[#6B7280]">one-time · instant download</div>
              </div>
              <ul className="space-y-3 mb-8 text-left">
                {[
                  '4 production PowerShell scripts',
                  'Config template (edit 6 fields)',
                  'Windows Task Scheduler XML',
                  'Step-by-step setup guide',
                  'Works on Windows Server 2016+',
                  'Email support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#F9FAFB]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="w-full shadow-lg shadow-sky-500/20">
                <Link href="/checkout">
                  Buy Now — $19
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-[#4B5563]">
                Secure checkout via Stripe. We never see your card details.
              </p>
            </Card>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section id="faq" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] text-center mb-14">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <Card key={faq.q} className="p-6">
                  <h3 className="font-semibold text-[#F9FAFB] mb-3">{faq.q}</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{faq.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Newsletter ───────────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6 bg-[#0D1221]">
          <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/8 px-4 py-1.5 text-xs font-medium text-cyan-400 mb-6">
              Free weekly tips
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-4">
              1 automation tip every week
            </h2>
            <p className="text-[#9CA3AF] mb-8">
              Short, practical, and ready to use. No fluff. Unsubscribe any time.
            </p>
            <NewsletterForm />
          </div>
        </section>

        {/* ── Contact ──────────────────────────────────────────────────────── */}
        <section id="contact" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-4">
                Need custom automation?
              </h2>
              <p className="text-[#9CA3AF]">
                Describe your environment and the problem. I&apos;ll give you an honest answer
                within one business day.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

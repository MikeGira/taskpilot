import Link from 'next/link';
import {
  ShieldCheck, HardDrive, Users, Activity,
  CheckCircle2, ArrowRight, Zap, Clock, Download, Wand2,
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

const SCRIPTS = [
  { icon: ShieldCheck, name: 'Password Reset Automation',  desc: 'Reset AD passwords with one command. Logs every action with timestamp.',                          color: 'text-white', bg: 'bg-white/6' },
  { icon: HardDrive,   name: 'Disk Cleanup + Alerts',      desc: 'Auto-clears temp files and alerts when drives fall below your threshold.',                         color: 'text-white', bg: 'bg-white/6' },
  { icon: Users,       name: 'New User Onboarding',        desc: 'Create AD users, assign groups, and set temp passwords in seconds.',                              color: 'text-white', bg: 'bg-white/6' },
  { icon: Activity,    name: 'Daily Health Check',         desc: 'CPU, RAM, and disk usage report — schedule it once and forget it.',                               color: 'text-white', bg: 'bg-white/6' },
  { icon: Zap,         name: 'Config Template',            desc: 'Edit 6 fields in config.json and every script is ready for your environment.',                    color: 'text-white', bg: 'bg-white/6' },
  { icon: Clock,       name: 'Task Scheduler Template',    desc: 'Pre-built scheduler.xml — import it and your scripts run automatically.',                         color: 'text-white', bg: 'bg-white/6' },
  { icon: Download,    name: 'Step-by-Step Setup Guide',   desc: 'From ZIP to running in 7 clear steps. No guesswork, no prerequisites hunting.',                  color: 'text-white', bg: 'bg-white/6' },
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
  { q: 'Do I need Active Directory?', a: 'The password reset and new user scripts require Active Directory (on-prem or Azure AD DS). Disk cleanup and health check work on any Windows Server 2016+ without AD.' },
  { q: 'Which Windows versions are supported?', a: 'All scripts require PowerShell 5.1+, which ships with Windows Server 2016 and later. Windows 10/11 workstations with RSAT installed also work for the AD scripts.' },
  { q: "What if I'm not sure it'll work in my environment?", a: 'Every script has a config file with clear comments. Test in a lab or a non-production OU first. The setup guide walks you through a safe first run. If you hit a wall, email me — I respond within one business day.' },
  { q: 'How do I get updates when you add new scripts?', a: "Subscribe to the weekly newsletter and you'll be the first to know. Existing customers get a discount on any future bundle. There's no subscription — you buy once, you own it." },
  { q: 'Can I use this for multiple clients?', a: "Yes. One purchase covers your own use. If you're an MSP or consultant using these for clients as part of a managed service, reach out via the contact form for a commercial license." },
];

export default function HomePage({ searchParams }: { searchParams: { subscribed?: string; cancelled?: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {searchParams.subscribed && (
        <div className="bg-white/5 border-b border-white/12 text-center py-2 text-sm text-white">
          You&apos;re subscribed! Check your inbox to confirm.
        </div>
      )}
      {searchParams.cancelled && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-center py-2 text-sm text-yellow-400">
          Checkout cancelled. Questions? Use the contact form below.
        </div>
      )}

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-black">
          {/* Grid + radial glow */}
          <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-radial from-white/4 via-transparent to-transparent pointer-events-none animate-glow-pulse" />

          {/* Sweeping beam */}
          <div className="absolute inset-y-0 left-0 w-1/3 h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-y-0 w-[2px] bg-gradient-to-b from-transparent via-white/20 to-transparent animate-beam" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-8 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-xs font-medium text-white mb-8 animate-float-up">
              <Zap className="h-3 w-3" />
              Built by an IT pro with 10+ years in the field
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.1] mb-6 animate-fade-in">
              Stop doing IT busywork.{' '}
              <span className="text-white/80">Start automating it.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#888] max-w-2xl mx-auto mb-10 text-balance animate-slide-up">
              7 production-ready PowerShell scripts that handle your most repetitive helpdesk
              tasks — password resets, disk cleanup, user onboarding, and health checks.
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

            <p className="mt-5 text-sm text-[#555]">
              Instant download · Windows Server 2016+ · One-time purchase
            </p>

            {/* Animated connection diagram */}
            <HeroBeams />

            {/* Animated terminal */}
            <AnimatedTerminal />

            <p className="mt-6 text-xs text-[#444]">
              <Link href="/generate" className="text-[#888] hover:text-white underline underline-offset-2 transition-colors">
                Try the AI script generator
              </Link>
              {' '}— pick your OS, describe your task, get a working script in seconds.
            </p>
          </div>
        </section>

        {/* ── What's included ───────────────────────────────────────────────── */}
        <section id="includes" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything in the kit</h2>
                <p className="text-[#888] max-w-xl mx-auto">
                  7 files. Ready to deploy. No assembly required beyond editing 6 config values.
                </p>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SCRIPTS.map((s, i) => (
                <FadeInSection key={s.name} delay={i * 60}>
                  <Card className="p-5 group hover:border-white/20 hover:bg-white/3 transition-all duration-200 h-full">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <h3 className="font-semibold text-white mb-1.5">{s.name}</h3>
                    <p className="text-sm text-[#666] leading-relaxed">{s.desc}</p>
                  </Card>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6 bg-black">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Up and running in 3 steps</h2>
              </div>
            </FadeInSection>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { num: '01', title: 'Download', desc: 'Buy, get the ZIP, extract to any folder on your server.' },
                { num: '02', title: 'Configure', desc: 'Edit 6 fields in config.json — your domain, OUs, log path, and alert threshold.' },
                { num: '03', title: 'Run or Schedule', desc: 'Execute manually or import scheduler.xml into Task Scheduler. Done.' },
              ].map((step, i) => (
                <FadeInSection key={step.num} delay={i * 100}>
                  <div className="flex flex-col items-center text-center group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/4 text-white font-bold text-lg mb-5 group-hover:border-white/25 group-hover:bg-white/8 transition-all duration-200">
                      {step.num}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#888] leading-relaxed">{step.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Before / After ────────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your Monday, before and after</h2>
              </div>
            </FadeInSection>
            <div className="grid md:grid-cols-2 gap-6">
              <FadeInSection delay={0}>
                <Card className="p-6 border-white/8 h-full">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-lg">😩</span> Without TaskPilot
                  </h3>
                  <ul className="space-y-3">
                    {WITHOUT.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#888]">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-[#444]">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeInSection>
              <FadeInSection delay={120}>
                <Card className="p-6 border-white/12 h-full">
                  <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-lg">🚀</span> With TaskPilot
                  </h3>
                  <ul className="space-y-3">
                    {WITH.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-white">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 border-t border-white/6 bg-black">
          <div className="mx-auto max-w-md px-4 sm:px-6 text-center">
            <FadeInSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple pricing</h2>
              <p className="text-[#888] mb-10">One price. Everything included. No subscription.</p>

              <Card className="p-8 border-white/12 bg-gradient-to-b from-white/3 to-transparent hover:border-white/20 transition-colors duration-300">
                <div className="mb-6">
                  <div className="text-5xl font-extrabold text-white mb-1">$19</div>
                  <div className="text-sm text-[#555]">one-time · instant download</div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {[
                    '7 production PowerShell scripts',
                    'Config template (edit 6 fields)',
                    'Windows Task Scheduler XML',
                    'Step-by-step setup guide',
                    'Works on Windows Server 2016+',
                    'Email support',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-white/60" />
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
                <p className="mt-4 text-xs text-[#444]">
                  Secure checkout via Stripe. We never see your card details.
                </p>
              </Card>
            </FadeInSection>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section id="faq" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <FadeInSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-14">
                Frequently asked questions
              </h2>
            </FadeInSection>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <FadeInSection key={faq.q} delay={i * 50}>
                  <Card className="p-6 hover:border-white/15 transition-colors duration-200">
                    <h3 className="font-semibold text-white mb-3">{faq.q}</h3>
                    <p className="text-sm text-[#888] leading-relaxed">{faq.a}</p>
                  </Card>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Newsletter ────────────────────────────────────────────────────── */}
        <section className="py-20 border-t border-white/6 bg-black">
          <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
            <FadeInSection>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/4 px-4 py-1.5 text-xs font-medium text-white mb-6">
                Free weekly tips
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                1 automation tip every week
              </h2>
              <p className="text-[#888] mb-8">Short, practical, and ready to use. No fluff. Unsubscribe any time.</p>
              <NewsletterForm />
            </FadeInSection>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        <section id="contact" className="py-20 border-t border-white/6">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <FadeInSection>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Need custom automation?</h2>
                <p className="text-[#888]">
                  Describe your environment and the problem. I&apos;ll give you an honest answer within one business day.
                </p>
              </div>
            </FadeInSection>
            <ContactForm />
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

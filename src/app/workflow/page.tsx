import type { Metadata } from 'next';
import { WorkflowGenerator } from '@/components/workflow/workflow-generator';
import { Zap, Download, Shield, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: 'n8n Workflow Generator — TaskPilot',
  description: 'Generate production-ready n8n workflow JSON from plain English. Describe your automation, pick your integrations, and get importable n8n workflows in seconds.',
};

const FEATURES = [
  { icon: Zap,     label: '30+ integrations',  desc: 'Slack, GitHub, Gmail, Notion, Stripe, and more' },
  { icon: Download, label: 'Import-ready JSON', desc: 'Drop directly into any n8n instance — no edits needed' },
  { icon: Shield,  label: 'Security by default', desc: 'Credentials are always referenced, never hardcoded' },
  { icon: Layers,  label: 'Any complexity',     desc: 'Simple 2-node flows to 15-node AI-powered automations' },
];

export default function WorkflowPage() {
  return (
    <main className="min-h-screen bg-black">

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-12 px-4">
        {/* Aurora blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora-blob aurora-violet" />
          <div className="aurora-blob aurora-cyan" />
          <div className="aurora-blob aurora-fuchsia" />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/8 px-3.5 py-1.5 mb-6">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300 tracking-wide">n8n Workflow Generator</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4 tracking-tight text-balance">
            Describe your automation.<br />
            <span className="text-[#6B7280]">Get production-ready n8n JSON.</span>
          </h1>

          <p className="text-base text-[#6B7280] max-w-lg mx-auto mb-10 leading-relaxed text-balance">
            Pick your trigger, select your integrations, describe what you want — and WorkflowPilot builds
            a valid n8n workflow you can import in seconds.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/8 px-3 py-1.5"
              >
                <Icon className="h-3 w-3 text-[#D1D5DB]" />
                <span className="text-xs text-[#D1D5DB] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Generator */}
      <section className="px-4 pb-24 max-w-2xl mx-auto">
        <WorkflowGenerator />
      </section>

      {/* Feature grid */}
      <section className="relative border-t border-white/12 bg-[#0A0A0A] py-16 px-4 overflow-hidden">
        {/* Dot grid texture — cards sit on top of this */}
        <div className="absolute inset-0 bg-grid-pattern-subtle pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-white uppercase tracking-widest mb-2">
              What makes this different
            </p>
            <p className="text-sm text-[#9CA3AF]">Built for IT admins and DevOps engineers who already use n8n.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-white/20 bg-[#111111] p-6 group hover:border-white/35 hover:bg-[#161616] transition-all duration-200 shadow-lg"
              >
                <div className="h-9 w-9 rounded-lg border border-white/25 bg-white/10 flex items-center justify-center mb-4 group-hover:border-white/40 group-hover:bg-white/15 transition-all duration-200">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-semibold text-white text-sm mb-1.5">{label}</p>
                <p className="text-sm text-[#A0A0A0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Dot grid texture */}
        <div className="absolute inset-0 bg-grid-pattern-subtle pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-white uppercase tracking-widest mb-2">
              How it works
            </p>
            <p className="text-sm text-[#9CA3AF]">From description to importable JSON in under 30 seconds.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { step: '01', title: 'Describe', body: 'Pick your trigger event and integrations, then describe what your automation should do in plain English.' },
              { step: '02', title: 'Generate', body: 'WorkflowPilot builds a complete n8n workflow JSON using real node types, proper connections, and error paths.' },
              { step: '03', title: 'Import', body: 'Copy or download the JSON, then paste it into n8n via Import Workflow. Configure credentials and activate.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-xl border border-white/20 bg-[#111111] p-6 shadow-lg">
                <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">{step}</p>
                <p className="font-semibold text-white text-sm mb-2">{title}</p>
                <p className="text-sm text-[#A0A0A0] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

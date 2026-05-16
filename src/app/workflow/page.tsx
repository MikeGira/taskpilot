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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-3 py-1.5"
              >
                <Icon className="h-3 w-3 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">{label}</span>
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
      <section className="border-t border-white/8 bg-[#0D0D0D] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest text-center mb-10">
            What makes this different
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-white/8 bg-white/2 p-5 group hover:border-white/14 hover:bg-white/4 transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center mb-3 group-hover:border-white/20 transition-colors">
                  <Icon className="h-4 w-4 text-[#9CA3AF]" />
                </div>
                <p className="font-semibold text-[#F9FAFB] text-sm mb-1">{label}</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest text-center mb-10">
            How it works
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Describe', body: 'Pick your trigger event and integrations, then describe what your automation should do in plain English.' },
              { step: '02', title: 'Generate', body: 'WorkflowPilot builds a complete n8n workflow JSON using real node types, proper connections, and error paths.' },
              { step: '03', title: 'Import', body: 'Copy or download the JSON, then paste it into n8n via Import Workflow. Configure credentials and activate.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest mb-3">{step}</p>
                <p className="font-semibold text-[#F9FAFB] text-sm mb-1.5">{title}</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

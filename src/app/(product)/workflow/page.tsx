import type { Metadata } from 'next';
import { WorkflowGenerator } from '@/components/workflow/workflow-generator';

export const metadata: Metadata = {
  title: 'n8n Workflow Generator - TaskPilot',
  description: 'Generate production-ready n8n workflow JSON from plain English. Describe your automation, pick your integrations, and get importable n8n workflows in seconds.',
};

export default function WorkflowPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <div className="pb-8 pt-12">
        <h1 className="text-xl font-semibold tracking-tight text-white">Generate an n8n workflow</h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Describe the automation. Get import-ready workflow JSON with credentials referenced, never hardcoded.
        </p>
      </div>
      <div className="pb-24">
        <WorkflowGenerator />
      </div>
    </div>
  );
}

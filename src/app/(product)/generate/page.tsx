import type { Metadata } from 'next';
import { GeneratorWizard } from '@/components/generator/generator-wizard';

export const metadata: Metadata = {
  title: 'Script Generator',
  description: 'Generate custom IT automation scripts for your exact OS and environment. Windows, Linux, macOS, on-premises, cloud, or hybrid.',
};

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task } = await searchParams;
  const initialTask = task ? decodeURIComponent(task) : '';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <div className="pb-8 pt-12">
        <h1 className="text-xl font-semibold tracking-tight text-white">Generate a script</h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Pick your target, describe the task. Production-ready output with error handling and logging.
        </p>
      </div>
      <div className="pb-24">
        <GeneratorWizard initialTask={initialTask} />
      </div>
    </div>
  );
}

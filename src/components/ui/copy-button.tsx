'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={cn(
        'inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-lg border border-white/8 px-2 py-1 text-xs font-medium text-[#A1A1AA] transition-colors duration-150 hover:border-white/25 hover:text-white',
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#3ECF8E]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

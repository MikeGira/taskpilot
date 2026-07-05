'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';
import { getHighlighter, resolveShikiLang } from '@/lib/shiki';
import type { ThemedToken } from 'shiki/core';

export const LANG_LABELS: Record<string, string> = {
  powershell: 'PowerShell',
  bash: 'Bash',
  python: 'Python',
  zsh: 'Zsh',
  terraform: 'Terraform HCL',
  yaml: 'YAML',
  puppet: 'Puppet',
  dockerfile: 'Dockerfile',
  groovy: 'Groovy (Jenkinsfile)',
  typescript: 'TypeScript',
  bicep: 'Azure Bicep',
  json: 'JSON',
};

const LOCKED_PREVIEW_LINES = 18;

interface CodeBlockProps {
  code: string;
  language: string | null;
  filename?: string | null;
  /** Overrides the derived language label in the header (e.g. "n8n JSON"). */
  languageLabel?: string;
  maxHeight?: number;
  locked?: boolean;
  /** Extra header controls rendered next to the copy button. */
  actions?: ReactNode;
}

export function CodeBlock({
  code,
  language,
  filename,
  languageLabel,
  maxHeight = 480,
  locked = false,
  actions,
}: CodeBlockProps) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const displayCode = locked ? code.split('\n').slice(0, LOCKED_PREVIEW_LINES).join('\n') : code;
  const shikiLang = resolveShikiLang(language);
  const langLabel = languageLabel ?? (language ? (LANG_LABELS[language] ?? language) : 'Script');

  useEffect(() => {
    if (!shikiLang) {
      setTokens(null);
      return;
    }
    let cancelled = false;
    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const result = highlighter.codeToTokens(displayCode, {
          lang: shikiLang,
          theme: 'github-dark-default',
        });
        setTokens(result.tokens);
      })
      .catch(() => {
        // Highlighting is progressive enhancement — plain text remains readable.
      });
    return () => {
      cancelled = true;
    };
  }, [displayCode, shikiLang]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0D0D0D]">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-2">
        <span className="truncate font-mono text-xs text-[#A1A1AA]">{filename ?? 'script'}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[#6B7280]">{langLabel}</span>
          {actions}
          {!locked && <CopyButton text={code} />}
        </div>
      </div>
      <div className="relative">
        <pre
          className={cn(
            'p-4 font-mono text-[13px] leading-relaxed text-[#E2E8F0]',
            locked ? 'max-h-[200px] select-none overflow-hidden' : 'overflow-auto'
          )}
          style={locked ? undefined : { maxHeight }}
        >
          <code>
            {tokens
              ? tokens.map((line, i) => (
                  <span key={i}>
                    {line.map((token, j) => (
                      <span key={j} style={token.color ? { color: token.color } : undefined}>
                        {token.content}
                      </span>
                    ))}
                    {i < tokens.length - 1 ? '\n' : ''}
                  </span>
                ))
              : displayCode}
          </code>
        </pre>
        {locked && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 border-t border-white/8 bg-black/90 px-4 py-5">
            <p className="text-sm font-medium text-[#F9FAFB]">Pro script: upgrade to unlock</p>
            <p className="text-xs text-[#A1A1AA]">Copy, download and save to history with Pro</p>
            <Button asChild size="sm" className="mt-1">
              <a href="/checkout">Upgrade to Pro, $12/mo</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

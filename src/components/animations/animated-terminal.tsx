'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LINES = [
  { kind: 'cmd', text: 'Connecting to domain controller...' },
  { kind: 'ok',  text: '247 user accounts found in Active Directory' },
  { kind: 'cmd', text: 'Applying 90-day inactivity policy...' },
  { kind: 'ok',  text: '23 accounts flagged and disabled' },
  { kind: 'cmd', text: 'Running disk cleanup on all servers...' },
  { kind: 'ok',  text: '4.2 GB freed, report saved to /logs/' },
];

const DELAY_PER_LINE = 700;
const LOOP_PAUSE = 2800;

export function AnimatedTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function showNext(n: number) {
      if (n < LINES.length) {
        timeout = setTimeout(() => {
          setVisibleCount(n + 1);
          showNext(n + 1);
        }, DELAY_PER_LINE);
      } else {
        timeout = setTimeout(() => {
          setVisibleCount(0);
          showNext(0);
        }, LOOP_PAUSE);
      }
    }

    timeout = setTimeout(() => showNext(0), 400);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="mx-auto mt-12 max-w-lg rounded-xl border border-white/20 bg-[#111] overflow-hidden shadow-2xl shadow-black/80"
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.8)' }}>
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] text-[#999] font-mono">taskpilot | PowerShell 5.1</span>
      </div>
      {/* Body */}
      <div className="px-5 py-4 font-mono text-[13px] sm:text-xs space-y-2 min-h-[160px]">
        {LINES.slice(0, visibleCount).map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-2 animate-fade-in',
              line.kind === 'cmd' ? 'text-[#aaa]' : 'text-white'
            )}
          >
            <span className={line.kind === 'cmd' ? 'text-white/40 select-none' : 'text-white/60 select-none'}>
              {line.kind === 'cmd' ? '❯' : '✓'}
            </span>
            <span>{line.text}</span>
          </div>
        ))}
        {/* Blinking cursor on last visible line or when idle */}
        <div className="flex items-center gap-2 text-[#888]">
          <span className="text-white/40 select-none">❯</span>
          <span
            className="inline-block h-3.5 w-[2px] bg-white/60 animate-cursor-blink"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

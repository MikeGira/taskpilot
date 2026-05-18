'use client';

import { useEffect, useState } from 'react';

/* ── Syntax token colours (VS Code dark+ palette) ────────────────────────── */
const C = {
  comment:  '#6A9955',
  keyword:  '#C586C0',
  cmdlet:   '#4EC9B0',
  param:    '#9CDCFE',
  string:   '#CE9178',
  number:   '#B5CEA8',
  plain:    '#D4D4D4',
} as const;

type Token = { t: string; c?: string };
const p = (t: string, c?: string): Token => ({ t, c });

/* ── PowerShell: disable inactive AD accounts ────────────────────────────── */
const CODE_LINES: Token[][] = [
  [p('# Disable AD accounts inactive for 90+ days', C.comment)],
  [p('param', C.keyword), p('('), p('[int]', C.param), p('$Days', C.param), p(' = '), p('90', C.number), p(')')],
  [],
  [p('$cutoff', C.param), p(' = ('), p('Get-Date', C.cmdlet), p(').'), p('AddDays', C.cmdlet), p('(-'), p('$Days', C.param), p(')')],
  [p('$stale', C.param), p('  = '), p('Get-ADUser', C.cmdlet), p(' -Filter', C.param), p(' *')],
  [p('           -Properties', C.param), p(' LastLogonDate')],
  [],
  [p('foreach', C.keyword), p(' ('), p('$user', C.param), p(' in '), p('$stale', C.param), p(') {')],
  [p('  if', C.keyword), p(' ('), p('$user', C.param), p('.LastLogonDate -lt '), p('$cutoff', C.param), p(') {')],
  [p('    '), p('Disable-ADAccount', C.cmdlet), p(' -Identity', C.param), p(' '), p('$user', C.param)],
  [p('    '), p('Write-Host', C.cmdlet), p(' "  Disabled: ', C.string), p('$($user.Name)', C.param), p('"', C.string)],
  [p('  }')],
  [p('}')],
  [],
  [p('Write-Host', C.cmdlet), p(' "Done: ', C.string), p('$($stale.Count)', C.param), p(' accounts secured."', C.string), p(' -ForegroundColor', C.param), p(' Green')],
];

const MS_PER_LINE = 380;
const PAUSE_MS    = 2600;

export function AnimatedTerminal() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

    function step(n: number) {
      if (n < CODE_LINES.length) {
        t = setTimeout(() => { setVisible(n + 1); step(n + 1); }, MS_PER_LINE);
      } else {
        t = setTimeout(() => { setVisible(0); step(0); }, PAUSE_MS);
      }
    }

    t = setTimeout(() => step(0), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="ide-terminal mx-auto mt-12 max-w-lg rounded-3xl overflow-hidden border-2 border-white/62">
      {/* macOS title bar */}
      <div className="ide-title-bar flex items-center gap-1.5 px-4 py-2.5 border-b border-white/42">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ide-filename ml-auto text-[11px] font-mono">
          Disable-InactiveAccounts.ps1
        </span>
      </div>

      {/* Code body */}
      <div className="ide-body py-3 font-mono text-[12.5px] leading-[1.65] h-[300px] overflow-hidden select-none">
        {CODE_LINES.slice(0, visible).map((line, i) => (
          <div key={i} className="animate-code-line flex min-h-[1.65em]">
            <span className="ide-line-number w-10 shrink-0 text-right pr-4">{i + 1}</span>
            <span className="flex-1 pr-5 truncate">
              {line.length === 0
                ? <span>&nbsp;</span>
                : line.map((tok, j) => (
                    <span key={j} style={{ color: tok.c ?? C.plain }}>{tok.t}</span>
                  ))
              }
            </span>
          </div>
        ))}

        {/* blinking cursor on current line */}
        {visible < CODE_LINES.length && (
          <div className="flex min-h-[1.65em] items-center">
            <span className="ide-line-number w-10 shrink-0 text-right pr-4">{visible + 1}</span>
            <span className="ide-cursor-block inline-block w-[2px] h-[14px] animate-[cursor-blink_1s_step-end_infinite]" />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface AnimatedBarProps {
  label: string;
  pct: number;
  count?: number;
  delay?: number;
  color?: string;
}

export function AnimatedBar({ label, pct, delay = 0, color = 'bg-emerald-400/70' }: AnimatedBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 50);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-[#D1D5DB] truncate max-w-[75%]">{label}</span>
        <span className="text-[#6B7280] tabular-nums ml-2">{pct}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

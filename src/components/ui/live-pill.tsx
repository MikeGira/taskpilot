'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LivePillProps {
  label: string;
  sublabel?: string;
  onAccept: () => void;
  onDecline: () => void;
  acceptLabel?: ReactNode;
  declineLabel?: ReactNode;
  visible?: boolean;
  autoHideMs?: number;
  className?: string;
}

export function LivePill({
  label,
  sublabel,
  onAccept,
  onDecline,
  acceptLabel = '✓',
  declineLabel = '✕',
  visible = true,
  autoHideMs,
  className,
}: LivePillProps) {
  const [mounted, setMounted] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (visible) {
      setHidden(false);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
      const t = setTimeout(() => setHidden(true), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !mounted) return;
    const interval = setInterval(() => {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }, 3200);
    return () => clearInterval(interval);
  }, [visible, mounted]);

  useEffect(() => {
    if (!autoHideMs || !visible) return;
    const t = setTimeout(() => { onDecline(); }, autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs, visible, onDecline]);

  function handleAccept() {
    setBouncing(true);
    setTimeout(() => { setBouncing(false); onAccept(); }, 280);
  }

  function handleDecline() {
    setBouncing(true);
    setTimeout(() => { setBouncing(false); onDecline(); }, 280);
  }

  if (hidden) return null;

  return (
    <div
      aria-live="assertive"
      className={cn(
        'relative inline-flex items-center gap-3 rounded-full bg-[#111] pl-5 pr-2.5 py-2.5',
        'transition-all duration-400',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        bouncing ? 'animate-live-pill-bounce' : '',
        className,
      )}
      style={{
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.15), ' +
          '0 0 0 3px rgba(255,255,255,0.06), ' +
          '0 0 40px 4px rgba(255,255,255,0.04), ' +
          '0 20px 60px rgba(0,0,0,0.95), ' +
          '0 6px 20px rgba(0,0,0,0.8)',
      }}
    >
      {/* Ambient pulse ring */}
      <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
        <span className="absolute inset-0 rounded-full animate-live-pill-glow" />
      </span>

      {/* Text */}
      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-sm font-semibold text-white leading-tight whitespace-nowrap">
          {label}
        </span>
        {sublabel && (
          <span className="text-[11px] text-white/50 leading-tight whitespace-nowrap">
            {sublabel}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 relative z-10">
        <button
          onClick={handleDecline}
          aria-label="Decline"
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            'bg-red-950 border border-red-500/50 text-red-400',
            'hover:bg-red-900 hover:border-red-400/80 hover:scale-110',
            'active:scale-95 transition-all duration-150',
          )}
        >
          {declineLabel}
        </button>
        <button
          onClick={handleAccept}
          aria-label="Accept"
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            'bg-emerald-950 border border-emerald-500/50 text-emerald-400',
            'hover:bg-emerald-900 hover:border-emerald-400/80 hover:scale-110',
            'active:scale-95 transition-all duration-150',
          )}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}

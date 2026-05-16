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
        'inline-flex items-center gap-3 rounded-full bg-[#0A0A0A] border border-white/12 pl-4 pr-2 py-2 shadow-2xl',
        'transition-all duration-400',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        bouncing ? 'animate-live-pill-bounce' : '',
        className,
      )}
      style={{
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.03)',
      }}
    >
      {/* Ambient pulse ring */}
      <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
        <span className="absolute inset-0 rounded-full animate-live-pill-glow" />
      </span>

      {/* Text */}
      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-xs font-semibold text-white leading-tight whitespace-nowrap">{label}</span>
        {sublabel && (
          <span className="text-[10px] text-[#6B7280] leading-tight whitespace-nowrap">{sublabel}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 relative z-10">
        <button
          onClick={handleDecline}
          aria-label="Decline"
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
            'bg-red-500/20 border border-red-500/30 text-red-400',
            'hover:bg-red-500/35 hover:border-red-500/50 hover:scale-110',
            'active:scale-95 transition-all duration-150',
          )}
        >
          {declineLabel}
        </button>
        <button
          onClick={handleAccept}
          aria-label="Accept"
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
            'bg-green-500/25 border border-green-500/35 text-green-400',
            'hover:bg-green-500/40 hover:border-green-500/55 hover:scale-110',
            'active:scale-95 transition-all duration-150',
          )}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}

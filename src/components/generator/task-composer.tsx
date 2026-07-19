'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowUp } from 'lucide-react';

const MAX_HEIGHT = 240;

interface TaskComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  submitLabel?: string;
  error?: string;
  autoFocus?: boolean;
}

export function TaskComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = 2000,
  placeholder,
  submitLabel = 'Generate',
  error,
  autoFocus = false,
}: TaskComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 flex items-start gap-1.5 text-[13px] text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <div className="rounded-xl border border-white/12 bg-[#0D0D0D] transition-colors duration-150 focus-within:border-[rgba(62,207,142,0.5)]">
        <textarea
          ref={textareaRef}
          data-testid="task-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !disabled) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          autoFocus={autoFocus}
          className="max-h-[240px] w-full resize-none bg-transparent px-4 pt-3 text-sm leading-relaxed text-[#F9FAFB] placeholder:text-[#6B7280] focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <span className="text-xs tabular-nums text-[#6B7280]">
            {value.length}/{maxLength}
          </span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            title={`${submitLabel} (Ctrl+Enter)`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-medium text-black transition-colors duration-150 hover:bg-white/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Improvement {
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface Analysis {
  summary: string;
  patterns: string[];
  improvements: Improvement[];
  analyzedCount: number;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: 'text-red-400 border-red-500/20 bg-red-500/5',
  medium: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  low: 'text-zinc-400 border-zinc-500/20 bg-zinc-500/5',
};

export function AnalyticsClient({ negativeCount }: { negativeCount: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  async function analyze() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/improve-prompt', { method: 'POST' });
      const data = await res.json() as Analysis & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed.');
        return;
      }
      setResult(data);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/4 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F9FAFB] mb-1">AI Prompt Improvement</h2>
          <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-sm">
            Sends your {negativeCount} negative {negativeCount === 1 ? 'rating' : 'ratings'} to Claude, which
            analyzes patterns and returns specific prompt changes you can apply to the generator.
          </p>
        </div>
        <Button
          onClick={analyze}
          disabled={loading || negativeCount === 0}
          size="sm"
          className="shrink-0 gap-1.5 bg-red-600 hover:bg-red-500 text-white"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing…' : 'Analyze Feedback'}
        </Button>
      </div>

      {negativeCount === 0 && !loading && (
        <p className="text-xs text-[#4B5563] italic">No negative feedback to analyze yet.</p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5 mt-4 border-t border-white/8 pt-4">
          <div>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm text-[#D1D5DB] leading-relaxed">{result.summary}</p>
          </div>

          {result.patterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Patterns Detected
              </p>
              <ul className="space-y-1.5">
                {result.patterns.map((p, i) => (
                  <li key={i} className="text-xs text-[#9CA3AF] flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Suggested Prompt Changes ({result.improvements.length})
              </p>
              <div className="space-y-2">
                {result.improvements.map((imp, i) => {
                  const style = PRIORITY_STYLE[imp.priority] ?? PRIORITY_STYLE.medium;
                  const isOpen = expanded === i;
                  return (
                    <div key={i} className={`rounded-lg border p-3 ${style}`}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className="w-full flex items-start justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 shrink-0">
                            {imp.priority}
                          </span>
                          <span className="text-xs text-[#F9FAFB] font-medium truncate">{imp.issue}</span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
                          : <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />}
                      </button>
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-current/15">
                          <p className="text-xs text-[#6B7280] mb-2 font-medium">Add to system prompt:</p>
                          <pre className="text-xs text-[#D1D5DB] whitespace-pre-wrap font-mono leading-relaxed bg-black/20 rounded-lg p-3">
                            {imp.suggestion}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-[#4B5563]">
            Based on {result.analyzedCount} negative {result.analyzedCount === 1 ? 'rating' : 'ratings'}.
            Apply changes manually to{' '}
            <code className="text-red-400/80 text-[11px]">src/app/api/generate/route.ts</code>.
          </p>
        </div>
      )}
    </div>
  );
}

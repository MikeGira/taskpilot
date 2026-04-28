'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const redirectTo = searchParams.redirectTo ?? '/dashboard';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <Terminal className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="font-bold text-xl text-[#F9FAFB]">
              Task<span className="text-emerald-400">Pilot</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Sign in to TaskPilot</h1>
          <p className="text-sm text-[#9CA3AF] mt-2">
            We&apos;ll email you a magic link — no password needed.
          </p>
        </div>

        {searchParams.error === 'auth_failed' && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            Authentication failed. Please try again.
          </div>
        )}

        {status === 'sent' ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="font-semibold text-[#F9FAFB] mb-2">Check your inbox</h2>
            <p className="text-sm text-[#9CA3AF]">
              We sent a magic link to <strong className="text-[#F9FAFB]">{email}</strong>.
              Click it to sign in.
            </p>
            <p className="text-xs text-[#4B5563] mt-4">
              Didn&apos;t get it? Check your spam folder or{' '}
              <button
                onClick={() => { setStatus('idle'); setEmail(''); }}
                className="text-emerald-400 hover:underline"
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-[#9CA3AF]">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send magic link'
                )}
              </Button>
            </div>
            <p className="text-center text-xs text-[#4B5563]">
              Don&apos;t have an account?{' '}
              <Link href="/checkout" className="text-emerald-400 hover:underline">
                Buy the kit first
              </Link>{' '}
              and your account is created automatically.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

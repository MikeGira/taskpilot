'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  const [mode, setMode]           = useState<'password' | 'magic'>('password');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [status, setStatus]       = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg]   = useState('');

  const supabase    = createClient();
  const router      = useRouter();
  const redirectTo  = searchParams.redirectTo ?? '/dashboard';

  function switchMode(next: 'password' | 'magic') {
    setMode(next);
    setStatus('idle');
    setErrorMsg('');
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus('loading');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setErrorMsg('');
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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#000000] px-4 overflow-hidden">
      {/* Dot grid — fades out around the card */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1.5px, transparent 1.5px)',
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse 60% 50% at 50% 52%, transparent 28%, black 62%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 52%, transparent 28%, black 62%)',
      }} />
      {/* Indigo spotlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <div className="h-64 w-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 65%)' }} />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/12">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-[#F9FAFB]">Task<span className="text-white">Pilot</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Sign in to TaskPilot</h1>
        </div>

        {/* Auth failed error */}
        {searchParams.error === 'auth_failed' && (
          <div className="mb-4 rounded-lg border border-white/12 bg-white/5 px-4 py-3 text-sm text-white">
            Authentication failed. Please try again.
          </div>
        )}

        {/* Magic link sent confirmation */}
        {status === 'sent' ? (
          <div className="rounded-xl border border-white/12 bg-white/5 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-white mx-auto mb-3" />
            <h2 className="font-semibold text-[#F9FAFB] mb-2">Check your inbox</h2>
            <p className="text-sm text-[#9CA3AF]">
              Sent a sign-in link to <strong className="text-[#F9FAFB]">{email}</strong>. Click it to sign in.
            </p>
            <p className="text-xs text-[#4B5563] mt-4">
              Didn&apos;t get it? Check spam or{' '}
              <button onClick={() => { setStatus('idle'); setEmail(''); }}
                className="text-white hover:underline">try again</button>.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-[#0D0D0D] overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-white/8">
              {(['password', 'magic'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'text-white border-b-2 border-white'
                      : 'text-[#6B7280] hover:text-[#9CA3AF]'
                  }`}
                >
                  {m === 'password' ? 'Password' : 'Magic link'}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {mode === 'password' ? (
                /* ── Password sign-in ── */
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="pw-email" className="text-sm font-medium text-[#9CA3AF]">Email</label>
                    <Input id="pw-email" type="email" placeholder="you@company.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="pw-password" className="text-sm font-medium text-[#9CA3AF]">Password</label>
                    <div className="relative">
                      <Input id="pw-password" type={showPw ? 'text' : 'password'}
                        placeholder="Your password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        required className="pr-10" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                        tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </Button>
                  <p className="text-xs text-[#4B5563] text-center">
                    No password yet?{' '}
                    <button type="button" onClick={() => switchMode('magic')} className="text-[#9CA3AF] hover:text-white underline underline-offset-2">
                      Sign in with magic link
                    </button>
                    {' '}first, then set one in Account settings.
                  </p>
                </form>
              ) : (
                /* ── Magic link ── */
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ml-email" className="text-sm font-medium text-[#9CA3AF]">Email</label>
                    <Input id="ml-email" type="email" placeholder="you@company.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <p className="text-xs text-[#4B5563]">
                    We&apos;ll email you a one-time sign-in link. No password needed.
                  </p>
                  {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send sign-in link'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#4B5563] mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/checkout" className="text-white hover:underline">Buy the kit first</Link>
          {' '}and your account is created automatically.
        </p>
      </div>
    </div>
  );
}

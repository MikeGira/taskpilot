'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export function ChangePasswordForm() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [status, setStatus]       = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setStatus('loading');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('done');
      setPassword('');
      setConfirm('');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Set a password so you can sign in directly without a magic link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'done' ? (
          <div className="flex items-center gap-2.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Password set. You can now sign in with email and password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="New password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white transition-colors"
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
            <Button
              type="submit"
              size="sm"
              disabled={status === 'loading' || !password || !confirm}
            >
              {status === 'loading'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : 'Set password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

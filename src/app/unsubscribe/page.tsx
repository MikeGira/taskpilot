'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('This unsubscribe link is missing required parameters.');
      return;
    }

    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage(`${email} has been unsubscribed. You won't receive any more emails from us.`);
        } else {
          setStatus('error');
          setMessage(data.error ?? 'This unsubscribe link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      });
  }, [token, email]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] px-4">
      <div className="max-w-sm w-full text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/12">
            <Terminal className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#F9FAFB]">
            Task<span className="text-white">Pilot</span>
          </span>
        </Link>

        <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 text-[#9CA3AF] mx-auto mb-4 animate-spin" />
              <p className="text-[#9CA3AF]">Processing your request...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-white mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#F9FAFB] mb-3">Unsubscribed</h1>
              <p className="text-sm text-[#9CA3AF] mb-6">{message}</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to home</Link>
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-white mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#F9FAFB] mb-3">Link invalid</h1>
              <p className="text-sm text-[#9CA3AF] mb-6">{message}</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to home</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <Loader2 className="h-8 w-8 text-[#9CA3AF] animate-spin" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

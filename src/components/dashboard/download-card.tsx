'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

interface DownloadCardProps {
  purchase: Record<string, unknown>;
}

export function DownloadCard({ purchase }: DownloadCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const product = purchase.products as Record<string, string> | null;

  async function handleDownload() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/download/${product?.slug ?? purchase.product_slug}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        setStatus('idle');
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Download failed. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-[#F9FAFB] truncate">
            {product?.name ?? (purchase.product_slug as string)}
          </h3>
          {product?.tagline && (
            <p className="text-sm text-[#9CA3AF] mt-0.5 truncate">{product.tagline}</p>
          )}
          <p className="text-xs text-[#4B5563] mt-1">
            Purchased {new Date(purchase.created_at as string).toLocaleDateString()}
          </p>
          {errorMsg && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
        </div>
        <Button
          onClick={handleDownload}
          disabled={status === 'loading'}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

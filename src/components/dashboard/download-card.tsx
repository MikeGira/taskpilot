'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Package } from 'lucide-react';

interface DownloadCardProps {
  purchase: Record<string, unknown>;
  downloadUrl: string | null;
}

export function DownloadCard({ purchase, downloadUrl }: DownloadCardProps) {
  const product = purchase.products as Record<string, string> | null;

  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${product?.slug ?? 'taskpilot-kit'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const purchaseDate = new Date(purchase.created_at as string);
  const dateStr = purchaseDate.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <Card className="hover:border-white/30 transition-colors duration-200">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/15">
          <Package className="h-5 w-5 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {product?.name ?? (purchase.product_slug as string)}
          </h3>
          {product?.tagline && (
            <p className="text-sm text-[#9CA3AF] mt-0.5 truncate">{product.tagline}</p>
          )}
          <p className="text-xs text-[#6B7280] mt-1">Purchased {dateStr}</p>
          {!downloadUrl && (
            <p className="text-xs text-amber-400 mt-1">
              Download link unavailable. Check your purchase confirmation email or contact support.
            </p>
          )}
        </div>
        <Button
          onClick={handleDownload}
          disabled={!downloadUrl}
          size="sm"
          className="shrink-0 gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}

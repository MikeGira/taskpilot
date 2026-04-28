'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
    a.click();
  }

  const purchaseDate = new Date(purchase.created_at as string);
  const dateStr = purchaseDate.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

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
          <p className="text-xs text-[#6B7280] mt-1">Purchased {dateStr}</p>
          {!downloadUrl && (
            <p className="text-xs text-amber-400 mt-1">
              Download link unavailable. Contact support or check your purchase confirmation email.
            </p>
          )}
        </div>
        <Button
          onClick={handleDownload}
          disabled={!downloadUrl}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}

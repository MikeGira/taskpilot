'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, Trash2, Loader2 } from 'lucide-react';

export function AccountActions() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');

  async function handleExport() {
    const res = await fetch('/api/account/export');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskpilot-data-export.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== 'DELETE') return;

    setDeleteStatus('loading');
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (res.ok) {
        router.push('/?deleted=true');
      } else {
        const data = await res.json();
        setDeleteStatus('error');
        setDeleteError(data.error ?? 'Deletion failed. Please try again.');
      }
    } catch {
      setDeleteStatus('error');
      setDeleteError('Network error. Please try again.');
    }
  }

  return (
    <div className="space-y-4">
      {/* GDPR Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export your data</CardTitle>
          <CardDescription>
            Download a copy of all your personal data (GDPR Article 20).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4" />
            Download my data
          </Button>
        </CardContent>
      </Card>

      {/* GDPR Delete Account */}
      <Card className="border-white/12">
        <CardHeader>
          <CardTitle className="text-base text-white">Delete account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data (GDPR Article 17).
            Purchase records are anonymized and retained for 7 years as required by law.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDelete} className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              Type <strong className="text-[#F9FAFB]">DELETE</strong> to confirm.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
            {deleteError && <p className="text-sm text-white">{deleteError}</p>}
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={deleteConfirm !== 'DELETE' || deleteStatus === 'loading'}
            >
              {deleteStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete my account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

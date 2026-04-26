'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
      <LogOut className="h-4 w-4" />
    </Button>
  );
}

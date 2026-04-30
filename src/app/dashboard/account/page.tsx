import { createClient } from '@/lib/supabase/server';
import { AccountActions } from '@/components/dashboard/account-actions';
import { ChangePasswordForm } from '@/components/dashboard/change-password-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = { title: 'Account Settings' };

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F9FAFB]">Account settings</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">Manage your data and privacy preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B7280] w-24">Email</span>
            <span className="text-sm text-[#F9FAFB]">{user!.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B7280] w-24">Member since</span>
            <span className="text-sm text-[#F9FAFB]">
              {new Date(user!.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordForm />

      <AccountActions />
    </div>
  );
}

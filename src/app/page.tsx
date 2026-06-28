import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';

const ROLE_URL_MAP: Record<string, string> = {
  organization_admin: '/admin',
  recruiter: '/recruiter',
  interviewer: '/interviewer',
};

export default async function Home() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold">Account Setup Required</h1>
          <p className="text-muted-foreground">
            Your account does not have a profile assigned. Please contact your
            organization administrator or{' '}
            <a href="/login" className="text-primary hover:underline">
              try signing in again
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (membership) {
    const url = ROLE_URL_MAP[membership.role];
    if (url) redirect(url);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30">
      <div className="text-center space-y-4 max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold">No Organization</h1>
        <p className="text-muted-foreground">
          Your account is not linked to any organization. Please contact your
          administrator.
        </p>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/shared/dashboard-shell';
import type { Role } from '@/types';

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/');
  if (membership.role !== 'interviewer') redirect('/');

  return (
    <DashboardShell role={membership.role as Role} profile={profile}>
      {children}
    </DashboardShell>
  );
}

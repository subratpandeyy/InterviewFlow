import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { UsersClient } from '@/components/admin/users-client';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();
  const [membersRes, invitationsRes] = await Promise.all([
    admin
      .from('organization_members')
      .select('id, role, user_id, profiles!inner(full_name, email)')
      .eq('organization_id', membership.organization_id),
    supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
  ]);

  const rawMembers = (membersRes.data ?? []) as unknown as { id: string; role: string; user_id: string; profiles: { full_name: string; email: string }[] }[];
  const members = rawMembers.map(m => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
  }));
  const invitations = invitationsRes.data ?? [];
  const pendingInvitations = invitations.filter((inv) => !inv.accepted_at);
  const acceptedInvitations = invitations.filter((inv) => inv.accepted_at);

  return (
    <UsersClient
      members={members}
      pendingInvitations={pendingInvitations}
      acceptedInvitations={acceptedInvitations}
      currentUserId={user.id}
    />
  );
}

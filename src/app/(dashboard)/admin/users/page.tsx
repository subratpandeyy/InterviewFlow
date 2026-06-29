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
  const [membersRes, profileRes, invitationsRes] = await Promise.all([
    admin
      .from('organization_members')
      .select('id, role, user_id')
      .eq('organization_id', membership.organization_id),
    admin
      .from('profiles')
      .select('user_id, full_name, email')
      .in(
        'user_id',
        (
          await admin
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', membership.organization_id)
        ).data?.map((m) => m.user_id) ?? [],
      ),
    supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
  ]);

  const profileByUserId = Object.fromEntries(
    (profileRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const members = (membersRes.data ?? []).map((m) => ({
    ...m,
    profiles: profileByUserId[m.user_id] ?? { full_name: '', email: '' },
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

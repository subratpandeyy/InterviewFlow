import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { InviteForm } from '@/components/invite/invite-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
      .select('role, user_id, profiles!inner(full_name, email)')
      .eq('organization_id', membership.organization_id),
    supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
  ]);

  const members = membersRes.data ?? [];
  const invitations = invitationsRes.data ?? [];
  const pendingInvitations = invitations.filter((inv) => !inv.accepted_at);
  const acceptedInvitations = invitations.filter((inv) => inv.accepted_at);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team Members</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground">No members found.</p>
                )}
                {members.map((m) => {
                  const row = m as unknown as { role: string; user_id: string; profiles: { full_name: string; email: string } };
                  const profile = row.profiles;
                  const initials = profile.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div key={m.user_id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                      <Badge variant={m.role === 'organization_admin' ? 'default' : 'secondary'}>
                        {m.role === 'organization_admin' ? 'Admin' : m.role === 'recruiter' ? 'Recruiter' : 'Interviewer'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations ({pendingInvitations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.role === 'recruiter' ? 'Recruiter' : 'Interviewer'} &middot; Expires{' '}
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {acceptedInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Accepted Invitations ({acceptedInvitations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {acceptedInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.role === 'recruiter' ? 'Recruiter' : 'Interviewer'} &middot; Accepted{' '}
                          {new Date(inv.accepted_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Accepted</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <InviteForm />
        </div>
      </div>
    </div>
  );
}

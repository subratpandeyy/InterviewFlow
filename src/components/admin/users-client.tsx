'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { XIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InviteForm } from '@/components/invite/invite-form';
import { removeMember, revokeInvitation, resendInvitation, updateMemberRole } from '@/lib/actions/admin';

interface Member {
  id: string;
  role: string;
  user_id: string;
  profiles: { full_name: string; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

interface UsersClientProps {
  members: Member[];
  pendingInvitations: Invitation[];
  acceptedInvitations: Invitation[];
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = {
  organization_admin: 'Admin',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
};

export function UsersClient({ members, pendingInvitations, acceptedInvitations, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [loadingMember, setLoadingMember] = useState<string | null>(null);

  const handleRemove = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    setLoadingMember(memberId);
    const formData = new FormData();
    formData.append('id', memberId);
    const result = await removeMember(formData);
    setLoadingMember(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Member removed');
      router.refresh();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingMember(memberId);
    const formData = new FormData();
    formData.append('id', memberId);
    formData.append('role', newRole);
    const result = await updateMemberRole(formData);
    setLoadingMember(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Role updated');
      router.refresh();
    }
  };

  const handleRevoke = async (invitationId: string) => {
    const formData = new FormData();
    formData.append('id', invitationId);
    const result = await revokeInvitation(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation revoked');
      router.refresh();
    }
  };

  const handleResend = async (invitationId: string) => {
    const formData = new FormData();
    formData.append('id', invitationId);
    const result = await resendInvitation(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation resent');
      router.refresh();
    }
  };

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
                  const profile = m.profiles;
                  const initials = profile.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const isSelf = m.user_id === currentUserId;
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
                      <div className="flex items-center gap-2">
                        {isSelf ? (
                          <Badge variant={m.role === 'organization_admin' ? 'default' : 'secondary'}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </Badge>
                        ) : (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, e.target.value)}
                              disabled={loadingMember === m.id}
                              className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs disabled:opacity-50"
                            >
                              <option value="organization_admin">Admin</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="interviewer">Interviewer</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={loadingMember === m.id}
                              onClick={() => handleRemove(m.id)}
                            >
                              <XIcon className="size-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </>
                        )}
                      </div>
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
                          {ROLE_LABELS[inv.role] ?? inv.role} &middot; Expires{' '}
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Pending</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleResend(inv.id)}>
                          Resend
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRevoke(inv.id)}>
                          Revoke
                        </Button>
                      </div>
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
                          {ROLE_LABELS[inv.role] ?? inv.role} &middot; Accepted{' '}
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

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { XIcon, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  const [loadingInvitation, setLoadingInvitation] = useState<string | null>(null);

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
    setLoadingInvitation(invitationId);
    const formData = new FormData();
    formData.append('id', invitationId);
    const result = await revokeInvitation(formData);
    setLoadingInvitation(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation revoked');
      router.refresh();
    }
  };

  const handleResend = async (invitationId: string) => {
    setLoadingInvitation(invitationId);
    const formData = new FormData();
    formData.append('id', invitationId);
    const result = await resendInvitation(formData);
    setLoadingInvitation(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation resent');
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your organization&apos;s team members and invitations</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Users className="size-8 mb-2" />
                          <p className="text-sm">No members yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
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
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSelf ? (
                            <Badge variant={m.role === 'organization_admin' ? 'default' : 'secondary'}>
                              {ROLE_LABELS[m.role] ?? m.role}
                            </Badge>
                          ) : (
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
                          )}
                        </TableCell>
                        <TableCell>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={loadingMember === m.id}
                              onClick={() => handleRemove(m.id)}
                            >
                              {loadingMember === m.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <XIcon className="size-4" />
                              )}
                              <span className="sr-only">Remove</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations ({pendingInvitations.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[inv.role] ?? inv.role} &middot; Expires{' '}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending</Badge>
                      <LoadingButton variant="outline" size="sm" loading={loadingInvitation === inv.id} onClick={() => handleResend(inv.id)}>
                        Resend
                      </LoadingButton>
                      <LoadingButton variant="outline" size="sm" loading={loadingInvitation === inv.id} onClick={() => handleRevoke(inv.id)}>
                        Revoke
                      </LoadingButton>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {acceptedInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Accepted Invitations ({acceptedInvitations.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {acceptedInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[inv.role] ?? inv.role} &middot; Accepted{' '}
                        {new Date(inv.accepted_at!).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="success">Accepted</Badge>
                  </div>
                ))}
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

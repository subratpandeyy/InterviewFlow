import { notFound } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { AcceptInviteForm } from '@/components/invite/accept-invite-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdmin();

  const { data: invitation } = await admin
    .from('invitations')
    .select('*, organization:organizations(name)')
    .eq('token', token)
    .single();

  if (!invitation) notFound();

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isAccepted = !!invitation.accepted_at;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>
                This invitation has expired. Please ask your organization admin to send a new one.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Already Accepted</CardTitle>
              <CardDescription>
                This invitation has already been accepted. Please sign in to access your account.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">You&apos;re Invited!</h1>
          <p className="text-sm text-muted-foreground">
            Join <strong>{invitation.organization?.name || 'the organization'}</strong> on InterviewFlow
          </p>
        </div>
        <AcceptInviteForm invitation={invitation} />
      </div>
    </div>
  );
}

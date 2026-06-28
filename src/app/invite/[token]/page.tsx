import { notFound } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { AcceptInviteForm } from '@/components/invite/accept-invite-form';

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
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="w-full max-w-md text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Invitation Expired</h1>
          <p className="text-muted-foreground">
            This invitation has expired. Please ask your organization admin to send a new one.
          </p>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="w-full max-w-md text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Already Accepted</h1>
          <p className="text-muted-foreground">
            This invitation has already been accepted. Please sign in to access your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">You&apos;re Invited!</h1>
          <p className="text-muted-foreground mt-1">
            Join <strong>{invitation.organization?.name || 'the organization'}</strong> on InterviewFlow
          </p>
        </div>
        <AcceptInviteForm invitation={invitation} />
      </div>
    </div>
  );
}

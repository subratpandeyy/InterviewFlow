import { createAdmin } from '@/lib/supabase/admin';
import { CandidatePortalVerify } from '@/components/candidate/portal-verify';

export const dynamic = 'force-dynamic';

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdmin();

  const { data: candidate } = await admin
    .from('candidates')
    .select('id, full_name, email')
    .eq('access_token', token)
    .gt('access_token_expires_at', new Date().toISOString())
    .is('deleted_at', null)
    .single();

  if (!candidate) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="w-full max-w-md text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
          <p className="text-muted-foreground">
            This access link is invalid or has expired. Please contact your recruiter for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 py-12">
      <div className="w-full max-w-md">
        <CandidatePortalVerify
          candidateId={candidate.id}
          candidateEmail={candidate.email}
          candidateName={candidate.full_name}
          accessToken={token}
        />
      </div>
    </div>
  );
}

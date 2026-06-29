import { createAdmin } from '@/lib/supabase/admin';
import { CandidatePortalVerify } from '@/components/candidate/portal-verify';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Invalid or Expired Link</CardTitle>
              <CardDescription>
                This access link is invalid or has expired. Please contact your recruiter for a new link.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
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

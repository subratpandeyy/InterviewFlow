import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import InterviewsClient from '@/components/recruiter/interviews-client';

export default async function InterviewsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*)')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  const { data: allMeetings } = await admin
    .from('interview_meetings')
    .select('*');

  const meetingsByInterview = Object.fromEntries(
    (allMeetings ?? []).map(m => [m.interview_id, m])
  );

  return (
    <InterviewsClient
      interviews={interviews ?? []}
      meetingsByInterview={meetingsByInterview}
    />
  );
}

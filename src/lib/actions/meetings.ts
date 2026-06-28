'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';

export async function updateMeetingLink(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || !['organization_admin', 'recruiter'].includes(membership.role)) {
    throw new Error('Unauthorized');
  }

  const interviewId = formData.get('interview_id') as string;
  const provider = formData.get('provider') as string;
  const meetingUrl = formData.get('meeting_url') as string;

  if (!interviewId || !provider || !meetingUrl) throw new Error('Missing required fields');

  const { error: interviewError } = await supabase
    .from('interviews')
    .update({
      meeting_link: meetingUrl,
      meeting_provider: provider,
    })
    .eq('id', interviewId);

  if (interviewError) throw new Error(interviewError.message);

  const { error: meetingError } = await supabase.from('interview_meetings').insert({
    interview_id: interviewId,
    provider,
    meeting_url: meetingUrl,
  });

  if (meetingError) throw new Error(meetingError.message);

  revalidatePath('/recruiter/interviews');
  revalidatePath('/interviewer/upcoming');
}

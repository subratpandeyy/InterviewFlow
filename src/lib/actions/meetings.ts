'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { requireRole, getCurrentUser, getCurrentProfile } from '@/lib/services/auth.service';
import * as interviewService from '@/lib/services/interview.service';
import { failure } from '@/lib/services/response';

export async function getInterviewDetails(token: string) {
  const result = await interviewService.getInterviewByToken(token);
  if (!result.success) return null;
  return result.data;
}

export async function confirmInterview(token: string) {
  const result = await interviewService.confirmInterview(token);
  if (!result.success) return { error: result.error.message };

  revalidatePath(`/book/${token}`);
  return { success: true };
}

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

  const admin = await createAdmin();

  const { error: interviewError } = await admin
    .from('interviews')
    .update({
      meeting_link: meetingUrl,
      meeting_provider: provider,
    })
    .eq('id', interviewId);

  if (interviewError) throw new Error(interviewError.message);

  const { error: meetingError } = await admin.from('interview_meetings').insert({
    interview_id: interviewId,
    provider,
    meeting_url: meetingUrl,
  });

  if (meetingError) throw new Error(meetingError.message);

  revalidatePath('/recruiter/interviews');
  revalidatePath('/interviewer/upcoming');
}

export async function updateMeeting(formData: FormData) {
  const ctx = await requireRole(['recruiter', 'interviewer']);

  const interviewId = formData.get('id') as string;
  if (!interviewId) return { error: 'id is required' };

  const meetingLink = formData.get('meeting_link') as string || undefined;
  const notes = formData.get('notes') as string || undefined;

  const result = await interviewService.updateInterview(interviewId, { meetingLink, notes });
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/interviews');
  revalidatePath('/interviewer/upcoming');
  return { success: true };
}

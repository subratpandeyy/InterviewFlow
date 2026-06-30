'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, getCurrentUser, getCurrentProfile } from '@/lib/services/auth.service';
import * as availabilityService from '@/lib/services/availability.service';
import * as feedbackService from '@/lib/services/feedback.service';

export async function setAvailability(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const dayOfWeek = parseInt(formData.get('day_of_week') as string);
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const isAvailable = formData.get('is_available') === 'true';

  const result = await availabilityService.upsertWeeklySlot({
    profileId: ctx.user.profileId,
    dayOfWeek,
    startTime,
    endTime,
    isAvailable,
  });

  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/interviewer/availability');
}

export async function submitFeedback(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const interviewId = formData.get('interview_id') as string;

  const result = await feedbackService.submitFeedback({
    interviewId,
    interviewerId: ctx.user.profileId,
    rating: parseInt(formData.get('rating') as string),
    communication: parseInt(formData.get('communication') as string),
    technicalSkills: parseInt(formData.get('technical_skills') as string),
    problemSolving: parseInt(formData.get('problem_solving') as string),
    comments: formData.get('comments') as string || undefined,
    recommendation: formData.get('recommendation') as string,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/interviewer/feedback');
  revalidatePath('/interviewer/upcoming');
}

export async function updateInterviewStatus(interviewId: string, status: string) {
  const { updateInterview } = await import('@/lib/services/interview.service');
  const result = await updateInterview(interviewId, { status });
  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/recruiter/interviews');
  revalidatePath('/interviewer/upcoming');
}

export async function editFeedback(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const feedbackId = formData.get('feedback_id') as string;
  if (!feedbackId) return { error: 'feedback_id is required' };

  const result = await feedbackService.editFeedback(feedbackId, ctx.user.profileId, {
    rating: parseInt(formData.get('rating') as string),
    communication: parseInt(formData.get('communication') as string),
    technicalSkills: parseInt(formData.get('technical_skills') as string),
    problemSolving: parseInt(formData.get('problem_solving') as string),
    comments: formData.get('comments') as string || undefined,
    recommendation: formData.get('recommendation') as string,
  });

  if (!result.success) return { error: result.error.message };
  revalidatePath('/interviewer/feedback');
  return { success: true };
}

export async function finalizeFeedback(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const feedbackId = formData.get('feedback_id') as string;
  if (!feedbackId) return { error: 'feedback_id is required' };

  const result = await feedbackService.finalizeFeedback(feedbackId, ctx.user.profileId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/interviewer/feedback');
  return { success: true };
}

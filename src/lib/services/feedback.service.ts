import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { InterviewFeedback } from '@/types';

export async function submitFeedback(params: {
  interviewId: string;
  interviewerId: string;
  rating: number;
  communication: number;
  technicalSkills: number;
  problemSolving: number;
  comments?: string;
  recommendation: string;
}): Promise<ActionResult<InterviewFeedback>> {
  const admin = createAdmin();

  const { data, error } = await admin.from('interview_feedback').insert({
    interview_id: params.interviewId,
    interviewer_id: params.interviewerId,
    rating: params.rating,
    communication: params.communication,
    technical_skills: params.technicalSkills,
    problem_solving: params.problemSolving,
    comments: params.comments || null,
    recommendation: params.recommendation,
  }).select().single();

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };

  await admin.from('interviews').update({ status: 'completed' }).eq('id', params.interviewId);

  return success(data as InterviewFeedback);
}

export async function editFeedback(
  feedbackId: string,
  interviewerId: string,
  params: {
    rating: number;
    communication: number;
    technicalSkills: number;
    problemSolving: number;
    comments?: string;
    recommendation: string;
  },
): Promise<ActionResult<InterviewFeedback>> {
  const admin = createAdmin();

  const { data: feedback } = await admin
    .from('interview_feedback')
    .select('id, interviewer_id, is_finalized')
    .eq('id', feedbackId)
    .single();

  if (!feedback) return { success: false, error: { code: 'NOT_FOUND', message: 'Feedback not found' } };
  if (feedback.interviewer_id !== interviewerId) return { success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
  if (feedback.is_finalized) return { success: false, error: { code: 'FINALIZED', message: 'Cannot edit finalized feedback' } };

  const { data, error } = await admin
    .from('interview_feedback')
    .update({
      rating: params.rating,
      communication: params.communication,
      technical_skills: params.technicalSkills,
      problem_solving: params.problemSolving,
      comments: params.comments || null,
      recommendation: params.recommendation,
    })
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as InterviewFeedback);
}

export async function finalizeFeedback(
  feedbackId: string,
  interviewerId: string,
): Promise<ActionResult<InterviewFeedback>> {
  const admin = createAdmin();

  const { data: feedback } = await admin
    .from('interview_feedback')
    .select('id, interviewer_id, is_finalized')
    .eq('id', feedbackId)
    .single();

  if (!feedback) return { success: false, error: { code: 'NOT_FOUND', message: 'Feedback not found' } };
  if (feedback.interviewer_id !== interviewerId) return { success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
  if (feedback.is_finalized) return { success: false, error: { code: 'FINALIZED', message: 'Feedback is already finalized' } };

  const { data, error } = await admin
    .from('interview_feedback')
    .update({ is_finalized: true })
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as InterviewFeedback);
}

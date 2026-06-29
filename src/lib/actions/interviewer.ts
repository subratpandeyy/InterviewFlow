'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';

export async function setAvailability(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const dayOfWeek = parseInt(formData.get('day_of_week') as string);
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const isAvailable = formData.get('is_available') === 'true';

  const { error } = await supabase.from('availability_slots').upsert({
    profile_id: profile.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    is_available: isAvailable,
  }, {
    onConflict: 'profile_id,day_of_week',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/availability');
}

export async function submitFeedback(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const interviewId = formData.get('interview_id') as string;

  const { error } = await supabase.from('interview_feedback').insert({
    interview_id: interviewId,
    interviewer_id: profile.id,
    rating: parseInt(formData.get('rating') as string),
    communication: parseInt(formData.get('communication') as string),
    technical_skills: parseInt(formData.get('technical_skills') as string),
    problem_solving: parseInt(formData.get('problem_solving') as string),
    comments: formData.get('comments') as string || null,
    recommendation: formData.get('recommendation') as string,
  });

  if (error) throw new Error(error.message);

  await supabase
    .from('interviews')
    .update({ status: 'completed' })
    .eq('id', interviewId);

  revalidatePath('/interviewer/feedback');
  revalidatePath('/interviewer/upcoming');
}

export async function updateInterviewStatus(interviewId: string, status: string) {
  const supabase = await createServer();
  const { error } = await supabase
    .from('interviews')
    .update({ status })
    .eq('id', interviewId);

  if (error) throw new Error(error.message);
  revalidatePath('/recruiter/interviews');
  revalidatePath('/interviewer/upcoming');
}

export async function editFeedback(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Profile not found' };

  const feedbackId = formData.get('feedback_id') as string;
  if (!feedbackId) return { error: 'feedback_id is required' };

  const { data: feedback, error: fetchError } = await supabase
    .from('interview_feedback')
    .select('id, interviewer_id, is_finalized')
    .eq('id', feedbackId)
    .single();

  if (fetchError || !feedback) return { error: 'Feedback not found' };
  if (feedback.interviewer_id !== profile.id) return { error: 'Unauthorized' };
  if (feedback.is_finalized) return { error: 'Cannot edit finalized feedback' };

  const { error } = await supabase
    .from('interview_feedback')
    .update({
      rating: parseInt(formData.get('rating') as string),
      communication: parseInt(formData.get('communication') as string),
      technical_skills: parseInt(formData.get('technical_skills') as string),
      problem_solving: parseInt(formData.get('problem_solving') as string),
      comments: formData.get('comments') as string || null,
      recommendation: formData.get('recommendation') as string,
    })
    .eq('id', feedbackId);

  if (error) return { error: error.message };
  revalidatePath('/interviewer/feedback');
  return { success: true };
}

export async function finalizeFeedback(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Profile not found' };

  const feedbackId = formData.get('feedback_id') as string;
  if (!feedbackId) return { error: 'feedback_id is required' };

  const { data: feedback, error: fetchError } = await supabase
    .from('interview_feedback')
    .select('id, interviewer_id, is_finalized')
    .eq('id', feedbackId)
    .single();

  if (fetchError || !feedback) return { error: 'Feedback not found' };
  if (feedback.interviewer_id !== profile.id) return { error: 'Unauthorized' };
  if (feedback.is_finalized) return { error: 'Feedback is already finalized' };

  const { error } = await supabase
    .from('interview_feedback')
    .update({ is_finalized: true })
    .eq('id', feedbackId);

  if (error) return { error: error.message };
  revalidatePath('/interviewer/feedback');
  return { success: true };
}

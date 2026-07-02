import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { InterviewerMetric } from '@/types';

export async function getMetrics(profileId: string): Promise<ActionResult<InterviewerMetric>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('interviewer_metrics')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };

  if (!data) {
    const { data: newMetrics, error: createError } = await admin
      .from('interviewer_metrics')
      .insert({ profile_id: profileId, organization_id: '' })
      .select()
      .single();

    if (createError) {
      return { success: false, error: { code: 'CREATE_FAILED', message: createError.message } };
    }
    return success(newMetrics as InterviewerMetric);
  }

  return success(data as InterviewerMetric);
}

export async function recalculateMetrics(profileId: string, organizationId: string): Promise<ActionResult<InterviewerMetric>> {
  const admin = createAdmin();

  const { data: interviews } = await admin
    .from('interviews')
    .select('*, interview_feedback:interview_feedback(*)')
    .eq('interviewer_id', profileId)
    .is('deleted_at', null);

  if (!interviews) {
    return { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch interviews' } };
  }

  const total = interviews.length;
  const completed = interviews.filter((i) => i.status === 'completed').length;
  const cancelled = interviews.filter((i) => i.status === 'cancelled').length;
  const noShow = interviews.filter((i) => i.status === 'no_show').length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const interviewsToday = interviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= todayStart;
  }).length;

  const interviewsThisWeek = interviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= weekStart;
  }).length;

  const interviewsThisMonth = interviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= monthStart;
  }).length;

  const upcoming = interviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return i.scheduled_at >= now.toISOString() && i.status !== 'completed' && i.status !== 'cancelled' && i.status !== 'no_show';
  }).length;

  const feedbacks = interviews.flatMap((i) => i.interview_feedback || []);
  const ratings = feedbacks.filter((f) => f.rating > 0).map((f) => f.rating);
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const completionRate = total > 0 ? (completed / total) * 100 : null;
  const noShowRate = total > 0 ? (noShow / total) * 100 : null;
  const rescheduleRate = total > 0 ? ((cancelled + noShow) / total) * 100 : null;

  const feedbackScores = feedbacks.filter((f) => f.rating > 0).map((f) => f.rating);
  const averageScore = feedbackScores.length > 0
    ? feedbackScores.reduce((a, b) => a + b, 0) / feedbackScores.length
    : null;

  const durations = interviews
    .filter((i) => i.duration_minutes && i.duration_minutes > 0)
    .map((i) => i.duration_minutes);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => (a || 0) + (b || 0), 0) / durations.length
    : null;

  const { data: existing } = await admin
    .from('interviewer_metrics')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  let result;
  const metricsData = {
    profile_id: profileId,
    organization_id: organizationId,
    total_interviews: total,
    completed_interviews: completed,
    total_cancelled_interviews: cancelled,
    total_no_show_interviews: noShow,
    total_rescheduled_interviews: cancelled + noShow,
    average_rating: averageRating ? Math.round(averageRating * 100) / 100 : null,
    average_candidate_rating: averageRating ? Math.round(averageRating * 100) / 100 : null,
    interview_completion_rate: completionRate ? Math.round(completionRate * 100) / 100 : null,
    no_show_rate: noShowRate ? Math.round(noShowRate * 100) / 100 : null,
    reschedule_rate: rescheduleRate ? Math.round(rescheduleRate * 100) / 100 : null,
    average_interview_score: averageScore ? Math.round(averageScore * 100) / 100 : null,
    interviews_today: interviewsToday,
    interviews_this_week: interviewsThisWeek,
    interviews_this_month: interviewsThisMonth,
    upcoming_interviews: upcoming,
    average_duration_minutes: avgDuration ? Math.round(avgDuration * 100) / 100 : null,
    feedback_completion_rate: null,
    on_time_percentage: null,
    average_feedback_submission_time: null,
  };

  if (existing) {
    const { data, error } = await admin
      .from('interviewer_metrics')
      .update(metricsData)
      .eq('profile_id', profileId)
      .select()
      .single();
    if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    result = data;
  } else {
    const { data, error } = await admin
      .from('interviewer_metrics')
      .insert(metricsData)
      .select()
      .single();
    if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
    result = data;
  }

  return success(result as InterviewerMetric);
}

export async function getAllMetrics(organizationId: string): Promise<ActionResult<InterviewerMetric[]>> {
  const admin = createAdmin();

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'interviewer');

  if (!interviewerMembers || interviewerMembers.length === 0) return success([]);

  const userIds = interviewerMembers.map((m) => m.user_id).filter(Boolean);

  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .in('user_id', userIds);

  const profileIds = (profiles ?? []).map((p) => p.id);

  if (profileIds.length === 0) return success([]);

  const { data, error } = await admin
    .from('interviewer_metrics')
    .select('*')
    .in('profile_id', profileIds);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as InterviewerMetric[]);
}

import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { Profile } from '@/types';

export interface WorkloadData {
  profileId: string;
  interviewsToday: number;
  interviewsThisWeek: number;
  interviewsThisMonth: number;
  upcomingInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  averageDurationMinutes: number | null;
  maxPerDay: number;
  maxPerWeek: number;
  availableHoursThisWeek: number;
  weeklyCapacityPercent: number;
}

export async function getWorkload(profileId: string): Promise<ActionResult<WorkloadData>> {
  const admin = createAdmin();

  const { data: profile } = await admin
    .from('profiles')
    .select('max_interviews_per_day, max_interviews_per_week')
    .eq('id', profileId)
    .single();

  const maxPerDay = (profile as Profile)?.max_interviews_per_day ?? 3;
  const maxPerWeek = (profile as Profile)?.max_interviews_per_week ?? 10;

  const { data: interviews } = await admin
    .from('interviews')
    .select('scheduled_at, duration_minutes, status')
    .eq('interviewer_id', profileId)
    .is('deleted_at', null);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allInterviews = interviews ?? [];

  const interviewsToday = allInterviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= todayStart;
  }).length;

  const interviewsThisWeek = allInterviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= weekStart;
  }).length;

  const interviewsThisMonth = allInterviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= monthStart;
  }).length;

  const upcomingInterviews = allInterviews.filter((i) => {
    if (!i.scheduled_at) return false;
    return i.scheduled_at >= now.toISOString() && i.status !== 'completed' && i.status !== 'cancelled' && i.status !== 'no_show';
  }).length;

  const completedInterviews = allInterviews.filter((i) => i.status === 'completed').length;
  const cancelledInterviews = allInterviews.filter((i) => i.status === 'cancelled' || i.status === 'no_show').length;

  const durations = allInterviews
    .filter((i) => i.duration_minutes && i.duration_minutes > 0)
    .map((i) => i.duration_minutes);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  const { data: slots } = await admin
    .from('availability_slots')
    .select('start_time, end_time')
    .eq('profile_id', profileId)
    .eq('is_available', true);

  const availableHoursThisWeek = (slots ?? []).reduce((total, slot) => {
    const start = slot.start_time.split(':').map(Number);
    const end = slot.end_time.split(':').map(Number);
    const hours = (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60;
    return total + (hours > 0 ? hours : 0);
  }, 0);

  const weeklyCapacityPercent = maxPerWeek > 0
    ? Math.round((interviewsThisWeek / maxPerWeek) * 100)
    : 0;

  return success({
    profileId,
    interviewsToday,
    interviewsThisWeek,
    interviewsThisMonth,
    upcomingInterviews,
    completedInterviews,
    cancelledInterviews,
    averageDurationMinutes: avgDuration ? Math.round(avgDuration * 100) / 100 : null,
    maxPerDay,
    maxPerWeek,
    availableHoursThisWeek,
    weeklyCapacityPercent,
  });
}

export async function getOrganizationWorkloads(organizationId: string): Promise<ActionResult<WorkloadData[]>> {
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

  const results: WorkloadData[] = [];
  for (const pid of profileIds) {
    const result = await getWorkload(pid);
    if (result.success) {
      results.push(result.data);
    }
  }

  return success(results);
}

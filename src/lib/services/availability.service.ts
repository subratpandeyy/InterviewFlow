import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { AvailabilitySlot, InterviewerAvailability } from '@/types';

export async function upsertWeeklySlot(params: {
  profileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('availability_slots').upsert({
    profile_id: params.profileId,
    day_of_week: params.dayOfWeek,
    start_time: params.startTime,
    end_time: params.endTime,
    is_available: params.isAvailable,
  }, {
    onConflict: 'profile_id,day_of_week',
    ignoreDuplicates: false,
  });

  if (error) return { success: false, error: { code: 'UPSERT_FAILED', message: error.message } };
  return success(undefined);
}

export async function addDateSpecificSlot(params: {
  interviewerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: 'available' | 'booked' | 'blocked';
}): Promise<ActionResult<void>> {
  const admin = createAdmin();

  if (params.startTime >= params.endTime) {
    return { success: false, error: { code: 'INVALID_TIME', message: 'Start time must be before end time' } };
  }

  if (params.status === 'available') {
    const { data: overlap } = await admin
      .from('interviewer_availability')
      .select('id, start_time, end_time')
      .eq('interviewer_id', params.interviewerId)
      .eq('date', params.date)
      .eq('status', 'available')
      .lt('start_time', params.endTime)
      .gt('end_time', params.startTime);

    if (overlap && overlap.length > 0) {
      return { success: false, error: { code: 'OVERLAP', message: 'This slot overlaps with existing availability' } };
    }
  }

  const { error } = await admin.from('interviewer_availability').insert({
    interviewer_id: params.interviewerId,
    date: params.date,
    start_time: params.startTime,
    end_time: params.endTime,
    status: params.status || 'available',
  });

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  return success(undefined);
}

export async function removeSlot(slotId: string, interviewerId: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('interviewer_availability')
    .delete()
    .eq('id', slotId)
    .eq('interviewer_id', interviewerId);

  if (error) return { success: false, error: { code: 'DELETE_FAILED', message: error.message } };
  return success(undefined);
}

export async function blockDate(interviewerId: string, date: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('interviewer_availability').insert({
    interviewer_id: interviewerId,
    date,
    start_time: '00:00',
    end_time: '23:59',
    status: 'blocked',
  });

  if (error) return { success: false, error: { code: 'BLOCK_FAILED', message: error.message } };
  return success(undefined);
}

import { createAdmin } from '@/lib/supabase/admin';
import { success, paginated, type ActionResult, type PaginatedData } from './response';
import { getInterviewerTokens, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendar.service';
import { sendInterviewScheduledNotification, sendInterviewRescheduledNotification, sendInterviewCancelledNotification } from './notification.service';
import type { Interview } from '@/types';

interface CreateInterviewParams {
  organizationId: string;
  candidateId: string;
  positionId: string;
  interviewerId: string;
  recruiterId: string;
  interviewType: string;
  durationMinutes: number;
  notes?: string;
}

interface UpdateInterviewParams {
  scheduledAt?: string;
  status?: string;
  notes?: string;
  meetingLink?: string;
  meetingProvider?: string;
}

interface ListInterviewsParams {
  organizationId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  candidateId?: string;
  interviewerId?: string;
  positionId?: string;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function createInterview(params: CreateInterviewParams): Promise<ActionResult<Interview>> {
  const admin = createAdmin();
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: interview, error: interviewError } = await admin
    .from('interviews')
    .insert({
      organization_id: params.organizationId,
      candidate_id: params.candidateId,
      position_id: params.positionId,
      interviewer_id: params.interviewerId,
      recruiter_id: params.recruiterId,
      interview_type: params.interviewType,
      duration_minutes: params.durationMinutes,
      status: 'pending',
      notes: params.notes || null,
      booking_token: token,
      booking_expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (interviewError) return { success: false, error: { code: 'CREATE_FAILED', message: interviewError.message } };

  const { error: bookingError } = await admin
    .from('bookings')
    .insert({
      interview_id: interview.id,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });

  if (bookingError) return { success: false, error: { code: 'BOOKING_FAILED', message: bookingError.message } };

  return success(interview as Interview);
}

export async function updateInterview(
  id: string,
  params: UpdateInterviewParams,
): Promise<ActionResult<Interview>> {
  const admin = createAdmin();

  const { data: interview } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), interviewer:profiles!interviewer_id(*)')
    .eq('id', id)
    .single();

  if (!interview) return { success: false, error: { code: 'NOT_FOUND', message: 'Interview not found' } };

  const oldScheduledAt = interview.scheduled_at;
  const isStatusChangeToCancelled = params.status === 'cancelled' && interview.status !== 'cancelled';
  const isTimeChange = params.scheduledAt && oldScheduledAt && params.scheduledAt !== oldScheduledAt;

  const updateData: Record<string, unknown> = {};
  if (params.scheduledAt !== undefined) updateData.scheduled_at = params.scheduledAt;
  if (params.status !== undefined) updateData.status = params.status;
  if (params.notes !== undefined) updateData.notes = params.notes;
  if (params.meetingLink !== undefined) updateData.meeting_link = params.meetingLink;
  if (params.meetingProvider !== undefined) updateData.meeting_provider = params.meetingProvider;

  const { error } = await admin
    .from('interviews')
    .update(updateData)
    .eq('id', id);

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };

  // Handle calendar sync
  const googleTokens = await getInterviewerTokens(interview.interviewer_id);

  if (googleTokens) {
    try {
      if (isStatusChangeToCancelled && interview.calendar_event_id) {
        await deleteCalendarEvent(
          googleTokens.accessToken,
          googleTokens.refreshToken,
          googleTokens.calendarEmail,
          interview.calendar_event_id,
        );

        await admin.from('interviews').update({
          calendar_event_id: null,
          calendar_id: null,
        }).eq('id', id);

        await sendInterviewCancelledNotification({
          organizationId: interview.organization_id,
          candidateEmail: interview.candidate?.email || '',
          candidateName: interview.candidate?.full_name || 'Candidate',
          interviewerId: interview.interviewer_id,
          interviewerEmail: interview.interviewer?.email || '',
        });
      } else if (isTimeChange && interview.calendar_event_id) {
        const startDateTime = new Date(params.scheduledAt!);
        const endDateTime = new Date(startDateTime.getTime() + (interview.duration_minutes || 60) * 60 * 1000);

        await updateCalendarEvent(
          googleTokens.accessToken,
          googleTokens.refreshToken,
          googleTokens.calendarEmail,
          interview.calendar_event_id,
          { startTime: startDateTime, endTime: endDateTime },
        );

        const formattedOld = new Date(oldScheduledAt!).toLocaleString();
        const formattedNew = new Date(params.scheduledAt!).toLocaleString();
        const meetingLink = interview.meeting_link || '';

        await sendInterviewRescheduledNotification({
          organizationId: interview.organization_id,
          candidateEmail: interview.candidate?.email || '',
          candidateName: interview.candidate?.full_name || 'Candidate',
          interviewerId: interview.interviewer_id,
          interviewerEmail: interview.interviewer?.email || '',
          oldDate: formattedOld,
          newDate: formattedNew,
          meetingLink,
        });
      } else if (params.status === 'scheduled' && params.scheduledAt && !interview.calendar_event_id) {
        const startDateTime = new Date(params.scheduledAt);
        const endDateTime = new Date(startDateTime.getTime() + (interview.duration_minutes || 60) * 60 * 1000);

        const event = await createCalendarEvent(
          googleTokens.accessToken,
          googleTokens.refreshToken,
          googleTokens.calendarEmail,
          {
            summary: `Interview: ${interview.candidate?.full_name || 'Candidate'}`,
            description: `Interview with ${interview.candidate?.full_name || 'Candidate'} (${interview.candidate?.email || ''})\nPosition: ${interview.notes || ''}`,
            startTime: startDateTime,
            endTime: endDateTime,
            attendeeEmails: [interview.candidate?.email].filter(Boolean) as string[],
          },
        );

        const meetingLink = event.hangoutLink || interview.meeting_link || '';

        await admin.from('interviews').update({
          calendar_event_id: event.id || null,
          calendar_id: googleTokens.calendarEmail,
          meeting_link: meetingLink,
          meeting_provider: 'google_meet',
        }).eq('id', id);

        if (meetingLink) {
          await admin.from('interview_meetings').insert({
            interview_id: id,
            provider: 'google_meet',
            meeting_url: meetingLink,
          });
        }

        const formattedDate = startDateTime.toLocaleString();
        await sendInterviewScheduledNotification({
          organizationId: interview.organization_id,
          candidateEmail: interview.candidate?.email || '',
          candidateName: interview.candidate?.full_name || 'Candidate',
          interviewerId: interview.interviewer_id,
          interviewerEmail: interview.interviewer?.email || '',
          interviewDate: formattedDate,
          meetingLink,
        });
      }
    } catch (err) {
      console.error('[interview.service] Calendar sync failed:', err);
    }
  } else if (isStatusChangeToCancelled) {
    await sendInterviewCancelledNotification({
      organizationId: interview.organization_id,
      candidateEmail: interview.candidate?.email || '',
      candidateName: interview.candidate?.full_name || 'Candidate',
      interviewerId: interview.interviewer_id,
      interviewerEmail: interview.interviewer?.email || '',
    });
  }

  return success(interview as Interview);
}

export async function deleteInterview(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: interview } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), interviewer:profiles!interviewer_id(*)')
    .eq('id', id)
    .single();

  if (interview?.calendar_event_id) {
    const googleTokens = await getInterviewerTokens(interview.interviewer_id);
    if (googleTokens) {
      try {
        await deleteCalendarEvent(
          googleTokens.accessToken,
          googleTokens.refreshToken,
          googleTokens.calendarEmail,
          interview.calendar_event_id,
        );
      } catch (err) {
        console.error('[interview.service] Failed to delete calendar event:', err);
      }
    }
  }

  const { error } = await admin
    .from('interviews')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: { code: 'DELETE_FAILED', message: error.message } };

  if (interview) {
    await sendInterviewCancelledNotification({
      organizationId: interview.organization_id,
      candidateEmail: interview.candidate?.email || '',
      candidateName: interview.candidate?.full_name || 'Candidate',
      interviewerId: interview.interviewer_id,
      interviewerEmail: interview.interviewer?.email || '',
    });
  }

  return success(undefined);
}

export async function getInterview(id: string): Promise<ActionResult<Interview>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*), interviewer:profiles!interviewer_id(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Interview not found' } };
  return success(data as unknown as Interview);
}

export async function getInterviewByToken(token: string): Promise<ActionResult<Interview>> {
  const admin = createAdmin();

  const { data: interview, error } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*), interviewer:profiles!interviewer_id(*), booking:bookings(*)')
    .eq('booking_token', token)
    .is('deleted_at', null)
    .single();

  if (error || !interview) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Interview not found' } };
  }

  return success(interview as unknown as Interview);
}

export async function confirmInterview(token: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status')
    .eq('token', token)
    .single();

  if (!booking) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } };
  }

  if (booking.status !== 'pending') {
    return { success: false, error: { code: 'ALREADY_PROCESSED', message: 'Booking already processed' } };
  }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('token', token);

  if (error) {
    return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  }

  return success(undefined);
}

export async function listInterviews(
  params: ListInterviewsParams,
): Promise<ActionResult<PaginatedData<Interview>>> {
  const admin = createAdmin();
  const { organizationId, page = 1, pageSize = 20, status, candidateId, interviewerId, positionId } = params;

  let query = admin
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (status) query = query.eq('status', status);
  if (candidateId) query = query.eq('candidate_id', candidateId);
  if (interviewerId) query = query.eq('interviewer_id', interviewerId);
  if (positionId) query = query.eq('position_id', positionId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(paginated(data as unknown as Interview[], count ?? 0, page, pageSize));
}

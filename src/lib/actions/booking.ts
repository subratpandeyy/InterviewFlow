'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { getInterviewerTokens, createCalendarEvent } from '@/lib/services/calendar.service';
import { notifyInterviewScheduled } from '@/lib/notifications';
import * as rateLimiter from '@/lib/services/rate-limiter';

export async function bookInterviewSlot(interviewId: string, date: string, startTime: string, token: string) {
  const rateResult = rateLimiter.check(`booking:${token}`, 5, 60);
  if (!rateResult.allowed) throw new Error('Too many attempts. Please try again later.');

  const admin = createAdmin();

  const { data: interview } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), booking:bookings(*), interviewer:profiles!interviewer_id(*), position:positions(*)')
    .eq('id', interviewId)
    .single();

  if (!interview || !interview.booking) {
    throw new Error('Interview not found');
  }

  if (interview.booking.status !== 'pending') {
    throw new Error('Booking already processed');
  }

  const scheduledAt = `${date}T${startTime}:00`;
  const startDateTime = new Date(scheduledAt);
  const endDateTime = new Date(startDateTime.getTime() + (interview.duration_minutes || 60) * 60 * 1000);

  const googleTokens = await getInterviewerTokens(interview.interviewer_id);

  if (googleTokens) {
    const event = await createCalendarEvent(
      googleTokens.accessToken,
      googleTokens.refreshToken,
      googleTokens.calendarEmail,
      {
        summary: `Interview: ${interview.candidate?.full_name || 'Candidate'}`,
        description: `Interview with ${interview.candidate?.full_name || 'Candidate'} (${interview.candidate?.email || ''})\nPosition: ${interview.position?.title || interview.notes || ''}`,
        startTime: startDateTime,
        endTime: endDateTime,
        attendeeEmails: [interview.candidate?.email].filter(Boolean) as string[],
      },
    );

    const meetingLink = event.hangoutLink || '';
    const meetingProvider = 'google_meet';

    const { error: interviewError } = await admin
      .from('interviews')
      .update({
        scheduled_at: scheduledAt,
        meeting_link: meetingLink,
        meeting_provider: meetingProvider,
        status: 'scheduled',
        calendar_event_id: event.id || null,
        calendar_id: googleTokens.calendarEmail,
      })
      .eq('id', interviewId);

    if (interviewError) throw new Error(interviewError.message);

    if (meetingLink) {
      const { error: meetingError } = await admin.from('interview_meetings').insert({
        interview_id: interviewId,
        provider: meetingProvider,
        meeting_url: meetingLink,
      });
      if (meetingError) throw new Error(meetingError.message);
    }

    const { error: bookingError } = await admin
      .from('bookings')
      .update({ status: 'booked' })
      .eq('token', token);

    if (bookingError) throw new Error(bookingError.message);

    const formattedDate = startDateTime.toLocaleString();
    const candidateName = interview.candidate?.full_name || 'Candidate';
    const candidateEmail = interview.candidate?.email || '';
    const interviewerEmail = interview.interviewer?.email || '';

    if (candidateEmail) {
      await sendEmail({
        to: candidateEmail,
        subject: 'Interview Confirmed',
        html: `
          <h1>Interview Confirmed</h1>
          <p>Your interview has been booked successfully.</p>
          <p><strong>Date & Time:</strong> ${formattedDate}</p>
          <p><strong>Interviewer:</strong> ${interview.interviewer?.full_name || 'TBD'}</p>
          <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          <p>Please keep this link safe. You will need it to join the interview.</p>
        `,
      });
    }

    await notifyInterviewScheduled({
      organizationId: interview.organization_id,
      candidateEmail,
      candidateName,
      interviewerId: interview.interviewer_id,
      interviewerEmail,
      interviewDate: formattedDate,
      meetingLink,
    });

    revalidatePath(`/book/${token}`);
    redirect(`/book/${token}?confirmed=true`);
  } else {
    const meetingLink = `https://meet.google.com/new`;
    const meetingProvider = 'google_meet';

    const { error: interviewError } = await admin
      .from('interviews')
      .update({
        scheduled_at: scheduledAt,
        meeting_link: meetingLink,
        meeting_provider: meetingProvider,
        status: 'scheduled',
      })
      .eq('id', interviewId);

    if (interviewError) throw new Error(interviewError.message);

    const { error: meetingError } = await admin.from('interview_meetings').insert({
      interview_id: interviewId,
      provider: meetingProvider,
      meeting_url: meetingLink,
    });

    if (meetingError) throw new Error(meetingError.message);

    const { error: bookingError } = await admin
      .from('bookings')
      .update({ status: 'booked' })
      .eq('token', token);

    if (bookingError) throw new Error(bookingError.message);

    const formattedDate = startDateTime.toLocaleString();

    if (interview.candidate?.email) {
      await sendEmail({
        to: interview.candidate.email,
        subject: 'Interview Confirmed',
        html: `
          <h1>Interview Confirmed</h1>
          <p>Your interview has been booked successfully.</p>
          <p><strong>Date & Time:</strong> ${formattedDate}</p>
          <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          <p>Please keep this link safe. You will need it to join the interview.</p>
        `,
      });
    }

    revalidatePath(`/book/${token}`);
    redirect(`/book/${token}?confirmed=true`);
  }
}

export async function cancelBooking(formData: FormData) {
  const token = formData.get('token') as string;

  if (!token) throw new Error('Missing booking token');

  const admin = createAdmin();

  const { error } = await admin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('token', token);

  if (error) throw new Error(error.message);

  revalidatePath(`/book/${token}`);
  return { success: true };
}

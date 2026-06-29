'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { getInterviewerTokens } from '@/lib/google/tokens';
import { createCalendarEvent } from '@/lib/google/calendar';

export async function bookInterviewSlot(interviewId: string, date: string, startTime: string, token: string) {
  const admin = createAdmin();

  const { data: interview } = await admin
    .from('interviews')
    .select('*, candidate:candidates(*), booking:bookings(*)')
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
        description: `Interview with ${interview.candidate?.full_name || 'Candidate'} (${interview.candidate?.email || ''})`,
        startTime: startDateTime,
        endTime: endDateTime,
        attendeeEmails: [interview.candidate?.email].filter(Boolean) as string[],
      },
    );

    const meetingLink = event.hangoutLink || `https://meet.google.com/new`;
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
  } else {
    const { data: availabilitySlot } = await admin
      .from('interviewer_availability')
      .select('id')
      .eq('interviewer_id', interview.interviewer_id)
      .eq('date', date)
      .eq('start_time', startTime)
      .eq('status', 'available')
      .single();

    if (!availabilitySlot) {
      throw new Error('This slot is no longer available. Please select another time.');
    }

    const { error: updateSlotError } = await admin
      .from('interviewer_availability')
      .update({ status: 'booked' })
      .eq('id', availabilitySlot.id);

    if (updateSlotError) throw new Error(updateSlotError.message);

    const meetingProvider = 'google_meet';
    const meetingLink = `https://meet.google.com/new`;

    const { error: interviewError } = await admin
      .from('interviews')
      .update({
        scheduled_at: scheduledAt,
        meeting_link: meetingLink,
        meeting_provider: meetingProvider,
        status: 'scheduled',
      })
      .eq('id', interviewId);

    if (interviewError) {
      await admin.from('interviewer_availability').update({ status: 'available' }).eq('id', availabilitySlot.id);
      throw new Error(interviewError.message);
    }

    const { error: meetingError } = await admin.from('interview_meetings').insert({
      interview_id: interviewId,
      provider: meetingProvider,
      meeting_url: meetingLink,
    });

    if (meetingError) {
      await admin.from('interviewer_availability').update({ status: 'available' }).eq('id', availabilitySlot.id);
      throw new Error(meetingError.message);
    }

    const { error: bookingError } = await admin
      .from('bookings')
      .update({ status: 'booked' })
      .eq('token', token);

    if (bookingError) {
      await admin.from('interviewer_availability').update({ status: 'available' }).eq('id', availabilitySlot.id);
      throw new Error(bookingError.message);
    }

    const formattedDate = new Date(scheduledAt).toLocaleString();

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

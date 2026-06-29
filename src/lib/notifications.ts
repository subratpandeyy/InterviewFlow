import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import type { NotificationType } from '@/types';

export async function createNotification(params: {
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  const admin = createAdmin();
  const { error } = await admin.from('notifications').insert({
    organization_id: params.organizationId,
    recipient_id: params.recipientId,
    type: params.type,
    title: params.title,
    message: params.message,
  });
  if (error) console.error('[notifications] Failed to create notification:', error.message);
}

export async function notifyInterviewScheduled(params: {
  organizationId: string;
  candidateEmail: string;
  candidateName: string;
  interviewerId: string;
  interviewerEmail: string;
  recruiterEmail?: string;
  interviewDate: string;
  meetingLink: string;
}) {
  const admin = createAdmin();

  const { data: interviewerProfile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', params.interviewerId)
    .single();

  if (interviewerProfile) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: interviewerProfile.id,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `An interview has been scheduled for ${params.candidateName} on ${params.interviewDate}.`,
    });
  }

  if (params.interviewerEmail) {
    await sendEmail({
      to: params.interviewerEmail,
      subject: 'Interview Scheduled',
      html: `
        <h1>Interview Scheduled</h1>
        <p>An interview has been scheduled with <strong>${params.candidateName}</strong>.</p>
        <p><strong>Date & Time:</strong> ${params.interviewDate}</p>
        <p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>
        <p>Please be prepared and join at the scheduled time.</p>
      `,
    });
  }

  if (params.candidateEmail) {
    await sendEmail({
      to: params.candidateEmail,
      subject: 'Interview Confirmed',
      html: `
        <h1>Interview Confirmed</h1>
        <p>Your interview has been scheduled successfully.</p>
        <p><strong>Date & Time:</strong> ${params.interviewDate}</p>
        <p><strong>Interviewer:</strong> ${interviewerProfile?.full_name || 'TBD'}</p>
        <p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>
        <p>Please keep this link safe. You will need it to join the interview.</p>
      `,
    });
  }
}

export async function notifyInterviewRescheduled(params: {
  organizationId: string;
  candidateEmail: string;
  candidateName: string;
  interviewerId: string;
  interviewerEmail: string;
  oldDate: string;
  newDate: string;
  meetingLink: string;
}) {
  const admin = createAdmin();

  const { data: interviewerProfile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', params.interviewerId)
    .single();

  if (interviewerProfile) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: interviewerProfile.id,
      type: 'interview_rescheduled',
      title: 'Interview Rescheduled',
      message: `Interview with ${params.candidateName} has been rescheduled from ${params.oldDate} to ${params.newDate}.`,
    });
  }

  const subject = 'Interview Rescheduled';
  const html = (recipient: string) => `
    <h1>Interview Rescheduled</h1>
    <p>Dear ${recipient},</p>
    <p>The interview with <strong>${params.candidateName}</strong> has been rescheduled.</p>
    <p><strong>Previous Time:</strong> ${params.oldDate}</p>
    <p><strong>New Time:</strong> ${params.newDate}</p>
    <p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>
  `;

  if (params.interviewerEmail) {
    await sendEmail({ to: params.interviewerEmail, subject, html: html('Interviewer') });
  }
  if (params.candidateEmail) {
    await sendEmail({ to: params.candidateEmail, subject, html: html(params.candidateName) });
  }
}

export async function notifyInterviewCancelled(params: {
  organizationId: string;
  candidateEmail: string;
  candidateName: string;
  interviewerId: string;
  interviewerEmail: string;
}) {
  const admin = createAdmin();

  const { data: interviewerProfile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', params.interviewerId)
    .single();

  if (interviewerProfile) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: interviewerProfile.id,
      type: 'interview_cancelled',
      title: 'Interview Cancelled',
      message: `Interview with ${params.candidateName} has been cancelled.`,
    });
  }

  const subject = 'Interview Cancelled';
  const html = `
    <h1>Interview Cancelled</h1>
    <p>The interview with <strong>${params.candidateName}</strong> has been cancelled.</p>
    <p>Please contact your recruiter for further details.</p>
  `;

  if (params.interviewerEmail) {
    await sendEmail({ to: params.interviewerEmail, subject, html });
  }
  if (params.candidateEmail) {
    await sendEmail({ to: params.candidateEmail, subject, html });
  }
}

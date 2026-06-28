import nodemailer from 'nodemailer';

function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return null;
}

const transporter = createTransporter();
const fromEmail = process.env.SMTP_FROM || 'noreply@interviewflow.app';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  if (!transporter) {
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
    console.log(`  (SMTP error: ${error})`);
  }
}

export function bookingLinkEmail(candidateName: string, token: string, expiresAt: Date) {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/book/${token}`;
  return {
    subject: 'Your Interview Booking Link',
    html: `
      <h1>Hello ${candidateName},</h1>
      <p>Your interview has been scheduled. Please use the link below to book your preferred time slot.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Book Your Interview</a></p>
      <p>This link expires on ${expiresAt.toLocaleDateString()}.</p>
      <p>If you have any questions, please contact your recruiter.</p>
    `,
  };
}

export function confirmationEmail(candidateName: string, date: string, meetingLink: string) {
  return {
    subject: 'Interview Confirmed',
    html: `
      <h1>Hello ${candidateName},</h1>
      <p>Your interview has been confirmed.</p>
      <p><strong>Date & Time:</strong> ${date}</p>
      <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
      <p>Please join the meeting at the scheduled time.</p>
    `,
  };
}

export function reminderEmail(candidateName: string, date: string, meetingLink: string, hoursBefore: number) {
  return {
    subject: `Interview Reminder (${hoursBefore}h before)`,
    html: `
      <h1>Reminder: ${candidateName}</h1>
      <p>This is a reminder that your interview is coming up in ${hoursBefore} hours.</p>
      <p><strong>Date & Time:</strong> ${date}</p>
      <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
    `,
  };
}

export function cancellationEmail(candidateName: string) {
  return {
    subject: 'Interview Cancelled',
    html: `
      <h1>Hello ${candidateName},</h1>
      <p>Your interview has been cancelled.</p>
      <p>Please contact your recruiter for further details.</p>
    `,
  };
}

export function invitationEmail(invitedEmail: string, orgName: string, inviterName: string, role: string, token: string) {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${token}`;
  return {
    subject: `${inviterName} invited you to join ${orgName} on InterviewFlow`,
    html: `
      <h1>You're Invited!</h1>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on InterviewFlow as a <strong>${role}</strong>.</p>
      <p>Click the button below to accept the invitation and create your account.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
      <p>Or copy this link into your browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
  };
}

'use server';

import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

export async function sendCandidateOTP(formData: FormData) {
  const accessToken = formData.get('access_token') as string;
  const email = formData.get('email') as string;

  if (!accessToken || !email) return { error: 'Missing required fields' };

  const supabase = await createAdmin();

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('id, email, full_name')
    .eq('access_token', accessToken)
    .gt('access_token_expires_at', new Date().toISOString())
    .is('deleted_at', null)
    .single();

  if (candidateError || !candidate) return { error: 'Invalid or expired access token' };

  if (candidate.email !== email) return { error: 'Email does not match' };

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date();
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

  const { data: session, error: sessionError } = await supabase
    .from('candidate_sessions')
    .insert({
      candidate_id: candidate.id,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt.toISOString(),
    })
    .select()
    .single();

  if (sessionError || !session) return { error: 'Failed to create session' };

  await sendEmail({
    to: candidate.email,
    subject: 'Your OTP Code',
    html: `<h1>Hello ${candidate.full_name},</h1><p>Your OTP code is: <strong>${otpCode}</strong></p><p>This code expires in 10 minutes.</p>`,
  });

  return { success: true, sessionId: session.id };
}

export async function verifyCandidateOTP(formData: FormData) {
  const sessionId = formData.get('session_id') as string;
  const otpCode = formData.get('otp_code') as string;

  if (!sessionId || !otpCode) return { error: 'Missing required fields' };

  const supabase = await createAdmin();

  const { data: session, error: sessionError } = await supabase
    .from('candidate_sessions')
    .select('id, otp_code, otp_expires_at, otp_verified_at, candidate_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) return { error: 'Session not found' };
  if (session.otp_code !== otpCode) return { error: 'Invalid OTP' };
  if (new Date(session.otp_expires_at) < new Date()) return { error: 'OTP has expired' };
  if (session.otp_verified_at) return { error: 'OTP already verified' };

  const sessionToken = crypto.randomUUID();
  const sessionExpiresAt = new Date();
  sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 24);

  const { error: updateSessionError } = await supabase
    .from('candidate_sessions')
    .update({
      otp_verified_at: new Date().toISOString(),
      session_token: sessionToken,
      session_expires_at: sessionExpiresAt.toISOString(),
    })
    .eq('id', session.id);

  if (updateSessionError) return { error: 'Failed to verify session' };

  const { error: updateCandidateError } = await supabase
    .from('candidates')
    .update({ email_verified_at: new Date().toISOString() })
    .eq('id', session.candidate_id);

  if (updateCandidateError) return { error: 'Failed to update candidate' };

  return { success: true, sessionToken };
}

export async function getCandidateBySession(sessionToken: string) {
  if (!sessionToken) return null;

  const supabase = await createAdmin();

  const { data: session } = await supabase
    .from('candidate_sessions')
    .select('candidate_id')
    .eq('session_token', sessionToken)
    .gt('session_expires_at', new Date().toISOString())
    .not('otp_verified_at', 'is', null)
    .single();

  if (!session) return null;

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, full_name, email, phone, position_applied, resume_url, status, created_at')
    .eq('id', session.candidate_id)
    .single();

  if (!candidate) return null;

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('candidate_id', candidate.id)
    .is('deleted_at', null);

  return { candidate, interviews: interviews || [] };
}

export async function updateCandidateResume(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resumeUrl = formData.get('resume_url') as string;

  if (!sessionToken || !resumeUrl) return { error: 'Missing required fields' };

  const session = await getCandidateBySession(sessionToken);
  if (!session) return { error: 'Invalid or expired session' };

  const supabase = await createAdmin();

  const { error } = await supabase
    .from('candidates')
    .update({ resume_url: resumeUrl })
    .eq('id', session.candidate.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getCandidatePortalData(accessToken: string) {
  if (!accessToken) return null;

  const supabase = await createAdmin();

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, full_name, email, phone, position_applied, resume_url, status, created_at')
    .eq('access_token', accessToken)
    .gt('access_token_expires_at', new Date().toISOString())
    .is('deleted_at', null)
    .single();

  if (!candidate) return null;

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('candidate_id', candidate.id)
    .is('deleted_at', null);

  return { candidate, interviews: interviews || [] };
}

'use server';

import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import * as rateLimiter from '@/lib/services/rate-limiter';

export async function sendCandidateOTP(formData: FormData) {
  const accessToken = formData.get('access_token') as string;
  const email = formData.get('email') as string;

  if (!accessToken || !email) return { error: 'Missing required fields' };

  const rateResult = rateLimiter.check(`otp:${email}`, 3, 60);
  if (!rateResult.allowed) {
    return { error: 'Too many attempts. Please wait before requesting another OTP.' };
  }

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

export async function updateCandidateResume(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resumeUrl = formData.get('resume_url') as string;

  if (!sessionToken || !resumeUrl) return { error: 'Missing required fields' };

  const supabase = await createAdmin();

  const { data: session } = await supabase
    .from('candidate_sessions')
    .select('candidate_id')
    .eq('session_token', sessionToken)
    .gt('session_expires_at', new Date().toISOString())
    .not('otp_verified_at', 'is', null)
    .single();

  if (!session) return { error: 'Invalid or expired session' };

  const { error } = await supabase
    .from('candidates')
    .update({ resume_url: resumeUrl })
    .eq('id', session.candidate_id);

  if (error) return { error: error.message };
  return { success: true };
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

async function resolveSession(sessionToken: string): Promise<{ candidateId: string; orgId: string } | { error: string }> {
  if (!sessionToken) return { error: 'Missing session token' };
  const supabase = await createAdmin();
  const { data: session } = await supabase
    .from('candidate_sessions')
    .select('candidate_id')
    .eq('session_token', sessionToken)
    .gt('session_expires_at', new Date().toISOString())
    .not('otp_verified_at', 'is', null)
    .single();
  if (!session) return { error: 'Invalid or expired session' };
  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, organization_id')
    .eq('id', session.candidate_id)
    .single();
  if (!candidate) return { error: 'Candidate not found' };
  return { candidateId: candidate.id, orgId: candidate.organization_id };
}

export async function addPortalSkill(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { data, error } = await supabase.from('candidate_skills').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    skill_name: formData.get('skill_name') as string,
    category: (formData.get('category') as string) || null,
    proficiency: (formData.get('proficiency') as string) || null,
    years_experience: formData.get('years_experience') ? Number(formData.get('years_experience')) : null,
  }).select().single();
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePortalSkill(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const updates: Record<string, unknown> = {};
  const name = formData.get('skill_name');
  if (name) updates.skill_name = name;
  const category = formData.get('category');
  updates.category = category || null;
  const proficiency = formData.get('proficiency');
  updates.proficiency = proficiency || null;
  const years = formData.get('years_experience');
  updates.years_experience = years ? Number(years) : null;
  const { error } = await supabase.from('candidate_skills').update(updates).eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePortalSkill(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_skills').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addPortalExperience(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { data, error } = await supabase.from('candidate_experience').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    company: formData.get('company') as string,
    title: formData.get('title') as string,
    location: (formData.get('location') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    description: (formData.get('description') as string) || null,
    skills_used: formData.get('skills_used')
      ? (formData.get('skills_used') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
  }).select().single();
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePortalExperience(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const updates: Record<string, unknown> = {};
  const company = formData.get('company');
  if (company) updates.company = company;
  const title = formData.get('title');
  if (title) updates.title = title;
  updates.location = (formData.get('location') as string) || null;
  updates.start_date = (formData.get('start_date') as string) || null;
  updates.end_date = (formData.get('end_date') as string) || null;
  updates.is_current = formData.get('is_current') === 'true';
  updates.description = (formData.get('description') as string) || null;
  const skills = formData.get('skills_used');
  updates.skills_used = skills ? (skills as string).split(',').map(s => s.trim()).filter(Boolean) : null;
  const { error } = await supabase.from('candidate_experience').update(updates).eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePortalExperience(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_experience').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addPortalEducation(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { data, error } = await supabase.from('candidate_education').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    institution: formData.get('institution') as string,
    degree: (formData.get('degree') as string) || null,
    field_of_study: (formData.get('field_of_study') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    grade: (formData.get('grade') as string) || null,
  }).select().single();
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePortalEducation(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const updates: Record<string, unknown> = {};
  const institution = formData.get('institution');
  if (institution) updates.institution = institution;
  updates.degree = (formData.get('degree') as string) || null;
  updates.field_of_study = (formData.get('field_of_study') as string) || null;
  updates.start_date = (formData.get('start_date') as string) || null;
  updates.end_date = (formData.get('end_date') as string) || null;
  updates.is_current = formData.get('is_current') === 'true';
  updates.grade = (formData.get('grade') as string) || null;
  const { error } = await supabase.from('candidate_education').update(updates).eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePortalEducation(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_education').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addPortalProject(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { data, error } = await supabase.from('candidate_projects').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    url: (formData.get('url') as string) || null,
    technologies: formData.get('technologies')
      ? (formData.get('technologies') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
  }).select().single();
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePortalProject(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const updates: Record<string, unknown> = {};
  const name = formData.get('name');
  if (name) updates.name = name;
  updates.description = (formData.get('description') as string) || null;
  updates.url = (formData.get('url') as string) || null;
  const techs = formData.get('technologies');
  updates.technologies = techs ? (techs as string).split(',').map(s => s.trim()).filter(Boolean) : null;
  updates.start_date = (formData.get('start_date') as string) || null;
  updates.end_date = (formData.get('end_date') as string) || null;
  updates.is_current = formData.get('is_current') === 'true';
  const { error } = await supabase.from('candidate_projects').update(updates).eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePortalProject(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_projects').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addPortalCertification(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { data, error } = await supabase.from('candidate_certifications').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    name: formData.get('name') as string,
    issuer: (formData.get('issuer') as string) || null,
    issue_date: (formData.get('issue_date') as string) || null,
    expiry_date: (formData.get('expiry_date') as string) || null,
    credential_url: (formData.get('credential_url') as string) || null,
  }).select().single();
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePortalCertification(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const updates: Record<string, unknown> = {};
  const name = formData.get('name');
  if (name) updates.name = name;
  updates.issuer = (formData.get('issuer') as string) || null;
  updates.issue_date = (formData.get('issue_date') as string) || null;
  updates.expiry_date = (formData.get('expiry_date') as string) || null;
  updates.credential_url = (formData.get('credential_url') as string) || null;
  const { error } = await supabase.from('candidate_certifications').update(updates).eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePortalCertification(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_certifications').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadPortalDocument(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };
  const documentType = formData.get('document_type') as string;
  if (!documentType) return { error: 'Document type required' };
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const filePath = `${resolved.orgId}/${resolved.candidateId}/documents/${timestamp}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('candidate-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) return { error: uploadError.message };
  const { data: urlData } = supabase.storage.from('candidate-files').getPublicUrl(filePath);
  const { data: doc, error: dbError } = await supabase.from('candidate_documents').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    document_type: documentType,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  }).select().single();
  if (dbError) return { error: dbError.message };
  return { success: true, data: doc };
}

export async function deletePortalDocument(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('candidate_documents').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadPortalResume(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };
  const ext = file.name.split('.').pop() || 'pdf';
  const filePath = `${resolved.orgId}/${resolved.candidateId}/resume.${ext}`;
  const { error: uploadError } = await supabase.storage.from('candidate-files').upload(filePath, file, { cacheControl: '3600', upsert: true });
  if (uploadError) return { error: uploadError.message };
  const { data: urlData } = supabase.storage.from('candidate-files').getPublicUrl(filePath);
  const { error: dbError } = await supabase.from('resumes').insert({
    candidate_id: resolved.candidateId,
    organization_id: resolved.orgId,
    file_url: urlData.publicUrl,
    file_type: file.type,
    parsing_status: 'pending',
  });
  if (dbError) return { error: dbError.message };
  const { error: updateError } = await supabase.from('candidates').update({ resume_url: urlData.publicUrl }).eq('id', resolved.candidateId);
  if (updateError) return { error: updateError.message };
  return { success: true, file_url: urlData.publicUrl };
}

export async function deletePortalResume(formData: FormData) {
  const sessionToken = formData.get('session_token') as string;
  const id = formData.get('id') as string;
  const resolved = await resolveSession(sessionToken);
  if ('error' in resolved) return { error: resolved.error };
  const supabase = await createAdmin();
  const { error } = await supabase.from('resumes').delete().eq('id', id).eq('candidate_id', resolved.candidateId);
  if (error) return { error: error.message };
  return { success: true };
}

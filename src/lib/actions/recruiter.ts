'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import type { CandidateStatus, PositionStatus } from '@/types';

export async function createCandidate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'recruiter') throw new Error('Unauthorized');

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error } = await supabase.from('candidates').insert({
    organization_id: membership.organization_id,
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string || null,
    position_applied: formData.get('position_applied') as string || null,
    resume_url: formData.get('resume_url') as string || null,
    notes: formData.get('notes') as string || null,
    status: 'applied',
    access_token: token,
    access_token_expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(error.message);

  const name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portal/${token}`;

  await sendEmail({
    to: email,
    subject: 'Your Interview Portal Access',
    html: `<h1>Hello ${name},</h1><p>Welcome to InterviewFlow. Click the link below to access your portal:</p><p><a href="${link}">${link}</a></p>`,
  });

  revalidatePath('/recruiter/candidates');
  redirect('/recruiter/candidates');
}

export async function updateCandidateStatus(id: string, status: string) {
  const supabase = await createServer();
  const { error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/recruiter/candidates');
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function createInterview(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'recruiter') throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const candidateId = formData.get('candidate_id') as string;
  const positionId = formData.get('position_id') as string;
  const interviewerId = formData.get('interviewer_id') as string;
  const interviewType = formData.get('interview_type') as string;
  const duration = parseInt(formData.get('duration') as string) || 60;
  const notes = formData.get('notes') as string || null;

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .insert({
      organization_id: membership.organization_id,
      candidate_id: candidateId,
      position_id: positionId,
      interviewer_id: interviewerId,
      recruiter_id: profile.id,
      interview_type: interviewType,
      duration_minutes: duration,
      status: 'pending',
      notes,
      booking_token: token,
      booking_expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (interviewError) throw new Error(interviewError.message);

  const { error: bookingError } = await supabase
    .from('bookings')
    .insert({
      interview_id: interview.id,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });

  if (bookingError) throw new Error(bookingError.message);

  revalidatePath('/recruiter/interviews');
  revalidatePath('/recruiter/scheduling');

  redirect(`/recruiter/interviews?token=${token}`);
}

export async function createPosition(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) throw new Error('Unauthorized');

  const skillsRaw = formData.get('skills') as string || null;
  const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : null;

  const { error } = await supabase.from('positions').insert({
    organization_id: membership.organization_id,
    title: formData.get('title') as string,
    department: formData.get('department') as string,
    experience_required: formData.get('experience_required') as string || null,
    description: formData.get('description') as string || null,
    employment_type: formData.get('employment_type') as string || null,
    location: formData.get('location') as string || null,
    skills,
    status: 'open',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/recruiter/scheduling');
}

export async function updateCandidate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'recruiter') return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Candidate ID is required' };

  const status = formData.get('status') as CandidateStatus | null;
  if (status && !['applied', 'screening', 'scheduled', 'interviewed', 'selected', 'rejected'].includes(status)) {
    return { error: 'Invalid status' };
  }

  const { error } = await supabase
    .from('candidates')
    .update({
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || null,
      position_applied: formData.get('position_applied') as string || null,
      resume_url: formData.get('resume_url') as string || null,
      notes: formData.get('notes') as string || null,
      ...(status ? { status } : {}),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/candidates');
  return { success: true };
}

export async function deleteCandidate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'recruiter') return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Candidate ID is required' };

  const { error } = await supabase
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/candidates');
  revalidatePath('/recruiter');
  return { success: true };
}

export async function updatePosition(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin'))
    return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Position ID is required' };

  const skillsRaw = formData.get('skills') as string || null;
  const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : null;
  const status = formData.get('status') as PositionStatus | null;
  if (status && !['open', 'closed', 'on-hold', 'filled'].includes(status)) {
    return { error: 'Invalid status' };
  }

  const { error } = await supabase
    .from('positions')
    .update({
      title: formData.get('title') as string,
      department: formData.get('department') as string,
      experience_required: formData.get('experience_required') as string || null,
      description: formData.get('description') as string || null,
      employment_type: formData.get('employment_type') as string || null,
      location: formData.get('location') as string || null,
      skills,
      ...(status ? { status } : {}),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/positions');
  return { success: true };
}

export async function deletePosition(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin'))
    return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Position ID is required' };

  const { data: activeInterviews, error: checkError } = await supabase
    .from('interviews')
    .select('id')
    .eq('position_id', id)
    .in('status', ['pending', 'scheduled', 'confirmed'])
    .limit(1);

  if (checkError) return { error: checkError.message };

  if (activeInterviews && activeInterviews.length > 0) {
    return { error: 'Cannot delete position with active interviews. Please close the position instead.' };
  }

  const { error } = await supabase
    .from('positions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/positions');
  revalidatePath('/admin/positions');
  return { success: true };
}

export async function updateInterview(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin'))
    return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Interview ID is required' };

  const { error } = await supabase
    .from('interviews')
    .update({
      scheduled_at: formData.get('scheduled_at') as string || null,
      status: formData.get('status') as string || null,
      notes: formData.get('notes') as string || null,
      meeting_link: formData.get('meeting_link') as string || null,
      meeting_provider: formData.get('meeting_provider') as string || null,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/interviews');
  return { success: true };
}

export async function deleteInterview(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin'))
    return { error: 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Interview ID is required' };

  const { error } = await supabase
    .from('interviews')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/interviews');
  return { success: true };
}

export async function bulkDeleteCandidates(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin'))
    return { error: 'Unauthorized' };

  const idsRaw = formData.get('ids') as string;
  if (!idsRaw) return { error: 'No candidate IDs provided' };

  const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (ids.length === 0) return { error: 'No candidate IDs provided' };

  const { error } = await supabase
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/candidates');
  return { success: true };
}

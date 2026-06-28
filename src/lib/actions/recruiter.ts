'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';

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

  const { error } = await supabase.from('candidates').insert({
    organization_id: membership.organization_id,
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string || null,
    position_applied: formData.get('position_applied') as string || null,
    resume_url: formData.get('resume_url') as string || null,
    notes: formData.get('notes') as string || null,
    status: 'applied',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/recruiter/candidates');
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

  const { error } = await supabase.from('positions').insert({
    organization_id: membership.organization_id,
    title: formData.get('title') as string,
    department: formData.get('department') as string,
    experience_required: formData.get('experience_required') as string || null,
    description: formData.get('description') as string || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/recruiter/scheduling');
}

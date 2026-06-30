'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/services/auth.service';
import { candidateStatusSchema, positionStatusSchema, interviewStatusSchema } from '@/lib/validators/common';
import * as candidateService from '@/lib/services/candidate.service';
import * as positionService from '@/lib/services/position.service';
import * as interviewService from '@/lib/services/interview.service';
import { failure } from '@/lib/services/response';
import type { ActionResult } from '@/lib/services/response';

export async function createCandidate(formData: FormData) {
  const ctx = await requireRole('recruiter');

  const result = await candidateService.createCandidate({
    organizationId: ctx.user.organizationId,
    fullName: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string || undefined,
    positionApplied: formData.get('position_applied') as string || undefined,
    resumeUrl: formData.get('resume_url') as string || undefined,
    notes: formData.get('notes') as string || undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/recruiter/candidates');
  redirect('/recruiter/candidates');
}

export async function updateCandidateStatus(id: string, status: string) {
  await requireRole('recruiter');

  const parsed = candidateStatusSchema.safeParse(status);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', 'Invalid status');
  }

  const result = await candidateService.updateCandidateStatus(id, status);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/candidates');
  return { success: true };
}

export async function createInterview(formData: FormData) {
  const ctx = await requireRole('recruiter');

  const result = await interviewService.createInterview({
    organizationId: ctx.user.organizationId,
    candidateId: formData.get('candidate_id') as string,
    positionId: formData.get('position_id') as string,
    interviewerId: formData.get('interviewer_id') as string,
    recruiterId: ctx.user.profileId,
    interviewType: formData.get('interview_type') as string,
    durationMinutes: parseInt(formData.get('duration') as string) || 60,
    notes: formData.get('notes') as string || undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/recruiter/interviews');
  revalidatePath('/recruiter/scheduling');

  redirect(`/recruiter/interviews?token=${result.data.booking_token}`);
}

export async function updateInterview(formData: FormData) {
  const ctx = await requireRole(['recruiter', 'organization_admin']);

  const id = formData.get('id') as string;
  if (!id) return { error: 'Interview ID is required' };

  const newStatus = formData.get('status') as string || null;
  if (newStatus) {
    const parsed = interviewStatusSchema.safeParse(newStatus);
    if (!parsed.success) return { error: 'Invalid status' };
  }

  const result = await interviewService.updateInterview(id, {
    scheduledAt: formData.get('scheduled_at') as string || undefined,
    status: newStatus || undefined,
    notes: formData.get('notes') as string || undefined,
    meetingLink: formData.get('meeting_link') as string || undefined,
    meetingProvider: formData.get('meeting_provider') as string || undefined,
  });

  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/interviews');
  return { success: true };
}

export async function deleteInterview(formData: FormData) {
  await requireRole(['recruiter', 'organization_admin']);

  const id = formData.get('id') as string;
  if (!id) return { error: 'Interview ID is required' };

  const result = await interviewService.deleteInterview(id);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/interviews');
  return { success: true };
}

export async function createPosition(formData: FormData) {
  const ctx = await requireRole(['recruiter', 'organization_admin']);

  const skillsRaw = formData.get('skills') as string || null;
  const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const result = await positionService.createPosition({
    organizationId: ctx.user.organizationId,
    title: formData.get('title') as string,
    department: formData.get('department') as string,
    experienceRequired: formData.get('experience_required') as string || undefined,
    description: formData.get('description') as string || undefined,
    employmentType: formData.get('employment_type') as string || undefined,
    location: formData.get('location') as string || undefined,
    skills,
  });

  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/recruiter/scheduling');
}

export async function updateCandidate(formData: FormData) {
  await requireRole('recruiter');

  const id = formData.get('id') as string;
  if (!id) return { error: 'Candidate ID is required' };

  const status = formData.get('status') as string | null;
  if (status) {
    const parsed = candidateStatusSchema.safeParse(status);
    if (!parsed.success) return { error: 'Invalid status' };
  }

  const result = await candidateService.updateCandidate(id, {
    fullName: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string || undefined,
    positionApplied: formData.get('position_applied') as string || undefined,
    resumeUrl: formData.get('resume_url') as string || undefined,
    notes: formData.get('notes') as string || undefined,
    status: status || undefined,
  });

  if (!result.success) return { error: result.error.message };
  revalidatePath('/recruiter/candidates');
  return { success: true };
}

export async function deleteCandidate(formData: FormData) {
  await requireRole('recruiter');

  const id = formData.get('id') as string;
  if (!id) return { error: 'Candidate ID is required' };

  const result = await candidateService.deleteCandidate(id);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/candidates');
  revalidatePath('/recruiter');
  return { success: true };
}

export async function updatePosition(formData: FormData) {
  await requireRole(['recruiter', 'organization_admin']);

  const id = formData.get('id') as string;
  if (!id) return { error: 'Position ID is required' };

  const skillsRaw = formData.get('skills') as string || null;
  const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  const status = formData.get('status') as string | null;

  if (status) {
    const parsed = positionStatusSchema.safeParse(status);
    if (!parsed.success) return { error: 'Invalid status' };
  }

  const result = await positionService.updatePosition(id, {
    title: formData.get('title') as string,
    department: formData.get('department') as string,
    experienceRequired: formData.get('experience_required') as string || undefined,
    description: formData.get('description') as string || undefined,
    employmentType: formData.get('employment_type') as string || undefined,
    location: formData.get('location') as string || undefined,
    skills,
    status: status || undefined,
  });

  if (!result.success) return { error: result.error.message };
  revalidatePath('/recruiter/positions');
  return { success: true };
}

export async function deletePosition(formData: FormData) {
  await requireRole(['recruiter', 'organization_admin']);

  const id = formData.get('id') as string;
  if (!id) return { error: 'Position ID is required' };

  const result = await positionService.deletePosition(id);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/positions');
  revalidatePath('/admin/positions');
  return { success: true };
}

export async function bulkDeleteCandidates(formData: FormData) {
  await requireRole(['recruiter', 'organization_admin']);

  const idsRaw = formData.get('ids') as string;
  if (!idsRaw) return { error: 'No candidate IDs provided' };

  const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return { error: 'No candidate IDs provided' };

  const result = await candidateService.bulkDeleteCandidates(ids);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/candidates');
  return { success: true };
}

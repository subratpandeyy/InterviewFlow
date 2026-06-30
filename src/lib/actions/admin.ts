'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/services/auth.service';
import * as userService from '@/lib/services/user.service';
import * as invitationService from '@/lib/services/invitation.service';
import * as organizationService from '@/lib/services/organization.service';
import * as candidateService from '@/lib/services/candidate.service';
import * as positionService from '@/lib/services/position.service';
import { sendEmail, invitationEmail } from '@/lib/services/email.service';
import { roleSchema, positionStatusSchema } from '@/lib/validators/common';

export async function removeMember(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const memberId = formData.get('id') as string;
  if (!memberId) return { error: 'Member ID is required' };

  const admin = (await import('@/lib/supabase/admin')).createAdmin();
  const { data: targetMember } = await admin
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember) return { error: 'Member not found' };
  if (targetMember.user_id === ctx.user.userId) return { error: 'Cannot remove yourself' };

  const result = await userService.removeMember(memberId, ctx.user.organizationId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function revokeInvitation(formData: FormData) {
  await requireRole('organization_admin');

  const invitationId = formData.get('id') as string;
  if (!invitationId) return { error: 'Invitation ID is required' };

  const result = await invitationService.revokeInvitation(invitationId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function resendInvitation(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const invitationId = formData.get('id') as string;
  if (!invitationId) return { error: 'Invitation ID is required' };

  const result = await invitationService.resendInvitation(invitationId, ctx.user.userId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateOrganization(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'Organization name is required' };

  const result = await organizationService.updateOrganization(ctx.user.organizationId, name);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function updatePositionStatus(formData: FormData) {
  await requireRole('organization_admin');

  const positionId = formData.get('id') as string;
  const status = formData.get('status') as string;

  if (!positionId) return { error: 'Position ID is required' };
  if (!status) return { error: 'Status is required' };

  const parsed = positionStatusSchema.safeParse(status);
  if (!parsed.success) return { error: 'Invalid status' };

  const result = await positionService.updatePosition(positionId, { status });
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/positions');
  return { success: true };
}

export async function deletePosition(formData: FormData) {
  await requireRole('organization_admin');

  const positionId = formData.get('id') as string;
  if (!positionId) return { error: 'Position ID is required' };

  const result = await positionService.deletePosition(positionId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/positions');
  revalidatePath('/recruiter/positions');
  return { success: true };
}

export async function deleteCandidate(formData: FormData) {
  await requireRole('organization_admin');

  const candidateId = formData.get('id') as string;
  if (!candidateId) return { error: 'Candidate ID is required' };

  const result = await candidateService.deleteCandidate(candidateId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/recruiter/candidates');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateMemberRole(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const memberId = formData.get('id') as string;
  const role = formData.get('role') as string;

  if (!memberId) return { error: 'Member ID is required' };
  if (!role) return { error: 'Role is required' };

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { error: 'Invalid role' };

  const result = await userService.updateMemberRole(memberId, role, ctx.user.organizationId);
  if (!result.success) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

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

export async function refreshConnectionStatus(profileId: string) {
  await requireRole('organization_admin');

  try {
    const { getInterviewerTokens, checkCalendarHealth, updateCalendarSyncStatus } = await import('@/lib/services/calendar.service');

    const tokens = await getInterviewerTokens(profileId);
    if (!tokens) {
      await updateCalendarSyncStatus(profileId, 'error', 'No tokens found');
      return { success: false, error: 'No calendar connection found' };
    }

    const health = await checkCalendarHealth(
      tokens.accessToken,
      tokens.refreshToken,
      tokens.calendarEmail,
    );

    await updateCalendarSyncStatus(
      profileId,
      health.healthy ? 'synced' : 'error',
      health.healthy ? undefined : health.message,
    );

    revalidatePath('/admin');
    return { success: true, healthy: health.healthy, message: health.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    return { success: false, error: message };
  }
}

export async function requestReconnection(profileId: string) {
  const ctx = await requireRole('organization_admin');

  const admin = (await import('@/lib/supabase/admin')).createAdmin();

  const { data: token } = await admin
    .from('google_calendar_tokens')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!token) return { success: false, error: 'User has no calendar connection' };

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, user_id')
    .eq('id', profileId)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', ctx.user.organizationId)
    .single();

  const orgName = org?.name ?? 'Your organization';

  const notification = {
    organization_id: ctx.user.organizationId,
    recipient_id: profileId,
    type: 'interview_scheduled' as const,
    title: 'Calendar Reconnection Required',
    message: `Admin of ${orgName} has requested that you reconnect your Google Calendar. Please visit your Calendar settings to reconnect.`,
  };

  const { error: notifError } = await admin.from('notifications').insert(notification);
  if (notifError) {
    return { success: false, error: notifError.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

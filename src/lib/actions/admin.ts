'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail, invitationEmail } from '@/lib/email';

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function removeMember(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const memberId = formData.get('id') as string;
  if (!memberId) return { error: 'Member ID is required' };

  const admin = createAdmin();

  const { data: targetMember } = await admin
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember) return { error: 'Member not found' };
  if (targetMember.organization_id !== membership.organization_id) return { error: 'Member not found in your organization' };
  if (targetMember.user_id === user.id) return { error: 'Cannot remove yourself' };

  const { error } = await admin.from('organization_members').delete().eq('id', memberId);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { success: true };
}

export async function revokeInvitation(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const invitationId = formData.get('id') as string;
  if (!invitationId) return { error: 'Invitation ID is required' };

  const admin = createAdmin();

  const { data: invitation } = await admin
    .from('invitations')
    .select('organization_id')
    .eq('id', invitationId)
    .single();

  if (!invitation) return { error: 'Invitation not found' };
  if (invitation.organization_id !== membership.organization_id) return { error: 'Invitation not found in your organization' };

  const { error } = await admin
    .from('invitations')
    .update({ status: 'cancelled', revoked_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { success: true };
}

export async function resendInvitation(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const invitationId = formData.get('id') as string;
  if (!invitationId) return { error: 'Invitation ID is required' };

  const admin = createAdmin();

  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (!invitation) return { error: 'Invitation not found' };
  if (invitation.organization_id !== membership.organization_id) return { error: 'Invitation not found in your organization' };
  if (invitation.accepted_at) return { error: 'Cannot resend an already accepted invitation' };

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: updateError } = await admin
    .from('invitations')
    .update({ token, expires_at: expiresAt.toISOString(), status: 'pending', revoked_at: null })
    .eq('id', invitationId);

  if (updateError) return { error: updateError.message };

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', membership.organization_id)
    .single();

  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single();

  const { subject, html } = invitationEmail(
    invitation.email,
    org?.name ?? 'the organization',
    inviterProfile?.full_name ?? 'An admin',
    invitation.role,
    token,
  );

  await sendEmail({ to: invitation.email, subject, html });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateOrganization(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'Organization name is required' };

  const admin = createAdmin();

  const { error } = await admin
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', membership.organization_id);

  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { success: true };
}

export async function updatePositionStatus(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const positionId = formData.get('id') as string;
  const status = formData.get('status') as string;

  if (!positionId) return { error: 'Position ID is required' };
  if (!status) return { error: 'Status is required' };
  if (!['open', 'closed', 'on-hold', 'filled'].includes(status)) return { error: 'Invalid status' };

  const admin = createAdmin();

  const { data: position } = await admin
    .from('positions')
    .select('organization_id')
    .eq('id', positionId)
    .single();

  if (!position) return { error: 'Position not found' };
  if (position.organization_id !== membership.organization_id) return { error: 'Position not found in your organization' };

  const { error } = await admin
    .from('positions')
    .update({ status })
    .eq('id', positionId);

  if (error) return { error: error.message };
  revalidatePath('/admin/positions');
  return { success: true };
}

export async function deletePosition(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const positionId = formData.get('id') as string;
  if (!positionId) return { error: 'Position ID is required' };

  const admin = createAdmin();

  const { data: position } = await admin
    .from('positions')
    .select('organization_id')
    .eq('id', positionId)
    .single();

  if (!position) return { error: 'Position not found' };
  if (position.organization_id !== membership.organization_id) return { error: 'Position not found in your organization' };

  const { data: activeInterviews } = await admin
    .from('interviews')
    .select('id')
    .eq('position_id', positionId)
    .in('status', ['pending', 'scheduled'])
    .limit(1);

  if (activeInterviews && activeInterviews.length > 0) {
    return { error: 'Cannot delete position with active interviews' };
  }

  const { error } = await admin
    .from('positions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', positionId);

  if (error) return { error: error.message };
  revalidatePath('/admin/positions');
  revalidatePath('/recruiter/positions');
  return { success: true };
}

export async function deleteCandidate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const candidateId = formData.get('id') as string;
  if (!candidateId) return { error: 'Candidate ID is required' };

  const admin = createAdmin();

  const { data: candidate } = await admin
    .from('candidates')
    .select('organization_id')
    .eq('id', candidateId)
    .single();

  if (!candidate) return { error: 'Candidate not found' };
  if (candidate.organization_id !== membership.organization_id) return { error: 'Candidate not found in your organization' };

  const { error } = await admin
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', candidateId);

  if (error) return { error: error.message };
  revalidatePath('/recruiter/candidates');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateMemberRole(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'organization_admin') return { error: 'Unauthorized' };

  const memberId = formData.get('id') as string;
  const role = formData.get('role') as string;

  if (!memberId) return { error: 'Member ID is required' };
  if (!role) return { error: 'Role is required' };
  if (!['organization_admin', 'recruiter', 'interviewer'].includes(role)) return { error: 'Invalid role' };

  const admin = createAdmin();

  const { data: targetMember } = await admin
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember) return { error: 'Member not found' };
  if (targetMember.organization_id !== membership.organization_id) return { error: 'Member not found in your organization' };

  const { error } = await admin
    .from('organization_members')
    .update({ role })
    .eq('id', memberId);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { success: true };
}

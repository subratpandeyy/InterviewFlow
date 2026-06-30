import { createAdmin } from '@/lib/supabase/admin';
import { sendEmail, invitationEmail } from './email.service';
import { success, type ActionResult } from './response';
import type { Invitation } from '@/types';

export async function createInvitation(params: {
  organizationId: string;
  email: string;
  role: 'recruiter' | 'interviewer';
}): Promise<ActionResult<Invitation>> {
  const admin = createAdmin();
  const { data, error } = await admin.from('invitations').insert({
    organization_id: params.organizationId,
    email: params.email,
    role: params.role,
  }).select().single();

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  return success(data as Invitation);
}

export async function resendInvitation(invitationId: string, inviterUserId: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (!invitation) return { success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } };
  if (invitation.accepted_at) return { success: false, error: { code: 'ALREADY_ACCEPTED', message: 'Cannot resend an already accepted invitation' } };

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: updateError } = await admin
    .from('invitations')
    .update({ token, expires_at: expiresAt.toISOString(), status: 'pending', revoked_at: null })
    .eq('id', invitationId);

  if (updateError) return { success: false, error: { code: 'UPDATE_FAILED', message: updateError.message } };

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', invitation.organization_id)
    .single();

  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('user_id', inviterUserId)
    .single();

  const { subject, html } = invitationEmail(
    invitation.email,
    org?.name ?? 'the organization',
    inviterProfile?.full_name ?? 'An admin',
    invitation.role,
    token,
  );

  await sendEmail({ to: invitation.email, subject, html });

  return success(undefined);
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('invitations')
    .update({ status: 'cancelled', revoked_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(undefined);
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

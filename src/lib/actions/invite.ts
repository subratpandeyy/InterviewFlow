'use server';

import { revalidatePath } from 'next/cache';
import { createAdmin } from '@/lib/supabase/admin';
import { createServer } from '@/lib/supabase/server';
import { sendEmail, invitationEmail } from '@/lib/email';

export async function inviteTeamMember(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No organization membership' };

  const email = formData.get('email') as string;
  const role = formData.get('role') as 'recruiter' | 'interviewer';

  const admin = createAdmin();

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

  const { data: invitation, error: inviteError } = await admin.from('invitations').insert({
    organization_id: membership.organization_id,
    email,
    role,
  }).select().single();

  if (inviteError) return { error: inviteError.message };

  const { subject, html } = invitationEmail(
    email,
    org?.name ?? 'the organization',
    inviterProfile?.full_name ?? 'An admin',
    role,
    invitation.token,
  );

  await sendEmail({ to: email, subject, html });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function acceptInvitation(formData: FormData) {
  const token = formData.get('token') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  const admin = createAdmin();

  // Verify invitation
  const { data: invitation, error: inviteError } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (inviteError || !invitation) return { error: 'Invalid invitation' };
  if (invitation.accepted_at) return { error: 'Invitation already accepted' };
  if (new Date(invitation.expires_at) < new Date()) return { error: 'Invitation expired' };

  // Create or locate the auth user
  const { data: authData, error: signUpError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId: string;
  let authUserCreated = true;

  if (signUpError) {
    if (signUpError.message.includes('already been registered')) {
      const { data: users } = await admin.auth.admin.listUsers();
      const existingUser = users?.users?.find((u) => u.email === email);
      if (!existingUser) return { error: 'An account with this email already exists.' };

      userId = existingUser.id;
      authUserCreated = false;

      // Check if already fully registered
      const [profileRes, memberRes] = await Promise.all([
        admin.from('profiles').select('id').eq('user_id', userId).maybeSingle(),
        admin.from('organization_members').select('id').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileRes.data && memberRes.data) {
        // Already registered — just mark invitation as accepted
        await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id);
        return { success: true };
      }
    } else {
      return { error: signUpError.message };
    }
  } else if (!authData?.user) {
    return { error: 'Failed to create user' };
  } else {
    userId = authData.user.id;
  }

  // Idempotent: create profile if missing
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    const { error: profileError } = await admin.from('profiles').insert({
      user_id: userId,
      full_name: fullName,
      email,
    });

    if (profileError) {
      if (authUserCreated) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      return { error: 'Failed to create profile' };
    }
  }

  // Idempotent: create membership if missing
  const { data: existingMembership } = await admin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingMembership) {
    const { error: memberError } = await admin.from('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
    });

    if (memberError) {
      try { await admin.from('profiles').delete().eq('user_id', userId); } catch {}
      if (authUserCreated) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      return { error: 'Failed to create membership' };
    }
  }

  // Mark invitation as accepted
  await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id);

  return { success: true };
}

'use server';

import { createAdmin } from '@/lib/supabase/admin';

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const orgName = formData.get('organization_name') as string;

  const admin = createAdmin();

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

      if (!existingUser) {
        return { error: 'An account with this email already exists.' };
      }

      userId = existingUser.id;
      authUserCreated = false;

      const [profileRes, memberRes] = await Promise.all([
        admin.from('profiles').select('id').eq('user_id', userId).maybeSingle(),
        admin.from('organization_members').select('id').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileRes.data && memberRes.data) {
        return { error: 'An account with this email already exists.' };
      }
    } else {
      return { error: signUpError.message };
    }
  } else if (!authData?.user) {
    return { error: 'Failed to create user' };
  } else {
    userId = authData.user.id;
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const uniqueSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug: uniqueSlug })
    .select()
    .single();

  if (orgError) {
    if (authUserCreated) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    return { error: 'Failed to create organization' };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const profileCreated = !profile;

  if (profileCreated) {
    const { error: profileError } = await admin.from('profiles').insert({
      user_id: userId,
      full_name: fullName,
      email,
    });

    if (profileError) {
      try { await admin.from('organizations').delete().eq('id', org.id); } catch {}
      if (authUserCreated) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      return { error: 'Failed to create profile' };
    }
  }

  const { data: existingMembership } = await admin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingMembership) {
    const { error: memberError } = await admin.from('organization_members').insert({
      organization_id: org.id,
      user_id: userId,
      role: 'organization_admin',
    });

    if (memberError) {
      try { if (profileCreated) { await admin.from('profiles').delete().eq('user_id', userId); } } catch {}
      try { await admin.from('organizations').delete().eq('id', org.id); } catch {}
      if (authUserCreated) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      return { error: 'Failed to create organization membership' };
    }
  }

  return { success: true };
}

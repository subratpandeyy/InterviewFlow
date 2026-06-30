import { notFound } from 'next/navigation';
import { createServer } from '@/lib/supabase/server';
import { getCandidateProfile } from '@/lib/services/candidate-profile.service';
import { CandidateProfileClient } from '@/components/profile/candidate-profile-client';

export const dynamic = 'force-dynamic';

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || (membership.role !== 'recruiter' && membership.role !== 'organization_admin')) {
    return null;
  }

  let result;
  try {
    result = await getCandidateProfile(id);
  } catch (err) {
    console.error('[candidate-profile] Error loading profile:', err);
    notFound();
  }

  if (!result.success) {
    console.error('[candidate-profile] Service returned failure:', result.error);
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('user_id', user.id)
    .single();

  return (
    <CandidateProfileClient
      profileData={result.data}
      currentUser={{
        profileId: profile?.id || '',
        fullName: profile?.full_name || '',
        email: profile?.email || '',
      }}
      userRole={membership.role as 'recruiter' | 'organization_admin'}
    />
  );
}

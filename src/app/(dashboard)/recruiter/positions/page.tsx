import { createServer } from '@/lib/supabase/server';
import PositionsClient from '@/components/recruiter/positions-client';

export const dynamic = 'force-dynamic';

export default async function RecruiterPositionsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return <PositionsClient positions={positions ?? []} />;
}

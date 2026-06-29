import Link from 'next/link';
import { createServer } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CandidatesClient } from '@/components/recruiter/candidates-client';

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  interviewed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  selected: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id)
    .single();

  if (!membership) return null;

  let query = supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: candidates } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Candidates</h1>
        <Link href="/recruiter/candidates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </Link>
      </div>

      <CandidatesClient candidates={candidates ?? []} statusColors={statusColors} />
    </div>
  );
}

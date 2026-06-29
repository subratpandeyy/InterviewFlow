import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Calendar as CalendarIcon } from 'lucide-react';

export default async function SchedulingPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id)
    .single();

  if (!membership) return null;

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .in('status', ['applied', 'screening'])
    .order('created_at', { ascending: false });

  const { data: interviewerMembers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', membership.organization_id)
    .eq('role', 'interviewer');

  const interviewerIds = interviewerMembers?.map(m => m.user_id) ?? [];

  const admin = createAdmin();
  const { data: interviewers } = interviewerIds.length > 0
    ? await admin.from('profiles').select('*').in('user_id', interviewerIds)
    : { data: [] };

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Scheduling</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule and manage interviews</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Select a candidate, position, and interviewer to create an interview schedule.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Candidate</label>
              <div className="flex flex-wrap gap-2">
                {candidates?.slice(0, 5).map((c) => (
                  <Badge key={c.id} variant="secondary" className="cursor-pointer">
                    {c.full_name}
                  </Badge>
                ))}
                {candidates && candidates.length > 5 && (
                  <Badge variant="outline">+{candidates.length - 5} more</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Interviewer</label>
              <div className="flex flex-wrap gap-2">
                {interviewers?.map((i) => (
                  <Badge key={i.id} variant="secondary" className="cursor-pointer">
                    {i.full_name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Position</label>
              <div className="flex flex-wrap gap-2">
                {positions?.map((p) => (
                  <Badge key={p.id} variant="secondary" className="cursor-pointer">
                    {p.title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Link href="/recruiter/scheduling/new">
              <Button>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createInterview } from '@/lib/actions/recruiter';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { INTERVIEW_TYPES } from '@/lib/constants';

export default async function NewSchedulingPage() {
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
    .eq('organization_id', membership.organization_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/recruiter/scheduling" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Schedule Interview</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Interview Details</CardTitle>
          <CardDescription>
            Select the candidate, interviewer, and configure the interview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInterview} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidate_id">Candidate</Label>
              <select
                id="candidate_id"
                name="candidate_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select a candidate...</option>
                {candidates?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_id">Position</Label>
              <select
                id="position_id"
                name="position_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select a position...</option>
                {positions?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} - {p.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewer_id">Interviewer</Label>
              <select
                id="interviewer_id"
                name="interviewer_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select an interviewer...</option>
                {interviewers?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="interview_type">Interview Type</Label>
                <select
                  id="interview_type"
                  name="interview_type"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">Select type...</option>
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" name="duration" type="number" defaultValue={60} min={15} step={15} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (appears as position name for candidate)</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="e.g. Frontend Developer - Technical Round" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Generate Booking Link</Button>
              <Link href="/recruiter/scheduling">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

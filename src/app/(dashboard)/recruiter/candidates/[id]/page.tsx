import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { updateCandidate } from '@/lib/actions/recruiter';
import { CANDIDATE_STATUSES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteCandidateButton } from '@/components/recruiter/delete-button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditCandidatePage({
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

  const { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!candidate) {
    notFound();
  }

  const admin = createAdmin();

  const { data: candidateInterviews } = await supabase
    .from('interviews')
    .select('id')
    .eq('candidate_id', candidate.id)
    .is('deleted_at', null);

  const interviewIds = (candidateInterviews ?? []).map((i) => i.id);

  const { data: feedbacks } = interviewIds.length > 0
    ? await admin
        .from('interview_feedback')
        .select('*, interview:interviews!inner(interview_type, scheduled_at), interviewer:profiles!inner(full_name, email)')
        .in('interview_id', interviewIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/recruiter/candidates"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Edit Candidate</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
          <CardDescription>
            Update the candidate&apos;s details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => { await updateCandidate(formData); }} className="space-y-4">
            <input type="hidden" name="id" value={candidate.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={candidate.full_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={candidate.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={candidate.phone ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_applied">Position Applied</Label>
                <Input
                  id="position_applied"
                  name="position_applied"
                  defaultValue={candidate.position_applied ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume_url">Resume URL</Label>
                <Input
                  id="resume_url"
                  name="resume_url"
                  type="url"
                  placeholder="https://"
                  defaultValue={candidate.resume_url ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={candidate.status}
                  className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                >
                  {CANDIDATE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={candidate.notes ?? ''}
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Link href="/recruiter/candidates">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <div className="ml-auto">
                <DeleteCandidateButton id={candidate.id} />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {(feedbacks ?? []).length > 0 && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Interview Feedback</CardTitle>
            <CardDescription>
              Feedback submitted by interviewers for this candidate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(feedbacks ?? []).map((fb: any) => (
              <div key={fb.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{fb.interviewer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{fb.interviewer?.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={fb.recommendation === 'strong_yes' || fb.recommendation === 'yes' ? 'default' : 'secondary'}>
                      {fb.recommendation?.replace('_', ' ')}
                    </Badge>
                    {fb.is_finalized && <Badge variant="outline" className="ml-2">Finalized</Badge>}
                  </div>
                </div>
                <div className="text-sm">
                  {fb.interview && (
                    <p className="text-muted-foreground mb-1">
                      {fb.interview.interview_type} — {fb.interview.scheduled_at ? new Date(fb.interview.scheduled_at).toLocaleDateString() : 'No date'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>Rating: <strong>{fb.rating}/5</strong></span>
                  <span>Communication: <strong>{fb.communication}/5</strong></span>
                  <span>Technical: <strong>{fb.technical_skills}/5</strong></span>
                  <span>Problem Solving: <strong>{fb.problem_solving}/5</strong></span>
                </div>
                {fb.comments && (
                  <p className="text-sm text-muted-foreground border-t pt-2">{fb.comments}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

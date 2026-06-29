import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServer } from '@/lib/supabase/server';
import { updateCandidate } from '@/lib/actions/recruiter';
import { CANDIDATE_STATUSES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    .single();

  if (!candidate) {
    notFound();
  }

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
    </div>
  );
}

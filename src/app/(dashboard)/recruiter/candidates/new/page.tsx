import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createCandidate } from '@/lib/actions/recruiter';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewCandidatePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/recruiter/candidates"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Add Candidate</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the candidate&apos;s details to add them to the pipeline</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
          <CardDescription>
            Enter the candidate&apos;s details to add them to the pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCandidate} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_applied">Position Applied</Label>
                <Input id="position_applied" name="position_applied" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume_url">Resume URL</Label>
                <Input id="resume_url" name="resume_url" type="url" placeholder="https://" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Candidate</Button>
              <Link href="/recruiter/candidates">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

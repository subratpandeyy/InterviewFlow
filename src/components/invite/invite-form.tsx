'use client';

import { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { inviteTeamMember } from '@/lib/actions/invite';

export function InviteForm() {
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await inviteTeamMember(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation sent!');
      form.reset();
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>Send an invitation to join your organization</CardDescription>
      </CardHeader>
      <form onSubmit={handleInvite}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="recruiter">Recruiter</option>
              <option value="interviewer">Interviewer</option>
            </select>
          </div>
          <LoadingButton type="submit" className="w-full" loading={loading} loadingText="Sending...">
            Send Invitation
          </LoadingButton>
        </CardContent>
      </form>
    </Card>
  );
}

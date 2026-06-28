'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { acceptInvitation } from '@/lib/actions/invite';
import type { Invitation } from '@/types';

interface AcceptInviteFormProps {
  invitation: Invitation;
}

export function AcceptInviteForm({ invitation }: AcceptInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('token', invitation.token);

    const result = await acceptInvitation(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Account created! Sign in with your credentials.');
      router.push('/login');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join Organization</CardTitle>
        <CardDescription>
          You&apos;ve been invited as a <strong>{invitation.role}</strong>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAccept}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={invitation.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Accept Invitation'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

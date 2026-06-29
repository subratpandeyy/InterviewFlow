'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateCandidateResume } from '@/lib/actions/candidate';

interface ResumeFormProps {
  sessionToken: string;
}

export function ResumeForm({ sessionToken }: ResumeFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('session_token', sessionToken);

    const result = await updateCandidateResume(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Resume updated!');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <Label htmlFor="resume_url">Resume URL</Label>
        <Input
          id="resume_url"
          name="resume_url"
          type="url"
          placeholder="https://example.com/my-resume.pdf"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteCandidate } from '@/lib/actions/recruiter';

async function deleteCandidateAction(_prevState: unknown, formData: FormData) {
  return deleteCandidate(formData);
}

export function DeleteCandidateButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteCandidateAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="destructive"
        disabled={pending}
        onClick={(e) => {
          if (!confirm('Are you sure you want to delete this candidate?')) {
            e.preventDefault();
          }
        }}
      >
        {pending ? 'Deleting...' : 'Delete Candidate'}
      </Button>
      {state && 'error' in state && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

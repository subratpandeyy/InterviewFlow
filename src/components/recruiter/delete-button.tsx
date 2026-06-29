'use client';

'use client';

import { useActionState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import { deleteCandidate } from '@/lib/actions/recruiter';

async function deleteCandidateAction(_prevState: unknown, formData: FormData) {
  return deleteCandidate(formData);
}

export function DeleteCandidateButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteCandidateAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <LoadingButton
        type="submit"
        variant="destructive"
        loading={pending}
        loadingText="Deleting..."
        onClick={(e: React.MouseEvent) => {
          if (!confirm('Are you sure you want to delete this candidate?')) {
            e.preventDefault();
          }
        }}
      >
        Delete Candidate
      </LoadingButton>
      {state && 'error' in state && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

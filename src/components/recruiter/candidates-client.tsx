'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, Users } from 'lucide-react';
import { updateCandidate, deleteCandidate, updateCandidateStatus } from '@/lib/actions/recruiter';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { Candidate } from '@/types';

interface CandidatesClientProps {
  candidates: Candidate[];
}

const STATUSES = ['applied', 'screening', 'scheduled', 'interviewed', 'selected', 'rejected'] as const;

const statusStyle: Record<string, string> = {
  applied: 'bg-accent/10 text-accent',
  screening: 'bg-amber-500/10 text-amber-400',
  scheduled: 'bg-accent/10 text-accent',
  interviewed: 'bg-amber-500/10 text-amber-400',
  selected: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive-foreground',
};

export function CandidatesClient({ candidates }: CandidatesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = search
    ? candidates.filter(
        (c) =>
          c.full_name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      )
    : candidates;

  const handleStatusChange = async (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateCandidateStatus(id, status);
        toast.success('Status updated');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const result = await updateCandidate(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Candidate updated');
        setEditingCandidate(null);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCandidate) return;
    setDeleteLoading(true);
    try {
      const formData = new FormData();
      formData.set('id', deletingCandidate.id);
      const result = await deleteCandidate(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Candidate deleted');
        setDeletingCandidate(null);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-sm text-muted-foreground">No candidates yet. Add your first candidate.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {filtered.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell className="font-medium">
                <Link href={`/recruiter/candidates/${candidate.id}`} className="hover:text-accent transition-colors">
                  {candidate.full_name}
                </Link>
              </TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>{candidate.position_applied || '-'}</TableCell>
              <TableCell>
                <select
                  value={candidate.status}
                  onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                  disabled={isPending}
                  className={`rounded-md border-0 px-2 py-1 text-xs font-medium cursor-pointer disabled:opacity-50 ${statusStyle[candidate.status] || ''}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(candidate.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditingCandidate(candidate)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingCandidate(candidate)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editingCandidate} onOpenChange={(open) => { if (!open) setEditingCandidate(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update the candidate&apos;s information below.
            </DialogDescription>
          </DialogHeader>
          {editingCandidate && (
            <form onSubmit={handleEdit} className="space-y-6">
              <input type="hidden" name="id" value={editingCandidate.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={editingCandidate.full_name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingCandidate.email}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingCandidate.phone || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position_applied">Position Applied</Label>
                  <Input
                    id="position_applied"
                    name="position_applied"
                    defaultValue={editingCandidate.position_applied || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume_url">Resume URL</Label>
                  <Input
                    id="resume_url"
                    name="resume_url"
                    defaultValue={editingCandidate.resume_url || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={editingCandidate.status}
                    className="flex h-12 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingCandidate.notes || ''}
                  className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <LoadingButton type="submit" loading={editLoading} loadingText="Saving...">
                  Save Changes
                </LoadingButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCandidate} onOpenChange={(open) => { if (!open) setDeletingCandidate(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Candidate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCandidate?.full_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <LoadingButton
              variant="destructive"
              loading={deleteLoading}
              loadingText="Deleting..."
              onClick={handleDelete}
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

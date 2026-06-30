'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Pin, PinOff, Quote, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { NOTE_TYPES } from '@/lib/constants';
import * as actions from '@/lib/actions/candidate-profile';
import type { CandidateNote } from '@/types';

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NOTE_TYPE_STYLES: Record<string, string> = {
  general: 'bg-muted/30 border-border',
  feedback: 'border-blue-500/20 bg-blue-500/5',
  summary: 'border-purple-500/20 bg-purple-500/5',
  action_item: 'border-amber-500/20 bg-amber-500/5',
};

interface NotesSectionProps {
  notes: CandidateNote[];
  candidateId: string;
  currentUser: {
    profileId: string;
    fullName: string;
  };
}

export function NotesSection({ notes, candidateId, currentUser }: NotesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CandidateNote | null>(null);
  const [loading, setLoading] = useState(false);

  const sorted = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('candidate_id', candidateId);
      const result = editing
        ? await actions.editNote(formData)
        : await actions.addNote(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? 'Note updated' : 'Note added');
        setShowAdd(false);
        setEditing(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (note: CandidateNote) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', note.id);
      formData.set('candidate_id', candidateId);
      const result = await actions.removeNote(formData);
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success('Note deleted');
        router.refresh();
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notes ({notes.length})</CardTitle>
              <CardDescription>Structured notes about the candidate</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No notes yet</p>
              <p className="text-xs text-muted-foreground mb-4">Add notes to track observations and follow-ups</p>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((note) => {
                const author = (note as unknown as { author: { full_name: string } | null }).author;
                return (
                  <div
                    key={note.id}
                    className={`p-4 rounded-lg border ${NOTE_TYPE_STYLES[note.note_type] || NOTE_TYPE_STYLES.general} ${note.is_pinned ? 'ring-1 ring-accent/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{author?.full_name || 'Unknown'}</span>
                          <span>·</span>
                          <span>{formatDateTime(note.created_at)}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{note.note_type}</Badge>
                          {note.is_pinned && <Pin className="h-3 w-3 text-accent" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon-xs" onClick={() => { setEditing(note); setShowAdd(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(note)} disabled={isPending}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Note' : 'Add Note'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the note content' : 'Add a new note about this candidate'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-2">
              <Label htmlFor="content">Note</Label>
              <Textarea id="content" name="content" defaultValue={editing?.content || ''} required rows={4} placeholder="Write your note here..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note_type">Note Type</Label>
              <select
                id="note_type"
                name="note_type"
                defaultValue={editing?.note_type || 'general'}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_pinned" name="is_pinned" value="true" defaultChecked={editing?.is_pinned || false} className="rounded border-border" />
              <Label htmlFor="is_pinned" className="text-sm">Pin this note</Label>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <LoadingButton type="submit" loading={loading}>
                {editing ? 'Save Changes' : 'Add Note'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

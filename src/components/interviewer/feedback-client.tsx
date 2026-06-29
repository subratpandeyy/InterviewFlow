'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Pencil, Lock, X, Loader2 } from 'lucide-react';
import { editFeedback, finalizeFeedback } from '@/lib/actions/interviewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import type { InterviewFeedback, Interview, Candidate, Position } from '@/types';

interface FeedbackClientProps {
  feedbacks: InterviewFeedback[];
  interviews: (Interview & { candidate: Candidate; position: Position })[];
  profileId: string;
}

export function FeedbackClient({ feedbacks, interviews }: FeedbackClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  const interviewMap = new Map(interviews.map((i) => [i.id, i]));
  const sorted = [...feedbacks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleEdit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await editFeedback(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success('Feedback updated');
          setEditingId(null);
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update feedback');
      }
    });
  };

  const handleFinalize = async (feedbackId: string) => {
    if (!window.confirm('Are you sure you want to finalize this feedback? This action cannot be undone.')) {
      return;
    }

    setFinalizingId(feedbackId);
    const formData = new FormData();
    formData.append('feedback_id', feedbackId);

    startTransition(async () => {
      try {
        const result = await finalizeFeedback(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success('Feedback finalized');
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to finalize feedback');
      } finally {
        setFinalizingId(null);
      }
    });
  };

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Submitted Feedback</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((fb) => {
          const interview = interviewMap.get(fb.interview_id);
          const isEditing = editingId === fb.id;

          return (
            <Card key={fb.id} className={fb.is_finalized ? 'opacity-75' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {interview && (
                      <p className="text-sm font-medium">
                        {interview.candidate?.full_name} - {interview.position?.title}
                      </p>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Rating: {fb.rating}/5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fb.is_finalized ? (
                      <Badge variant="secondary">Finalized</Badge>
                    ) : (
                      <Badge variant={fb.recommendation === 'hire' ? 'default' : 'secondary'}>
                        {fb.recommendation}
                      </Badge>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                      <span>Comm: {fb.communication}/5</span>
                      <span>Tech: {fb.technical_skills}/5</span>
                      <span>Problem: {fb.problem_solving}/5</span>
                    </div>
                    {fb.comments && (
                      <p className="text-sm text-muted-foreground mb-3">{fb.comments}</p>
                    )}
                    <div className="flex gap-2">
                      {!fb.is_finalized && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(fb.id)}
                        >
                          <Pencil className="size-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                      {!fb.is_finalized && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFinalize(fb.id)}
                          disabled={isPending && finalizingId === fb.id}
                        >
                          {isPending && finalizingId === fb.id ? (
                            <Loader2 className="size-3.5 mr-1 animate-spin" />
                          ) : (
                            <Lock className="size-3.5 mr-1" />
                          )}
                          Finalize
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {isEditing && (
                  <form action={handleEdit} className="space-y-3 mt-2 border-t pt-3">
                    <input type="hidden" name="feedback_id" value={fb.id} />

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-rating-${fb.id}`}>Rating</Label>
                        <select
                          id={`edit-rating-${fb.id}`}
                          name="rating"
                          defaultValue={fb.rating}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-communication-${fb.id}`}>Communication</Label>
                        <select
                          id={`edit-communication-${fb.id}`}
                          name="communication"
                          defaultValue={fb.communication}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-technical-${fb.id}`}>Technical Skills</Label>
                        <select
                          id={`edit-technical-${fb.id}`}
                          name="technical_skills"
                          defaultValue={fb.technical_skills}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-problem-${fb.id}`}>Problem Solving</Label>
                        <select
                          id={`edit-problem-${fb.id}`}
                          name="problem_solving"
                          defaultValue={fb.problem_solving}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`edit-comments-${fb.id}`}>Comments</Label>
                      <Textarea
                        id={`edit-comments-${fb.id}`}
                        name="comments"
                        rows={3}
                        defaultValue={fb.comments ?? ''}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`edit-recommendation-${fb.id}`}>Recommendation</Label>
                      <select
                        id={`edit-recommendation-${fb.id}`}
                        name="recommendation"
                        defaultValue={fb.recommendation}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        <option value="hire">Hire</option>
                        <option value="maybe">Maybe</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isPending}>
                        {isPending ? (
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

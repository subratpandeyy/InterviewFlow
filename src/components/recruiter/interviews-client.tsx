'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { updateInterview, deleteInterview } from '@/lib/actions/recruiter';
import { updateMeetingLink } from '@/lib/actions/meetings';
import { INTERVIEW_STATUSES, MEETING_PROVIDERS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  confirmed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const interviewTypeLabels: Record<string, string> = {
  hr: 'HR Round',
  technical: 'Technical Round',
  managerial: 'Managerial Round',
  final: 'Final Round',
};

const defaultEditData = {
  scheduled_at: '',
  status: 'pending',
  notes: '',
  meeting_link: '',
  meeting_provider: 'google_meet',
};

interface Props {
  interviews: any[];
  meetingsByInterview: Record<string, any>;
}

export default function InterviewsClient({ interviews, meetingsByInterview }: Props) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState(defaultEditData);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleEdit(interview: any) {
    setEditId(interview.id);
    setEditData({
      scheduled_at: interview.scheduled_at
        ? new Date(interview.scheduled_at).toISOString().slice(0, 16)
        : '',
      status: interview.status,
      notes: interview.notes || '',
      meeting_link: interview.meeting_link || '',
      meeting_provider: interview.meeting_provider || 'google_meet',
    });
  }

  function handleCancelEdit() {
    setEditId(null);
    setEditData(defaultEditData);
  }

  function handleUpdate(formData: FormData) {
    startUpdateTransition(async () => {
      formData.set('id', editId!);
      const result = await updateInterview(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Interview updated successfully');
        setEditId(null);
        setEditData(defaultEditData);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!showConfirmDialog) return;
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set('id', showConfirmDialog);
      const result = await deleteInterview(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Interview deleted successfully');
        setShowConfirmDialog(null);
        router.refresh();
      }
    });
  }

  function handleStatusChange(id: string, status: string) {
    startUpdateTransition(async () => {
      const formData = new FormData();
      formData.set('id', id);
      formData.set('status', status);
      const result = await updateInterview(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Status updated');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Interviews</h1>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Delete Interview</CardTitle>
              <CardDescription>
                Are you sure you want to delete this interview? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(null)}
                disabled={isDeletePending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeletePending}
              >
                {isDeletePending ? 'Deleting...' : 'Delete'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Meeting Link</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No interviews scheduled yet.
                    </TableCell>
                  </TableRow>
                )}
                {interviews.map((interview) => {
                  const existingMeeting = meetingsByInterview[interview.id];
                  return (
                    <TableRow key={interview.id}>
                      <TableCell className="font-medium">
                        {interview.candidate?.full_name}
                      </TableCell>
                      <TableCell>{interview.position?.title}</TableCell>
                      <TableCell>
                        {interviewTypeLabels[interview.interview_type] || interview.interview_type}
                      </TableCell>
                      <TableCell>
                        {interview.scheduled_at
                          ? new Date(interview.scheduled_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <select
                          value={interview.status}
                          onChange={(e) => handleStatusChange(interview.id, e.target.value)}
                          className="flex h-8 rounded border border-input bg-background px-2 text-xs"
                          disabled={isUpdatePending}
                        >
                          {INTERVIEW_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        {interview.status === 'scheduled' && (
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-primary hover:underline">
                              {existingMeeting ? 'Update Link' : 'Add Link'}
                            </summary>
                            <form
                              action={async (formData) => {
                                try {
                                  await updateMeetingLink(formData);
                                  toast.success('Meeting link saved');
                                  router.refresh();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : 'Failed to save');
                                }
                              }}
                              className="mt-2 space-y-2 p-2 border rounded-md bg-muted/30"
                            >
                              <input type="hidden" name="interview_id" value={interview.id} />
                              <div className="space-y-1">
                                <Label className="text-xs">Provider</Label>
                                <select
                                  name="provider"
                                  className="flex h-8 w-full rounded border border-input bg-background px-2 text-xs"
                                  defaultValue={existingMeeting?.provider || 'google_meet'}
                                >
                                  {MEETING_PROVIDERS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Meeting URL</Label>
                                <Input
                                  name="meeting_url"
                                  type="url"
                                  placeholder="https://..."
                                  defaultValue={existingMeeting?.meeting_url || interview.meeting_link || ''}
                                  className="h-8 text-xs"
                                  required
                                />
                              </div>
                              <Button type="submit" size="sm" className="w-full text-xs">
                                {existingMeeting ? 'Update' : 'Save'} Link
                              </Button>
                            </form>
                          </details>
                        )}
                        {interview.meeting_link && (
                          <div className="text-xs mt-1">
                            <a
                              href={interview.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {interview.meeting_provider === 'google_meet' ? 'Google Meet' :
                               interview.meeting_provider === 'zoom' ? 'Zoom' :
                               interview.meeting_provider === 'microsoft_teams' ? 'Teams' :
                               'Meeting Link'}
                            </a>
                          </div>
                        )}
                        {!interview.meeting_link && interview.status !== 'scheduled' && (
                          <span className="text-xs text-muted-foreground">
                            {interview.status === 'pending' ? 'Awaiting booking' : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(interview)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowConfirmDialog(interview.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {editId && (
          <div className="w-96 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle>Edit Interview</CardTitle>
                <CardDescription>Update interview details</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-scheduled_at">Scheduled At</Label>
                    <Input
                      id="edit-scheduled_at"
                      name="scheduled_at"
                      type="datetime-local"
                      value={editData.scheduled_at}
                      onChange={(e) => setEditData({ ...editData, scheduled_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      name="status"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      {INTERVIEW_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      name="notes"
                      rows={3}
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-meeting_link">Meeting Link</Label>
                    <Input
                      id="edit-meeting_link"
                      name="meeting_link"
                      type="url"
                      placeholder="https://..."
                      value={editData.meeting_link}
                      onChange={(e) => setEditData({ ...editData, meeting_link: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-meeting_provider">Meeting Provider</Label>
                    <select
                      id="edit-meeting_provider"
                      name="meeting_provider"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editData.meeting_provider}
                      onChange={(e) => setEditData({ ...editData, meeting_provider: e.target.value })}
                    >
                      {MEETING_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isUpdatePending}>
                      {isUpdatePending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMeetingLink } from '@/lib/actions/meetings';
import { MEETING_PROVIDERS } from '@/lib/constants';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
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

export default async function InterviewsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*)')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  const { data: allMeetings } = await admin
    .from('interview_meetings')
    .select('*');

  const meetingsByInterview = new Map((allMeetings ?? []).map(m => [m.interview_id, m]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Interviews</h1>
      </div>

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No interviews scheduled yet.
                </TableCell>
              </TableRow>
            )}
            {interviews?.map((interview) => {
              const existingMeeting = meetingsByInterview.get(interview.id);
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
                    <Badge
                      className={statusColors[interview.status] || ''}
                      variant="outline"
                    >
                      {interview.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {interview.status === 'scheduled' && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-primary hover:underline">
                          {existingMeeting ? 'Update Link' : 'Add Link'}
                        </summary>
                        <form action={updateMeetingLink} className="mt-2 space-y-2 p-2 border rounded-md bg-muted/30">
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

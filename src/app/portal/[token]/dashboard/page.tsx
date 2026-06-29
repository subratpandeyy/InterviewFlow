import { redirect } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { CANDIDATE_STATUSES, INTERVIEW_TYPES, INTERVIEW_STATUSES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ResumeForm } from '@/components/candidate/resume-form';

export const dynamic = 'force-dynamic';

const statusColorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  applied: 'secondary',
  screening: 'outline',
  scheduled: 'default',
  interviewed: 'outline',
  selected: 'default',
  rejected: 'destructive',
};

const interviewStatusColorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  scheduled: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { token } = await params;
  const { session: sessionToken } = await searchParams;

  if (!sessionToken) {
    redirect(`/portal/${token}?error=no_session`);
  }

  const admin = createAdmin();

  const { data: session } = await admin
    .from('candidate_sessions')
    .select('*, candidate:candidates(*)')
    .eq('session_token', sessionToken)
    .not('otp_verified_at', 'is', null)
    .gt('session_expires_at', new Date().toISOString())
    .single();

  if (!session) {
    redirect(`/portal/${token}?error=session_expired`);
  }

  const candidate = session.candidate;

  const { data: interviews } = await admin
    .from('interviews')
    .select('*, position:positions(*), interviewer:profiles!interviewer_id(full_name, email)')
    .eq('candidate_id', candidate.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Candidate Profile</CardTitle>
          <CardDescription>Your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{candidate.full_name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{candidate.email}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{candidate.phone}</span>
            </div>
          )}
          {candidate.position_applied && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Position Applied</span>
              <span className="font-medium">{candidate.position_applied}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusColorMap[candidate.status] || 'outline'}>
              {CANDIDATE_STATUSES.find(s => s.value === candidate.status)?.label || candidate.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
          <CardDescription>Your application journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {CANDIDATE_STATUSES.map((status, idx) => {
              const currentIdx = CANDIDATE_STATUSES.findIndex(s => s.value === candidate.status);
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={status.value} className="flex items-center gap-3 py-1.5">
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isCompleted ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {status.label}
                  </span>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {interviews && interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interviews</CardTitle>
            <CardDescription>Your interview history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Meeting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">
                      {interview.position?.title || '—'}
                    </TableCell>
                    <TableCell>
                      {INTERVIEW_TYPES.find(t => t.value === interview.interview_type)?.label || interview.interview_type}
                    </TableCell>
                    <TableCell>{formatDate(interview.scheduled_at)}</TableCell>
                    <TableCell>{interview.interviewer?.full_name || '—'}</TableCell>
                    <TableCell>{interview.duration_minutes}m</TableCell>
                    <TableCell>
                      <Badge variant={interviewStatusColorMap[interview.status] || 'outline'}>
                        {INTERVIEW_STATUSES.find(s => s.value === interview.status)?.label || interview.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {interview.meeting_link ? (
                        <a
                          href={interview.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Join
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Upload or update your resume link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidate.resume_url ? (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Current Resume</span>
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm font-medium"
              >
                View Resume
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}
          <ResumeForm sessionToken={sessionToken} />
        </CardContent>
      </Card>
    </div>
  );
}

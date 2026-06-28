import { createServer } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function UpcomingPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  if (!profile) return null;

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*), position:positions(*)')
    .eq('interviewer_id', profile.id)
    .in('status', ['pending', 'scheduled'])
    .order('scheduled_at', { ascending: true });

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round',
    technical: 'Technical Round',
    managerial: 'Managerial Round',
    final: 'Final Round',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Upcoming Interviews</h1>

      {interviews?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No upcoming interviews assigned.
          </CardContent>
        </Card>
      ) : (
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
              {interviews?.map((interview) => (
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
                      : 'Not scheduled'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={interview.status === 'scheduled' ? 'default' : 'secondary'}>
                      {interview.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {interview.meeting_link ? (
                      <a
                        href={interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Join
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

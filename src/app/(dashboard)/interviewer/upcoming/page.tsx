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
import { Calendar } from 'lucide-react';

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Upcoming Interviews</h1>
        <p className="text-sm text-muted-foreground mt-1">View and prepare for your scheduled interviews</p>
      </div>

      {interviews?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming interviews assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
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
                        className="text-accent hover:underline"
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

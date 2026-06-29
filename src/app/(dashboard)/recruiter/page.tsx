import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Calendar, Clock, Briefcase } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RecruiterDashboard() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();

  const [candidatesRes, interviewsRes, availabilityRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('interviews')
      .select('*, candidate:candidates(*), position:positions(*)')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['pending', 'scheduled'])
      .order('created_at', { ascending: false }),
    admin
      .from('interviewer_availability')
      .select('*, profile:profiles!interviewer_id(full_name)')
      .eq('status', 'available')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20),
  ]);

  const candidates = candidatesRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const availability = availabilityRes.data ?? [];

  const upcomingInterviews = interviews.filter(i => i.status === 'scheduled');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const interviewsToday = interviews.filter(i => {
    if (!i.scheduled_at) return false;
    const d = new Date(i.scheduled_at);
    return d >= today && d < tomorrow;
  });

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const interviewsThisWeek = interviews.filter(i => {
    if (!i.scheduled_at) return false;
    const d = new Date(i.scheduled_at);
    return d >= today && d < weekEnd;
  });

  const stats = [
    { title: 'Total Candidates', value: candidates.length, icon: Users },
    { title: 'Upcoming Interviews', value: upcomingInterviews.length, icon: Calendar },
    { title: 'Interviews Today', value: interviewsToday.length, icon: Clock },
    { title: 'Scheduled This Week', value: interviewsThisWeek.length, icon: Briefcase },
  ];

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round', technical: 'Technical Round', managerial: 'Managerial Round', final: 'Final Round',
  };

  function formatTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Candidates ({candidates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/recruiter/candidates" className="text-sm text-primary hover:underline mb-4 block">
              View all candidates →
            </Link>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No candidates yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews ({upcomingInterviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/recruiter/interviews" className="text-sm text-primary hover:underline mb-4 block">
              View all interviews →
            </Link>
            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No upcoming interviews.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingInterviews.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.candidate?.full_name}</TableCell>
                      <TableCell>{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {availability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Availability (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availability.map((s) => {
                  const prof = s.profile as { full_name: string } | undefined;
                  const start = s.start_time;
                  const end = s.end_time;
                  const diff = (parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])) -
                               (parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]));
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{prof?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{new Date(s.date + 'T12:00:00').toLocaleDateString()}</TableCell>
                      <TableCell>{formatTime(start)} - {formatTime(end)}</TableCell>
                      <TableCell className="text-muted-foreground">{diff} min</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

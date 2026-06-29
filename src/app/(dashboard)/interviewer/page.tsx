import { createServer } from '@/lib/supabase/server';
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
import { Calendar, Clock, Star, Video, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InterviewerDashboard() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [interviewsRes, feedbacksRes, calendarTokenRes] = await Promise.all([
    supabase
      .from('interviews')
      .select('*, candidate:candidates(*), position:positions(*)')
      .eq('interviewer_id', profile.id)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('interview_feedback')
      .select('interview_id')
      .eq('interviewer_id', profile.id),
    supabase
      .from('google_calendar_tokens')
      .select('calendar_email')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  ]);

  const interviews = interviewsRes.data ?? [];
  const feedbacks = feedbacksRes.data ?? [];
  const isCalendarConnected = !!calendarTokenRes.data;

  const upcomingInterviews = interviews.filter(i => i.status === 'scheduled' && i.scheduled_at && new Date(i.scheduled_at) >= today);
  const interviewsToday = interviews.filter(i => i.status === 'scheduled' && i.scheduled_at && new Date(i.scheduled_at) >= today && new Date(i.scheduled_at) < tomorrow);
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const feedbackInterviewIds = new Set(feedbacks.map(f => f.interview_id));
  const pendingFeedback = completedInterviews.filter(i => !feedbackInterviewIds.has(i.id));

  const stats = [
    { title: 'Upcoming Interviews', value: upcomingInterviews.length, icon: Calendar },
    { title: 'Interviews Today', value: interviewsToday.length, icon: Clock },
    { title: 'Pending Feedback', value: pendingFeedback.length, icon: Star },
    {
      title: 'Calendar',
      value: isCalendarConnected ? 'Connected' : 'Not Connected',
      icon: isCalendarConnected ? CheckCircle2 : XCircle,
    },
  ];

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round', technical: 'Technical Round', managerial: 'Managerial Round', final: 'Final Round',
  };

  const providerLabels: Record<string, string> = {
    google_meet: 'Google Meet', zoom: 'Zoom', microsoft_teams: 'Teams', custom: 'Link',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Interviewer Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your interviews and tasks</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.title === 'Calendar' && !isCalendarConnected ? 'text-destructive' : ''}`}>
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </div>
              {stat.title === 'Calendar' && isCalendarConnected && calendarTokenRes.data && (
                <p className="text-xs text-muted-foreground mt-1">{calendarTokenRes.data.calendar_email}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Interviews ({upcomingInterviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/interviewer/upcoming" className="text-sm text-accent hover:underline mb-4 block">
            View all upcoming →
          </Link>
          {upcomingInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Calendar className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Meeting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingInterviews.slice(0, 10).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.candidate?.full_name}</TableCell>
                      <TableCell>{i.position?.title}</TableCell>
                      <TableCell>{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : 'Not scheduled'}
                      </TableCell>
                      <TableCell>
                        {i.meeting_link ? (
                          <a
                            href={i.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline"
                          >
                            <Video className="size-3.5" />
                            {providerLabels[i.meeting_provider || ''] || 'Join'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/interviewer/availability" className="text-sm text-accent hover:underline mb-4 block">
              Manage availability →
            </Link>
            {isCalendarConnected ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Google Calendar Connected</p>
                  <p className="text-xs text-muted-foreground">
                    Availability synced from {calendarTokenRes.data?.calendar_email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <XCircle className="size-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">No Calendar Connected</p>
                  <p className="text-xs text-muted-foreground">
                    Connect Google Calendar to allow candidates to book interviews based on your availability.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Feedback ({pendingFeedback.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/interviewer/feedback" className="text-sm text-accent hover:underline mb-4 block">
              Submit feedback →
            </Link>
            {pendingFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Star className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No pending feedback.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingFeedback.slice(0, 5).map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">{i.candidate?.full_name}</span>
                    <Badge variant="outline">{interviewTypeLabels[i.interview_type] || i.interview_type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

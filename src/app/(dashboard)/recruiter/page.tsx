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
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Users, Calendar, Clock, Briefcase, Inbox, CalendarX, Star, UserCheck } from 'lucide-react';
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

  const { data: allProfiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('user_id', (await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', membership.organization_id)
    ).data?.map((m) => m.user_id).filter(Boolean) ?? []);

  const profileById = Object.fromEntries(
    (allProfiles ?? []).map((p) => [p.id, p]),
  );

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', membership.organization_id)
    .eq('role', 'interviewer');

  const interviewerUserIds = (interviewerMembers ?? []).map((m) => m.user_id).filter(Boolean);

  const { data: interviewerProfiles } = interviewerUserIds.length > 0
    ? await admin.from('profiles').select('id, full_name, years_of_experience').in('user_id', interviewerUserIds)
    : { data: [] };

  const interviewerProfileIds = (interviewerProfiles ?? []).map((p: any) => p.id);

  const [candidatesRes, interviewsRes, metricsRes, skillsRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('interviews')
      .select('*, candidate:candidates(*), position:positions(*), interviewer:profiles!interviewer_id(full_name)')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['pending', 'scheduled'])
      .order('created_at', { ascending: false }),
    interviewerProfileIds.length > 0
      ? admin.from('interviewer_metrics').select('profile_id, upcoming_interviews, interviews_this_week, total_interviews').in('profile_id', interviewerProfileIds)
      : { data: [] },
    interviewerProfileIds.length > 0
      ? admin.from('interviewer_skills').select('profile_id, skill_name, is_primary').in('profile_id', interviewerProfileIds)
      : { data: [] },
  ]);

  const candidates = candidatesRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const interviewerMetricsData = metricsRes.data ?? [];
  const interviewerSkillsData = skillsRes.data ?? [];

  const metricsByProfile = Object.fromEntries(
    (interviewerMetricsData as any[]).map((m: any) => [m.profile_id, m]),
  );

  const results = {
    interviewers: (interviewerProfiles ?? []).map((p: any) => ({
      profileId: p.id,
      name: p.full_name,
      experience: p.years_of_experience,
      total: metricsByProfile[p.id]?.total_interviews ?? 0,
      upcomingInterviews: metricsByProfile[p.id]?.upcoming_interviews ?? 0,
      skills: (interviewerSkillsData as any[]).filter((s: any) => s.profile_id === p.id).map((s: any) => s.skill_name),
    })),
  };

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

  const providerLabels: Record<string, string> = {
    google_meet: 'Google Meet', zoom: 'Zoom', microsoft_teams: 'Teams', custom: 'Link',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recruiter Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your recruitment pipeline</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
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
          <CardContent className="pt-0">
            {candidates.length > 0 && (
              <div className="mb-4">
                <Link href="/recruiter/candidates" className={cn(buttonVariants({ variant: 'link' }), 'h-auto px-0 text-sm')}>
                  View all candidates →
                </Link>
              </div>
            )}
            {candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No candidates yet.</p>
              </div>
            ) : (
              <Table className="scrollbar-thin">
                <TableHeader className="sticky top-0 z-10 bg-sidebar">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.id} className="even:bg-muted/30">
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
          <CardContent className="pt-0">
            {upcomingInterviews.length > 0 && (
              <div className="mb-4">
                <Link href="/recruiter/interviews" className={cn(buttonVariants({ variant: 'link' }), 'h-auto px-0 text-sm')}>
                  View all interviews →
                </Link>
              </div>
            )}
            {upcomingInterviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarX className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
              </div>
            ) : (
              <Table className="scrollbar-thin">
                <TableHeader className="sticky top-0 z-10 bg-sidebar">
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Interviewer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Meeting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingInterviews.map((i) => (
                    <TableRow key={i.id} className="even:bg-muted/30">
                      <TableCell className="font-medium">{i.candidate?.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{i.interviewer?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        {i.meeting_link ? (
                          <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
                            {providerLabels[i.meeting_provider] || 'Join'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interviewer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Available Today</span>
              </div>
              <p className="text-2xl font-semibold">{getAvailableInterviewersCount(results)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Least Busy</span>
              </div>
              <p className="text-lg font-semibold truncate">{getLeastBusyInterviewer(results, profileById)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Most Experienced</span>
              </div>
              <p className="text-lg font-semibold truncate">{getMostExperiencedInterviewer(results, profileById)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Upcoming Avail.</span>
              </div>
              <p className="text-lg font-semibold">{getUpcomingInterviewsCount(results)}</p>
            </div>
          </div>
          <div className="mt-4">
            <a href="/recruiter/interviewers" className={cn(buttonVariants({ variant: 'link' }), 'h-auto px-0 text-sm')}>
              View interviewer directory →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getAvailableInterviewersCount(data: any) {
  if (!data?.interviewers?.length) return 0;
  return data.interviewers.filter((i: any) => i.upcomingInterviews < 3).length;
}

function getLeastBusyInterviewer(data: any, profileById: any) {
  if (!data?.interviewers?.length) return '-';
  const sorted = [...data.interviewers].sort((a: any, b: any) => a.total - b.total);
  const least = sorted[0];
  if (!least) return '-';
  const p = profileById[least.profileId];
  return p?.full_name || '-';
}

function getMostExperiencedInterviewer(data: any, profileById: any) {
  if (!data?.interviewers?.length) return '-';
  const sorted = [...data.interviewers].sort((a: any, b: any) => (b.experience || 0) - (a.experience || 0));
  const most = sorted[0];
  return most?.name || '-';
}

function getUpcomingInterviewsCount(data: any) {
  if (!data?.interviewers?.length) return 0;
  return data.interviewers.reduce((sum: number, i: any) => sum + (i.upcomingInterviews || 0), 0);
}


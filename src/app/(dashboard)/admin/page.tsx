import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Briefcase, Calendar, UserCheck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarConnections } from '@/components/admin/calendar-connections';
import { getInterviewerTokens } from '@/lib/google/tokens';
import { listUpcomingEvents } from '@/lib/google/calendar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
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

  const [membersRes, profileRes] = await Promise.all([
    admin
      .from('organization_members')
      .select('id, role, user_id, created_at')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('user_id, full_name, email')
      .in(
        'user_id',
        (
          await admin
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', membership.organization_id)
        ).data?.map((m) => m.user_id) ?? [],
      ),
  ]);

  const profileByUserId = Object.fromEntries(
    (profileRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const members = (membersRes.data ?? []).map((m) => ({
    ...m,
    profiles: profileByUserId[m.user_id] ?? { full_name: 'Unknown', email: '' },
  }));

  const [
    candidatesCountRes,
    allInterviewsRes,
    availabilityRes,
    upcomingCountRes,
    totalInterviewCountRes,
  ] = await Promise.all([
    admin
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null),
    supabase
      .from('interviews')
      .select('id, interview_type, status, scheduled_at, candidate:candidates!inner(full_name), position:positions!inner(title)')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20),
    admin
      .from('interviewer_availability')
      .select('id, date, start_time, end_time, profile:profiles!interviewer_id(full_name)')
      .eq('status', 'available')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50),
    admin
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString()),
    admin
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null),
  ]);
  const candidateCount = candidatesCountRes.count ?? 0;
  const allInterviews = allInterviewsRes.data ?? [];
  const availability = availabilityRes.data ?? [];
  const upcomingCount = upcomingCountRes.count ?? allInterviews.length;
  const totalInterviewCount = totalInterviewCountRes.count ?? 0;

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('*, profiles!inner(*)')
    .eq('organization_id', membership.organization_id)
    .eq('role', 'interviewer');

  const calendarConnections = await Promise.all(
    (interviewerMembers ?? []).map(async (m: any) => {
      const tokenBase = await admin
        .from('google_calendar_tokens')
        .select('calendar_email')
        .eq('profile_id', m.profiles.id)
        .maybeSingle();

      let meta: Record<string, string | null> | null = null;
      if (tokenBase.data) {
        try {
          const { data: m2 } = await admin
            .from('google_calendar_tokens')
            .select('last_sync_at, sync_status')
            .eq('profile_id', m.profiles.id)
            .maybeSingle();
          meta = m2 as Record<string, string | null> | null;
        } catch {
          // migration columns don't exist yet
        }
      }

      let upcomingCount = 0;
      if (tokenBase.data) {
        const tokens = await getInterviewerTokens(m.profiles.id).catch(() => null);
        if (tokens) {
          try {
            const events = await listUpcomingEvents(tokens.accessToken, tokens.refreshToken, tokens.calendarEmail, 5);
            upcomingCount = events.length;
          } catch {}
        }
      }

      return {
        profileId: m.profiles.id,
        fullName: m.profiles.full_name,
        email: m.profiles.email,
        googleEmail: tokenBase.data?.calendar_email ?? '',
        connected: !!tokenBase.data,
        lastSyncAt: meta?.last_sync_at ?? null,
        syncStatus: meta?.sync_status ?? null,
        upcomingCount,
      };
    }),
  );

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round', technical: 'Technical Round', managerial: 'Managerial Round', final: 'Final Round',
  };

  function formatTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  const stats = [
    { label: 'Team Members', value: members.length, icon: Users },
    { label: 'Total Candidates', value: candidateCount, icon: UserCheck },
    { label: 'Upcoming Interviews', value: upcomingCount, icon: Calendar },
    { label: 'Total Interviews', value: totalInterviewCount, icon: Briefcase },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your organization</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pb-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Team Members ({members.length})</CardTitle>
            <Link
              href="/admin/users"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-muted-foreground')}
            >
              Manage <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No team members yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const p = m.profiles;
                      const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <TableRow key={m.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{p.full_name}</p>
                                <p className="text-xs text-muted-foreground">{p.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.role === 'organization_admin' ? 'default' : 'secondary'}>
                              {m.role === 'organization_admin' ? 'Admin' : m.role === 'recruiter' ? 'Recruiter' : 'Interviewer'}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="success">Active</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews ({upcomingCount})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {allInterviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming interviews</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInterviews.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium text-foreground">{i.candidate?.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                        <TableCell>
                          <Badge variant={i.status === 'confirmed' ? 'success' : 'warning'}>
                            {i.status === 'confirmed' ? 'Confirmed' : 'Scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {availability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Availability</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
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
                  {availability.map((s: any) => {
                    const prof = s.profile as { full_name: string } | undefined;
                    const start = s.start_time;
                    const end = s.end_time;
                    const diff = (parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])) -
                                 (parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]));
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-foreground">{prof?.full_name || 'Unknown'}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(s.date + 'T12:00:00').toLocaleDateString()}</TableCell>
                        <TableCell className="text-muted-foreground">{formatTime(start)} - {formatTime(end)}</TableCell>
                        <TableCell className="text-muted-foreground">{diff} min</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <CalendarConnections connections={calendarConnections} />
    </div>
  );
}

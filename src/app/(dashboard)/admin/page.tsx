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
import type { DbGoogleCalendarToken, DbProfile } from '@/types/database';

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

  const { data: allMembers } = await admin
    .from('organization_members')
    .select('id, user_id, role, organization_id, created_at')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  const { data: allProfiles } = await admin
    .from('profiles')
    .select('id, user_id, full_name, email, avatar_url')
    .in('user_id', (allMembers ?? []).map((m) => m.user_id).filter(Boolean));

  const profileByUserId = Object.fromEntries(
    (allProfiles ?? []).map((p) => [p.user_id, p]),
  );
  const members = (allMembers ?? []).map((m) => ({
    ...m,
    profiles: profileByUserId[m.user_id] ?? { full_name: 'Unknown', email: '', avatar_url: null },
  }));

  const [
    candidatesCountRes,
    allInterviewsRes,
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
      .select('id, interview_type, status, scheduled_at, meeting_link, meeting_provider, candidate:candidates!inner(full_name), position:positions!inner(title), interviewer:profiles!interviewer_id(full_name)')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20),
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
  const upcomingCount = upcomingCountRes.count ?? allInterviews.length;
  const totalInterviewCount = totalInterviewCountRes.count ?? 0;

  const profileList = (allProfiles ?? []) as Pick<DbProfile, 'id' | 'user_id' | 'full_name' | 'email' | 'avatar_url'>[];
  const profileById = Object.fromEntries(
    (allProfiles ?? []).map((p) => [p.id, p]),
  );

  const { data: allTokens } = await admin
    .from('google_calendar_tokens')
    .select('*')
    .in('profile_id', profileList.map((p) => p.id));

  const tokenByProfileId = Object.fromEntries(
    (allTokens ?? []).map((t) => [t.profile_id, t]),
  );

  const calendarConnections = (allMembers ?? [])
    .filter((m) => m.role === 'interviewer')
    .map((m) => {
      const profile = profileByUserId[m.user_id] as (typeof profileList)[number] | undefined;
      if (!profile) return null;

      const token = tokenByProfileId[profile.id] as DbGoogleCalendarToken | undefined;

      const now = Date.now();
      let connectionStatus: 'connected' | 'token_expired' | 'not_connected' | 'error';
      if (!token) {
        connectionStatus = 'not_connected';
      } else if (token.sync_status === 'error') {
        connectionStatus = 'error';
      } else if (token.token_expires_at && new Date(token.token_expires_at).getTime() <= now) {
        connectionStatus = 'token_expired';
      } else {
        connectionStatus = 'connected';
      }

      return {
        profileId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        googleEmail: token?.calendar_email || null,
        lastSyncAt: token?.last_sync_at ?? null,
        syncStatus: token?.sync_status ?? null,
        connectionStatus,
      };
    }).filter(Boolean) as Array<{
      profileId: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
      googleEmail: string | null;
      lastSyncAt: string | null;
      syncStatus: string | null;
      connectionStatus: 'connected' | 'token_expired' | 'not_connected' | 'error';
    }>;

  const interviewTypeLabels: Record<string, string> = {
    hr: 'HR Round', technical: 'Technical Round', managerial: 'Managerial Round', final: 'Final Round',
  };

  const providerLabels: Record<string, string> = {
    google_meet: 'Google Meet', zoom: 'Zoom', microsoft_teams: 'Teams', custom: 'Link',
  };

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
                      <TableHead>Interviewer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Meeting</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInterviews.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium text-foreground">{i.candidate?.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{i.interviewer?.full_name || 'Unknown'}</TableCell>
                        <TableCell className="text-muted-foreground">{interviewTypeLabels[i.interview_type] || i.interview_type}</TableCell>
                        <TableCell>
                          <Badge variant={i.status === 'confirmed' ? 'success' : 'warning'}>
                            {i.status === 'confirmed' ? 'Confirmed' : 'Scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString() : '-'}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CalendarConnections connections={calendarConnections} />
    </div>
  );
}

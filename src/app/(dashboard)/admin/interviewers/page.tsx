import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, Star, Calendar, Briefcase, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminInterviewersPage() {
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

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('user_id, created_at')
    .eq('organization_id', membership.organization_id)
    .eq('role', 'interviewer');

  const userIds = (interviewerMembers ?? []).map((m) => m.user_id).filter(Boolean);

  const { data: profiles } = userIds.length > 0
    ? await admin.from('profiles').select('*').in('user_id', userIds)
    : { data: [] };

  const profileIds = (profiles ?? []).map((p) => p.id);

  const [skillsRes, metricsRes, tokensRes] = await Promise.all([
    profileIds.length > 0
      ? admin.from('interviewer_skills').select('profile_id, skill_name, category').in('profile_id', profileIds)
      : { data: [] },
    profileIds.length > 0
      ? admin.from('interviewer_metrics').select('*').in('profile_id', profileIds)
      : { data: [] },
    profileIds.length > 0
      ? admin.from('google_calendar_tokens').select('profile_id, calendar_email').in('profile_id', profileIds)
      : { data: [] },
  ]);

  const skillsByProfile = new Map<string, typeof skillsRes.data>();
  for (const s of skillsRes.data ?? []) {
    const existing = skillsByProfile.get(s.profile_id) ?? [];
    existing.push(s);
    skillsByProfile.set(s.profile_id, existing);
  }

  const metricsByProfile = Object.fromEntries(
    (metricsRes.data ?? []).map((m) => [m.profile_id, m]),
  );

  const tokensByProfile = Object.fromEntries(
    (tokensRes.data ?? []).map((t) => [t.profile_id, t]),
  );

  const profileByUserId = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p]),
  );

  const interviewers = (interviewerMembers ?? []).map((m) => {
    const p = profileByUserId[m.user_id] as any;
    const pid = p?.id;
    const skills = skillsByProfile.get(pid) ?? [];
    const metrics = metricsByProfile[pid];
    const token = tokensByProfile[pid];

    return {
      id: pid,
      userId: m.user_id,
      fullName: p?.full_name ?? 'Unknown',
      email: p?.email ?? '',
      department: p?.department ?? null,
      roleTitle: p?.role_title ?? null,
      seniority: p?.seniority ?? null,
      primaryExpertise: p?.primary_expertise ?? null,
      timezone: p?.timezone ?? null,
      skillCount: skills.length,
      topSkills: skills.slice(0, 3).map((s: any) => s.skill_name),
      totalInterviews: metrics?.total_interviews ?? 0,
      completedInterviews: metrics?.completed_interviews ?? 0,
      upcomingInterviews: metrics?.upcoming_interviews ?? 0,
      isCalendarConnected: !!token,
      calendarEmail: token?.calendar_email ?? null,
      joinedAt: m.created_at,
    };
  });

  const connectedCalendars = interviewers.filter((i) => i.isCalendarConnected).length;
  const totalSkills = new Set(interviewers.flatMap((i) => i.topSkills)).size;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Interviewers</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage interviewer profiles, skills, and expertise</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">{interviewers.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Interviewers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Calendar className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">{connectedCalendars}</p>
            <p className="text-sm text-muted-foreground mt-1">Connected Calendars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">{totalSkills}</p>
            <p className="text-sm text-muted-foreground mt-1">Unique Skills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">
              {interviewers.reduce((sum, i) => sum + i.totalInterviews, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Interviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Interviewers ({interviewers.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {interviewers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No interviewers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Expertise</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Interviews</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviewers.map((i) => {
                    const initials = i.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{i.fullName}</p>
                              <p className="text-xs text-muted-foreground">{i.roleTitle || i.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{i.department || '-'}</div>
                          {i.seniority && <div className="text-xs text-muted-foreground capitalize">{i.seniority}</div>}
                        </TableCell>
                        <TableCell>
                          {i.primaryExpertise ? (
                            <Badge variant="default" className="text-xs">{i.primaryExpertise}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {i.topSkills.map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                            {i.skillCount > 3 && (
                              <Badge variant="outline" className="text-xs">+{i.skillCount - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-foreground">{i.completedInterviews}</span>
                            <span className="text-muted-foreground"> / {i.totalInterviews}</span>
                          </div>
                          {i.upcomingInterviews > 0 && (
                            <div className="text-xs text-amber-400">{i.upcomingInterviews} upcoming</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {i.isCalendarConnected ? (
                            <Badge variant="success" className="text-xs">Connected</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Not connected</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/interviewers/${i.id}`}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
                          >
                            View <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

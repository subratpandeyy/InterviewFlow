import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, Calendar, Clock } from 'lucide-react';
import type { InterviewerSkill } from '@/types';

export const dynamic = 'force-dynamic';

export default async function RecruiterInterviewersPage() {
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
    .select('user_id')
    .eq('organization_id', membership.organization_id)
    .eq('role', 'interviewer');

  const userIds = (interviewerMembers ?? []).map((m) => m.user_id).filter(Boolean);

  const { data: profiles } = userIds.length > 0
    ? await admin.from('profiles').select('*').in('user_id', userIds)
    : { data: [] };

  const profileIds = (profiles ?? []).map((p) => p.id);

  const [skillsRes, metricsRes, tokensRes, availabilityRes] = await Promise.all([
    profileIds.length > 0
      ? admin.from('interviewer_skills').select('*').in('profile_id', profileIds)
      : { data: [] },
    profileIds.length > 0
      ? admin.from('interviewer_metrics').select('*').in('profile_id', profileIds)
      : { data: [] },
    profileIds.length > 0
      ? admin.from('google_calendar_tokens').select('profile_id, calendar_email').in('profile_id', profileIds)
      : { data: [] },
    profileIds.length > 0
      ? admin.from('availability_slots').select('profile_id').in('profile_id', profileIds).eq('is_available', true)
      : { data: [] },
  ]);

  const skillsByProfile = new Map<string, InterviewerSkill[]>();
  for (const s of (skillsRes.data ?? []) as InterviewerSkill[]) {
    const existing = skillsByProfile.get(s.profile_id) ?? [];
    existing.push(s);
    skillsByProfile.set(s.profile_id, existing);
  }

  const metricsByProfile = Object.fromEntries(
    (metricsRes.data ?? []).map((m: any) => [m.profile_id, m]),
  );

  const tokensByProfile = Object.fromEntries(
    (tokensRes.data ?? []).map((t: any) => [t.profile_id, t]),
  );

  const profilesWithSlots = new Set((availabilityRes.data ?? []).map((s: any) => s.profile_id));

  const profileByUserId = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.user_id, p]),
  );

  interface Interviewer {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
    roleTitle: string | null;
    seniority: string | null;
    primaryExpertise: string | null;
    timezone: string | null;
    skills: InterviewerSkill[];
    totalInterviews: number;
    upcomingInterviews: number;
    isCalendarConnected: boolean;
    hasAvailability: boolean;
  }

  const interviewers: Interviewer[] = (interviewerMembers ?? []).map((m: any) => {
    const p = profileByUserId[m.user_id] ?? {};
    const pid = p.id;
    return {
      id: pid,
      fullName: p.full_name ?? 'Unknown',
      email: p.email ?? '',
      department: p.department ?? null,
      roleTitle: p.role_title ?? null,
      seniority: p.seniority ?? null,
      primaryExpertise: p.primary_expertise ?? null,
      timezone: p.timezone ?? null,
      skills: skillsByProfile.get(pid) ?? [],
      totalInterviews: metricsByProfile[pid]?.total_interviews ?? 0,
      upcomingInterviews: metricsByProfile[pid]?.upcoming_interviews ?? 0,
      isCalendarConnected: !!tokensByProfile[pid],
      hasAvailability: profilesWithSlots.has(pid),
    };
  }).filter((i: Interviewer) => i.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Interviewer Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Find the right interviewer for your interviews</p>
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
            <p className="mt-4 text-2xl font-semibold text-foreground">{interviewers.filter((i) => i.isCalendarConnected).length}</p>
            <p className="text-sm text-muted-foreground mt-1">Connected Calendars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">{interviewers.filter((i) => i.hasAvailability).length}</p>
            <p className="text-sm text-muted-foreground mt-1">Has Availability</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-foreground">
              {interviewers.filter((i) => i.upcomingInterviews < 3).length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Available Today</p>
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
                    <TableHead>Interviewer</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Expertise</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Timezone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviewers.map((i) => {
                    const initials = i.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    const primarySkills = i.skills.filter((s) => s.is_primary).slice(0, 3);
                    const otherSkills = i.skills.filter((s) => !s.is_primary).slice(0, 2);
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
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {primarySkills.map((s) => (
                              <Badge key={s.id} variant="default" className="text-xs">{s.skill_name}</Badge>
                            ))}
                            {otherSkills.map((s) => (
                              <Badge key={s.id} variant="secondary" className="text-xs">{s.skill_name}</Badge>
                            ))}
                            {i.skills.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{i.skills.length - 5}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-foreground">{i.totalInterviews}</span>
                              <span className="text-muted-foreground"> total</span>
                            </div>
                            {i.upcomingInterviews > 0 && (
                              <div className="text-xs text-amber-400">{i.upcomingInterviews} upcoming</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {i.isCalendarConnected ? (
                              <Badge variant="success" className="text-xs">Calendar</Badge>
                            ) : null}
                            {i.hasAvailability ? (
                              <Badge variant="default" className="text-xs">Available</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No slots</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.timezone || '-'}
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

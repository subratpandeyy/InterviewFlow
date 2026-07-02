import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Star, Users, Briefcase, CheckCircle2, XCircle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { adminUpdateInterviewerProfile } from '@/lib/actions/interviewer-profile';
import * as metricsService from '@/lib/services/interviewer-metrics.service';
import { SENIORITY_LEVELS, TIMEZONES, PROFICIENCY_SCALE } from '@/lib/constants';
import type { InterviewerSkill } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminInterviewerDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
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

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) return <div className="text-center py-12 text-muted-foreground">Interviewer not found</div>;

  const [skillsRes, metricsRes, tokenRes] = await Promise.all([
    admin.from('interviewer_skills').select('*').eq('profile_id', id).order('is_primary', { ascending: false }),
    admin.from('interviewer_metrics').select('*').eq('profile_id', id).maybeSingle(),
    admin.from('google_calendar_tokens').select('*').eq('profile_id', id).maybeSingle(),
  ]);

  const skills = (skillsRes.data ?? []) as InterviewerSkill[];
  let metrics = metricsRes.data as any;
  const token = tokenRes.data as any;

  if (!metrics || metrics.total_interviews === 0) {
    const recalc = await metricsService.recalculateMetrics(id, membership.organization_id);
    if (recalc.success) {
      metrics = recalc.data;
    }
  }

  const isCalendarConnected = !!token;
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/interviewers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Interviewer Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="text-lg bg-accent/10 text-accent">{initials}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {profile.role_title && (
                  <p className="text-sm mt-1">{profile.role_title}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {profile.seniority && (
                    <Badge variant="secondary" className="capitalize">{profile.seniority}</Badge>
                  )}
                  {profile.department && (
                    <Badge variant="outline">{profile.department}</Badge>
                  )}
                </div>
                {profile.timezone && (
                  <p className="text-xs text-muted-foreground mt-3">{profile.timezone}</p>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calendar</span>
                  <span className={isCalendarConnected ? 'text-emerald-400' : 'text-amber-400'}>
                    {isCalendarConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Years of Exp</span>
                  <span>{profile.years_of_experience ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Skills</span>
                  <span>{skills.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Interviews</span>
                  <span>{metrics?.total_interviews ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Rating</span>
                  <span>{metrics?.average_rating ? metrics.average_rating.toFixed(1) : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/interviewers/${id}/skills`}>
                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Manage Skills
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={adminUpdateInterviewerProfile} className="space-y-4">
                <input type="hidden" name="id" value={id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile.full_name ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_title">Job Title</Label>
                    <input
                      id="role_title"
                      name="role_title"
                      defaultValue={profile.role_title ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <input
                      id="department"
                      name="department"
                      defaultValue={profile.department ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seniority">Seniority</Label>
                    <select
                      id="seniority"
                      name="seniority"
                      defaultValue={profile.seniority ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      <option value="">Select...</option>
                      {SENIORITY_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      name="timezone"
                      defaultValue={profile.timezone ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      <option value="">Select...</option>
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_of_experience">Years of Experience</Label>
                    <input
                      id="years_of_experience"
                      name="years_of_experience"
                      type="number"
                      defaultValue={profile.years_of_experience ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_expertise">Primary Expertise</Label>
                    <input id="primary_expertise" name="primary_expertise" defaultValue={profile.primary_expertise ?? ''} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_expertise">Secondary Expertise</Label>
                    <input id="secondary_expertise" name="secondary_expertise" defaultValue={profile.secondary_expertise ?? ''} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_interviews_per_day">Max Interviews / Day</Label>
                    <input
                      id="max_interviews_per_day"
                      name="max_interviews_per_day"
                      type="number"
                      defaultValue={profile.max_interviews_per_day ?? 3}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_interviews_per_week">Max Interviews / Week</Label>
                    <input
                      id="max_interviews_per_week"
                      name="max_interviews_per_week"
                      type="number"
                      defaultValue={profile.max_interviews_per_week ?? 10}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly_interview_limit">Weekly Limit (legacy)</Label>
                    <input
                      id="weekly_interview_limit"
                      name="weekly_interview_limit"
                      type="number"
                      defaultValue={profile.weekly_interview_limit ?? ''}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} rows={3} />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills ({skills.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills added yet.</p>
                ) : (
                  skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2',
                        skill.is_primary ? 'border-accent/50 bg-accent/5' : 'border-border bg-card',
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {skill.skill_name}
                          {skill.is_primary && <span className="text-xs text-accent ml-1">★</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {skill.category}
                          {skill.proficiency_scale && ` · Lvl ${skill.proficiency_scale}/5`}
                          {skill.years_experience && ` · ${skill.years_experience}y`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4">
                <Link href={`/admin/interviewers/${id}/skills`}>
                  <Button variant="outline" size="sm">
                    <Star className="h-4 w-4 mr-2" />
                    Manage Skills
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload & Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Total Interviews</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.total_interviews ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.completed_interviews ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.average_rating ? metrics.average_rating.toFixed(1) : '-'}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.interviews_this_week ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.upcoming_interviews ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-semibold mt-1">{metrics?.total_cancelled_interviews ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

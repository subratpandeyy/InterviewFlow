import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { updateInterviewerProfile } from '@/lib/actions/interviewer-profile';
import { deleteSkill, markPrimarySkill } from '@/lib/actions/interviewer-skills';
import { SENIORITY_LEVELS, TIMEZONES } from '@/lib/constants';
import { InterviewerAddSkillDialog } from '@/components/interviewer/add-skill-dialog';
import type { InterviewerSkill, InterviewerMetric } from '@/types';

export const dynamic = 'force-dynamic';

export default async function InterviewerProfilePage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) return null;

  const admin = createAdmin();
  const [skillsRes, metricsRes, tokenRes] = await Promise.all([
    admin.from('interviewer_skills').select('*').eq('profile_id', profile.id).order('is_primary', { ascending: false }),
    admin.from('interviewer_metrics').select('*').eq('profile_id', profile.id).maybeSingle(),
    admin.from('google_calendar_tokens').select('*').eq('profile_id', profile.id).maybeSingle(),
  ]);

  const skills = (skillsRes.data ?? []) as InterviewerSkill[];
  const metrics = metricsRes.data as InterviewerMetric | null;
  const token = tokenRes.data as any;
  const isCalendarConnected = !!token;
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your professional profile, skills, and preferences</p>
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
                {profile.role_title && <p className="text-sm mt-1">{profile.role_title}</p>}
                {profile.department && <Badge variant="outline" className="mt-2">{profile.department}</Badge>}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calendar</span>
                  <span className={isCalendarConnected ? 'text-emerald-400' : 'text-amber-400'}>
                    {isCalendarConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Skills</span>
                  <span>{skills.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Interviews</span>
                  <span>{metrics?.total_interviews ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Rating</span>
                  <span>{metrics?.average_rating ? metrics.average_rating.toFixed(1) : '-'}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Profile Completion</p>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${[
                        profile.department,
                        profile.role_title,
                        profile.timezone,
                        profile.seniority,
                        profile.bio,
                        profile.primary_expertise,
                      ].filter(Boolean).length * 16}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {[profile.department, profile.role_title, profile.timezone, profile.seniority, profile.bio, profile.primary_expertise].filter(Boolean).length}/6 fields
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Today</span>
                <span className="font-medium">{metrics?.interviews_today ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">This Week</span>
                <span className="font-medium">{metrics?.interviews_this_week ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">This Month</span>
                <span className="font-medium">{metrics?.interviews_this_month ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Upcoming</span>
                <span className="font-medium">{metrics?.upcoming_interviews ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{metrics?.completed_interviews ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Duration</span>
                <span className="font-medium">{metrics?.average_duration_minutes ? `${Math.round(metrics.average_duration_minutes)}m` : '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {isCalendarConnected ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Connected</p>
                    <p className="text-xs text-muted-foreground">{token?.calendar_email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <XCircle className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Not Connected</p>
                    <p className="text-xs text-muted-foreground">Connect Google Calendar to manage availability</p>
                  </div>
                </div>
              )}
              <div className="mt-3">
                <a href="/interviewer/calendar" className="text-sm text-accent hover:underline">Manage Calendar →</a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateInterviewerProfile} className="space-y-4">
                <input type="hidden" name="id" value={profile.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_title">Job Title</Label>
                    <Input id="role_title" name="role_title" defaultValue={profile.role_title ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" name="department" defaultValue={profile.department ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seniority">Seniority Level</Label>
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
                    <Label htmlFor="timezone">Preferred Timezone</Label>
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
                    <Input id="years_of_experience" name="years_of_experience" type="number" defaultValue={profile.years_of_experience ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_expertise">Primary Expertise</Label>
                    <Input id="primary_expertise" name="primary_expertise" defaultValue={profile.primary_expertise ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_expertise">Secondary Expertise</Label>
                    <Input id="secondary_expertise" name="secondary_expertise" defaultValue={profile.secondary_expertise ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_interviews_per_day">Max Interviews / Day</Label>
                    <Input id="max_interviews_per_day" name="max_interviews_per_day" type="number" defaultValue={profile.max_interviews_per_day ?? 3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_interviews_per_week">Max Interviews / Week</Label>
                    <Input id="max_interviews_per_week" name="max_interviews_per_week" type="number" defaultValue={profile.max_interviews_per_week ?? 10} />
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>My Skills ({skills.length})</CardTitle>
              <InterviewerAddSkillDialog profileId={profile.id} />
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No skills added yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {skill.skill_name}
                            {skill.is_primary && <Badge variant="default" className="ml-2 text-xs">Primary</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {skill.category}
                            {skill.proficiency_scale && ` · Lvl ${skill.proficiency_scale}/5`}
                            {skill.years_experience && ` · ${skill.years_experience} yrs`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!skill.is_primary && (
                          <form action={markPrimarySkill}>
                            <input type="hidden" name="profile_id" value={profile.id} />
                            <input type="hidden" name="skill_id" value={skill.id} />
                            <Button type="submit" variant="ghost" size="sm" title="Mark as primary">
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </form>
                        )}
                        <form action={deleteSkill}>
                          <input type="hidden" name="id" value={skill.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

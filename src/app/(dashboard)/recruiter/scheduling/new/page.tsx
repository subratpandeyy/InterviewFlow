import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InterviewerSelector } from '@/components/recruiter/interviewer-selector';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { InterviewerSkill } from '@/types';

export const dynamic = 'force-dynamic';

export default async function NewSchedulingPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id)
    .single();

  if (!membership) return null;

  const admin = createAdmin();

  const [candidatesRes, interviewerMembersRes, positionsRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', membership.organization_id)
      .eq('role', 'interviewer'),
    supabase
      .from('positions')
      .select('id, title, department')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null),
  ]);

  const interviewerIds = (interviewerMembersRes.data ?? []).map((m: any) => m.user_id).filter(Boolean);

  const [profilesRes, skillsRes, metricsRes, tokensRes] = interviewerIds.length > 0 ? await Promise.all([
    admin.from('profiles').select('*').in('user_id', interviewerIds),
    admin.from('interviewer_skills').select('*').in('profile_id',
      (await admin.from('profiles').select('id').in('user_id', interviewerIds)).data?.map((p: any) => p.id) ?? []
    ),
    admin.from('interviewer_metrics').select('*').in('profile_id',
      (await admin.from('profiles').select('id').in('user_id', interviewerIds)).data?.map((p: any) => p.id) ?? []
    ),
    admin.from('google_calendar_tokens').select('profile_id').in('profile_id',
      (await admin.from('profiles').select('id').in('user_id', interviewerIds)).data?.map((p: any) => p.id) ?? []
    ),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const profiles = profilesRes.data ?? [];
  const skills = skillsRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const tokens = tokensRes.data ?? [];

  const profileIds = profiles.map((p: any) => p.id);
  const metricsByProfile = Object.fromEntries(metrics.map((m: any) => [m.profile_id, m]));
  const skillsByProfile = new Map<string, InterviewerSkill[]>();
  for (const s of skills as InterviewerSkill[]) {
    const existing = skillsByProfile.get(s.profile_id) ?? [];
    existing.push(s);
    skillsByProfile.set(s.profile_id, existing);
  }
  const tokenProfileIds = new Set(tokens.map((t: any) => t.profile_id));

  const interviewers = profiles.map((p: any) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    department: p.department ?? null,
    roleTitle: p.role_title ?? null,
    seniority: p.seniority ?? null,
    timezone: p.timezone ?? null,
    primaryExpertise: p.primary_expertise ?? null,
    skills: (skillsByProfile.get(p.id) ?? []).map((s) => ({
      id: s.id,
      skillName: s.skill_name,
      category: s.category,
      proficiencyScale: s.proficiency_scale,
      isPrimary: s.is_primary,
    })),
    metrics: metricsByProfile[p.id] ? {
      totalInterviews: metricsByProfile[p.id].total_interviews,
      upcomingInterviews: metricsByProfile[p.id].upcoming_interviews,
      interviewsToday: metricsByProfile[p.id].interviews_today,
      interviewsThisWeek: metricsByProfile[p.id].interviews_this_week,
      averageRating: metricsByProfile[p.id].average_rating,
    } : null,
    isCalendarConnected: tokenProfileIds.has(p.id),
    maxPerDay: p.max_interviews_per_day ?? 3,
    maxPerWeek: p.max_interviews_per_week ?? 10,
  }));

  const candidates = (candidatesRes.data ?? []).map((c: any) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
  }));

  const positions = (positionsRes.data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    department: p.department,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/recruiter/scheduling" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Schedule Interview</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Details</CardTitle>
          <CardDescription>
            Select the candidate, interviewer, and configure the interview.
            Enhanced with skills, workload, and compatibility information.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <InterviewerSelector
            interviewers={interviewers}
            positions={positions}
            candidates={candidates}
          />
        </CardContent>
      </Card>
    </div>
  );
}

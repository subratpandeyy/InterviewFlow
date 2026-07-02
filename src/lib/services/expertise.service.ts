import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { Profile, InterviewerSkill, InterviewerDepartment } from '@/types';

export interface ExpertiseSummary {
  profileId: string;
  fullName: string;
  primaryExpertise: string | null;
  secondaryExpertise: string | null;
  departments: string[];
  topSkills: string[];
  yearsOfExperience: number | null;
  seniority: string | null;
  skillCount: number;
}

export async function getExpertiseSummary(profileId: string): Promise<ActionResult<ExpertiseSummary>> {
  const admin = createAdmin();

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (!profile) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } };
  }

  const { data: skills } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('profile_id', profileId)
    .order('proficiency_scale', { ascending: false });

  const { data: departments } = await admin
    .from('interviewer_departments')
    .select('*')
    .eq('profile_id', profileId);

  const prof = profile as Profile;
  const intSkills = (skills ?? []) as InterviewerSkill[];
  const depts = (departments ?? []) as InterviewerDepartment[];

  return success({
    profileId,
    fullName: prof.full_name,
    primaryExpertise: prof.primary_expertise,
    secondaryExpertise: prof.secondary_expertise,
    departments: depts.map((d) => d.department),
    topSkills: intSkills.slice(0, 5).map((s) => s.skill_name),
    yearsOfExperience: prof.years_of_experience,
    seniority: prof.seniority,
    skillCount: intSkills.length,
  });
}

export async function getTopSkillsAcrossOrg(organizationId: string): Promise<ActionResult<{ skill: string; count: number }[]>> {
  const admin = createAdmin();

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'interviewer');

  if (!interviewerMembers || interviewerMembers.length === 0) return success([]);

  const userIds = interviewerMembers.map((m) => m.user_id).filter(Boolean);

  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .in('user_id', userIds);

  const profileIds = (profiles ?? []).map((p) => p.id);

  if (profileIds.length === 0) return success([]);

  const { data: skills } = await admin
    .from('interviewer_skills')
    .select('skill_name')
    .in('profile_id', profileIds);

  const skillCounts = new Map<string, number>();
  for (const s of skills ?? []) {
    const name = s.skill_name.toLowerCase().trim();
    skillCounts.set(name, (skillCounts.get(name) || 0) + 1);
  }

  const sorted = Array.from(skillCounts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return success(sorted);
}

export async function setPrimaryExpertise(profileId: string, expertise: string): Promise<ActionResult<Profile>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('profiles')
    .update({ primary_expertise: expertise })
    .eq('id', profileId)
    .select()
    .single();
  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Profile);
}

export async function setSecondaryExpertise(profileId: string, expertise: string): Promise<ActionResult<Profile>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('profiles')
    .update({ secondary_expertise: expertise })
    .eq('id', profileId)
    .select()
    .single();
  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Profile);
}

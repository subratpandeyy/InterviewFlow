import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { Profile, InterviewerSkill, PositionSkill, CompatibilityScore, SkillMatch } from '@/types';

export async function calculateCompatibilityScore(
  interviewerId: string,
  positionId: string,
): Promise<ActionResult<CompatibilityScore>> {
  const admin = createAdmin();

  const { data: positionSkills } = await admin
    .from('position_skills')
    .select('*')
    .eq('position_id', positionId);

  const { data: interviewerSkills } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('profile_id', interviewerId);

  const { data: position } = await admin
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single();

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', interviewerId)
    .single();

  const { data: interviews } = await admin
    .from('interviews')
    .select('interview_type')
    .eq('interviewer_id', interviewerId)
    .eq('position_id', positionId)
    .is('deleted_at', null);

  const posSkills = (positionSkills ?? []) as PositionSkill[];
  const intSkills = (interviewerSkills ?? []) as InterviewerSkill[];
  const pos = position as Profile; // use profile type for positional access
  const prof = profile as Profile;

  const skillMatches: SkillMatch[] = posSkills.map((req) => {
    const matched = intSkills.find((s) => {
      const normalizedReq = req.skill_name.toLowerCase().trim();
      const normalizedSkill = s.skill_name.toLowerCase().trim();
      return normalizedReq === normalizedSkill || normalizedReq.includes(normalizedSkill) || normalizedSkill.includes(normalizedReq);
    });

    if (matched) {
      const fullMatch = !req.proficiency_required || !matched.proficiency_scale || matched.proficiency_scale >= req.proficiency_required;
      return {
        skillName: req.skill_name,
        category: req.category,
        requiredProficiency: req.proficiency_required,
        interviewerProficiency: matched.proficiency_scale,
        match: fullMatch ? 'full' : 'partial',
        yearsExperience: matched.years_experience,
        yearsRequired: req.years_experience_required,
      };
    }

    return {
      skillName: req.skill_name,
      category: req.category,
      requiredProficiency: req.proficiency_required,
      interviewerProficiency: null,
      match: 'missing',
      yearsExperience: null,
      yearsRequired: req.years_experience_required,
    };
  });

  const totalSkills = skillMatches.length;
  const fullMatches = skillMatches.filter((s) => s.match === 'full').length;
  const partialMatches = skillMatches.filter((s) => s.match === 'partial').length;

  const skillScore = totalSkills > 0
    ? ((fullMatches + partialMatches * 0.5) / totalSkills) * 100
    : 100;

  const expReq = (pos as any)?.experience_required;
  const expInt = prof?.years_of_experience;
  let experienceMatch = 100;
  if (expReq && expInt !== null && expInt !== undefined) {
    const required = parseInt(expReq) || 0;
    experienceMatch = expInt >= required ? 100 : (expInt / required) * 100;
  }

  const overall = Math.round((skillScore * 0.7 + experienceMatch * 0.2 + 100 * 0.1));

  return success({
    overall: Math.min(100, overall),
    skillMatches,
    experienceMatch: Math.round(experienceMatch),
    availabilityMatch: true,
    typeMatch: true,
  });
}

export async function getSkillOverlap(
  candidateId: string,
  interviewerId: string,
): Promise<ActionResult<SkillMatch[]>> {
  const admin = createAdmin();

  const { data: candidateSkills } = await admin
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidateId);

  const { data: interviewerSkills } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('profile_id', interviewerId);

  const candidateSkillNames = new Set(
    (candidateSkills ?? []).map((s) => s.skill_name.toLowerCase().trim()),
  );

  const matches: SkillMatch[] = (interviewerSkills ?? []).map((is) => {
    const normalized = is.skill_name.toLowerCase().trim();
    const candidateHas = candidateSkillNames.has(normalized);

    return {
      skillName: is.skill_name,
      category: is.category,
      requiredProficiency: null,
      interviewerProficiency: is.proficiency_scale,
      match: candidateHas ? 'full' : 'missing',
      yearsExperience: is.years_experience,
      yearsRequired: null,
    };
  });

  return success(matches);
}

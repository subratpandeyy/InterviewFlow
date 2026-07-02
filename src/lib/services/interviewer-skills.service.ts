import { createAdmin } from '@/lib/supabase/admin';
import { success, failure, type ActionResult } from './response';
import type { InterviewerSkill, SkillCategory } from '@/types';

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface CreateSkillParams {
  profileId: string;
  organizationId: string;
  skillName: string;
  category?: string;
  proficiency?: string;
  proficiencyScale?: number;
  yearsExperience?: number;
  lastUsed?: string;
  isPrimary?: boolean;
}

interface UpdateSkillParams {
  skillName?: string;
  category?: string;
  proficiency?: string;
  proficiencyScale?: number;
  yearsExperience?: number;
  lastUsed?: string;
  isPrimary?: boolean;
}

export async function getSkills(profileId: string): Promise<ActionResult<InterviewerSkill[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_primary', { ascending: false })
    .order('category', { ascending: true });

  if (error) return failure('FETCH_FAILED', error.message);
  return success(data as InterviewerSkill[]);
}

export async function getSkill(id: string): Promise<ActionResult<InterviewerSkill>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('interviewer_skills')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return failure('NOT_FOUND', 'Skill not found');
  return success(data as InterviewerSkill);
}

export async function createSkill(params: CreateSkillParams): Promise<ActionResult<InterviewerSkill>> {
  const admin = createAdmin();
  const normalized = normalizeSkillName(params.skillName);

  const { data: existing } = await admin
    .from('interviewer_skills')
    .select('id')
    .eq('profile_id', params.profileId)
    .eq('skill_name_normalized', normalized)
    .maybeSingle();

  if (existing) {
    return failure('DUPLICATE', 'This skill already exists for this interviewer');
  }

  const { data, error } = await admin
    .from('interviewer_skills')
    .insert({
      profile_id: params.profileId,
      organization_id: params.organizationId,
      skill_name: params.skillName,
      skill_name_normalized: normalized,
      category: params.category || null,
      proficiency: params.proficiency || null,
      proficiency_scale: params.proficiencyScale || null,
      years_experience: params.yearsExperience || null,
      last_used: params.lastUsed || null,
      is_core: params.isPrimary || false,
      is_primary: params.isPrimary || false,
    })
    .select()
    .single();

  if (error) return failure('CREATE_FAILED', error.message);
  return success(data as InterviewerSkill);
}

export async function updateSkill(id: string, params: UpdateSkillParams): Promise<ActionResult<InterviewerSkill>> {
  const admin = createAdmin();
  const updateData: Record<string, unknown> = {};
  if (params.skillName !== undefined) {
    updateData.skill_name = params.skillName;
    updateData.skill_name_normalized = normalizeSkillName(params.skillName);
  }
  if (params.category !== undefined) updateData.category = params.category;
  if (params.proficiency !== undefined) updateData.proficiency = params.proficiency;
  if (params.proficiencyScale !== undefined) updateData.proficiency_scale = params.proficiencyScale;
  if (params.yearsExperience !== undefined) updateData.years_experience = params.yearsExperience;
  if (params.lastUsed !== undefined) updateData.last_used = params.lastUsed;
  if (params.isPrimary !== undefined) updateData.is_primary = params.isPrimary;

  const { data, error } = await admin
    .from('interviewer_skills')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return failure('UPDATE_FAILED', error.message);
  return success(data as InterviewerSkill);
}

export async function deleteSkill(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('interviewer_skills')
    .delete()
    .eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function bulkImportSkills(
  skills: CreateSkillParams[],
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  let imported = 0;
  let skipped = 0;

  for (const skill of skills) {
    const result = await createSkill(skill);
    if (result.success) {
      imported++;
    } else {
      skipped++;
    }
  }

  return success({ imported, skipped });
}

export async function searchSkills(
  organizationId: string,
  query: string,
): Promise<ActionResult<InterviewerSkill[]>> {
  const admin = createAdmin();
  const normalized = normalizeSkillName(query);

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

  const { data, error } = await admin
    .from('interviewer_skills')
    .select('*, profile:profiles(full_name, email)')
    .in('profile_id', profileIds)
    .or(`skill_name_normalized.ilike.%${normalized}%,skill_name.ilike.%${query}%`)
    .order('skill_name');

  if (error) return failure('SEARCH_FAILED', error.message);
  return success(data as InterviewerSkill[]);
}

export async function getSkillCategories(organizationId: string): Promise<ActionResult<SkillCategory[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('skill_categories')
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order('name');

  if (error) return failure('FETCH_FAILED', error.message);
  return success(data as SkillCategory[]);
}

export async function createSkillCategory(params: {
  organizationId: string;
  name: string;
  description?: string;
}): Promise<ActionResult<SkillCategory>> {
  const admin = createAdmin();

  const { data: existing } = await admin
    .from('skill_categories')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('name', params.name)
    .maybeSingle();

  if (existing) return failure('DUPLICATE', 'Category already exists');

  const { data, error } = await admin
    .from('skill_categories')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      description: params.description || null,
    })
    .select()
    .single();

  if (error) return failure('CREATE_FAILED', error.message);
  return success(data as SkillCategory);
}

export async function deleteSkillCategory(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('skill_categories')
    .delete()
    .eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function markPrimarySkill(profileId: string, skillId: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  await admin
    .from('interviewer_skills')
    .update({ is_primary: false })
    .eq('profile_id', profileId);

  const { error } = await admin
    .from('interviewer_skills')
    .update({ is_primary: true })
    .eq('id', skillId);

  if (error) return failure('UPDATE_FAILED', error.message);
  return success(undefined);
}

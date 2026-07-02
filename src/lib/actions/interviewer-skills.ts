'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireRoleOrHigher } from '@/lib/services/auth.service';
import * as skillsService from '@/lib/services/interviewer-skills.service';
import * as activityService from '@/lib/services/activity.service';

export async function addSkill(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const profileId = formData.get('profile_id') as string;
  if (!profileId) throw new Error('Profile ID is required');

  const result = await skillsService.createSkill({
    profileId,
    organizationId: ctx.user.organizationId,
    skillName: formData.get('skill_name') as string,
    category: formData.get('category') as string || undefined,
    proficiency: formData.get('proficiency') as string || undefined,
    proficiencyScale: formData.get('proficiency_scale') ? parseInt(formData.get('proficiency_scale') as string) : undefined,
    yearsExperience: formData.get('years_experience') ? parseFloat(formData.get('years_experience') as string) : undefined,
    lastUsed: formData.get('last_used') as string || undefined,
    isPrimary: formData.get('is_primary') === 'true',
  });

  if (!result.success) throw new Error(result.error.message);

  await activityService.logActivity({
    organizationId: ctx.user.organizationId,
    profileId: ctx.user.profileId,
    activityType: 'skill_added',
    description: `Added skill: ${formData.get('skill_name')}`,
    entityType: 'interviewer_skills',
    entityId: result.data.id,
  });

  revalidatePath('/interviewer/profile');
  revalidatePath(`/admin/interviewers/${profileId}/skills`);
}

export async function updateSkill(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Skill ID is required');

  const result = await skillsService.updateSkill(id, {
    skillName: formData.get('skill_name') as string || undefined,
    category: formData.get('category') as string || undefined,
    proficiency: formData.get('proficiency') as string || undefined,
    proficiencyScale: formData.get('proficiency_scale') ? parseInt(formData.get('proficiency_scale') as string) : undefined,
    yearsExperience: formData.get('years_experience') ? parseFloat(formData.get('years_experience') as string) : undefined,
    lastUsed: formData.get('last_used') as string || undefined,
    isPrimary: formData.get('is_primary') === 'true',
  });

  if (!result.success) throw new Error(result.error.message);

  await activityService.logActivity({
    organizationId: ctx.user.organizationId,
    profileId: ctx.user.profileId,
    activityType: 'skill_updated',
    description: `Updated skill: ${result.data.skill_name}`,
    entityType: 'interviewer_skills',
    entityId: id,
  });

  revalidatePath('/interviewer/profile');
  revalidatePath(`/admin/interviewers/${result.data.profile_id}/skills`);
}

export async function deleteSkill(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Skill ID is required');

  const current = await skillsService.getSkill(id);
  if (!current.success) throw new Error('Skill not found');

  const result = await skillsService.deleteSkill(id);
  if (!result.success) throw new Error(result.error.message);

  await activityService.logActivity({
    organizationId: ctx.user.organizationId,
    profileId: ctx.user.profileId,
    activityType: 'skill_removed',
    description: `Removed skill: ${current.data.skill_name}`,
    entityType: 'interviewer_skills',
    entityId: id,
  });

  revalidatePath('/interviewer/profile');
  revalidatePath(`/admin/interviewers/${current.data.profile_id}/skills`);
}

export async function bulkImportSkills(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const profileId = formData.get('profile_id') as string;
  const skillsJson = formData.get('skills') as string;

  if (!profileId || !skillsJson) throw new Error('Profile ID and skills JSON are required');

  const skills = JSON.parse(skillsJson) as Array<{
    skillName: string;
    category?: string;
    proficiency?: string;
    proficiencyScale?: number;
    yearsExperience?: number;
  }>;

  const result = await skillsService.bulkImportSkills(
    skills.map((s) => ({
      profileId,
      organizationId: ctx.user.organizationId,
      skillName: s.skillName,
      category: s.category,
      proficiency: s.proficiency,
      proficiencyScale: s.proficiencyScale,
      yearsExperience: s.yearsExperience,
    })),
  );

  if (!result.success) throw new Error(result.error.message);

  revalidatePath(`/admin/interviewers/${profileId}/skills`);
}

export async function createSkillCategory(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const result = await skillsService.createSkillCategory({
    organizationId: ctx.user.organizationId,
    name: formData.get('name') as string,
    description: formData.get('description') as string || undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/admin/interviewers');
}

export async function deleteSkillCategory(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Category ID is required');

  const result = await skillsService.deleteSkillCategory(id);
  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/admin/interviewers');
}

export async function markPrimarySkill(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const profileId = formData.get('profile_id') as string;
  const skillId = formData.get('skill_id') as string;
  if (!profileId || !skillId) throw new Error('Profile ID and Skill ID are required');

  const result = await skillsService.markPrimarySkill(profileId, skillId);
  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/interviewer/profile');
  revalidatePath(`/admin/interviewers/${profileId}/skills`);
}

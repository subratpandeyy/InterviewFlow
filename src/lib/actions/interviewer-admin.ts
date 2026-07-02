'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/services/auth.service';
import * as positionService from '@/lib/services/position.service';
import * as activityService from '@/lib/services/activity.service';
import { failure, success } from '@/lib/services/response';

export async function addPositionSkill(formData: FormData) {
  const ctx = await requireRole('organization_admin');
  const admin = (await import('@/lib/supabase/admin')).createAdmin();

  const positionId = formData.get('position_id') as string;
  const skillName = formData.get('skill_name') as string;
  const importance = formData.get('importance') as string || 'required';
  const proficiencyRequired = formData.get('proficiency_required') ? parseInt(formData.get('proficiency_required') as string) : null;
  const yearsExperience = formData.get('years_experience') ? parseFloat(formData.get('years_experience') as string) : null;
  const category = formData.get('category') as string || null;

  if (!positionId || !skillName) return failure('VALIDATION_ERROR', 'Position ID and skill name are required');

  const normalized = skillName.trim().toLowerCase().replace(/\s+/g, ' ');

  const { error } = await admin
    .from('position_skills')
    .insert({
      position_id: positionId,
      organization_id: ctx.user.organizationId,
      skill_name: skillName,
      skill_name_normalized: normalized,
      importance,
      proficiency_required: proficiencyRequired,
      years_experience_required: yearsExperience,
      category,
    });

  if (error) return failure('CREATE_FAILED', error.message);

  revalidatePath(`/admin/positions/${positionId}`);
  revalidatePath(`/recruiter/positions/${positionId}`);
  return success(undefined);
}

export async function removePositionSkill(formData: FormData) {
  const ctx = await requireRole('organization_admin');
  const admin = (await import('@/lib/supabase/admin')).createAdmin();

  const id = formData.get('id') as string;
  if (!id) return failure('VALIDATION_ERROR', 'Skill ID is required');

  const { error } = await admin
    .from('position_skills')
    .delete()
    .eq('id', id);

  if (error) return failure('DELETE_FAILED', error.message);

  revalidatePath('/admin/positions');
  revalidatePath('/recruiter/positions');
  return success(undefined);
}

export async function updatePositionSkillImportance(formData: FormData) {
  const ctx = await requireRole('organization_admin');
  const admin = (await import('@/lib/supabase/admin')).createAdmin();

  const id = formData.get('id') as string;
  const importance = formData.get('importance') as string;

  if (!id || !importance) return failure('VALIDATION_ERROR', 'ID and importance are required');

  const { error } = await admin
    .from('position_skills')
    .update({ importance })
    .eq('id', id);

  if (error) return failure('UPDATE_FAILED', error.message);

  revalidatePath('/admin/positions');
  return success(undefined);
}

export async function recalculateInterviewerMetrics(formData: FormData) {
  const ctx = await requireRole('organization_admin');
  const metricsService = await import('@/lib/services/interviewer-metrics.service');

  const profileId = formData.get('profile_id') as string;
  if (!profileId) return failure('VALIDATION_ERROR', 'Profile ID is required');

  const result = await metricsService.recalculateMetrics(profileId, ctx.user.organizationId);
  if (!result.success) return result;

  revalidatePath('/admin/interviewers');
  return success(undefined);
}

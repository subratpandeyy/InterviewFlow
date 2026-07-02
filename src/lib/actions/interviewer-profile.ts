'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireRoleOrHigher } from '@/lib/services/auth.service';
import * as profileService from '@/lib/services/interviewer-profile.service';
import * as activityService from '@/lib/services/activity.service';

export async function updateInterviewerProfile(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Profile ID is required');

  const result = await profileService.updateProfile(id, {
    fullName: formData.get('full_name') as string || undefined,
    department: formData.get('department') as string || undefined,
    roleTitle: formData.get('role_title') as string || undefined,
    timezone: formData.get('timezone') as string || undefined,
    seniority: formData.get('seniority') as string || undefined,
    bio: formData.get('bio') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    yearsOfExperience: formData.get('years_of_experience') ? parseInt(formData.get('years_of_experience') as string) : undefined,
    primaryExpertise: formData.get('primary_expertise') as string || undefined,
    secondaryExpertise: formData.get('secondary_expertise') as string || undefined,
    maxInterviewsPerDay: formData.get('max_interviews_per_day') ? parseInt(formData.get('max_interviews_per_day') as string) : undefined,
    maxInterviewsPerWeek: formData.get('max_interviews_per_week') ? parseInt(formData.get('max_interviews_per_week') as string) : undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  await activityService.logActivity({
    organizationId: ctx.user.organizationId,
    profileId: ctx.user.profileId,
    activityType: 'profile_updated',
    description: 'Updated interviewer profile',
    entityType: 'profile',
    entityId: id,
  });

  revalidatePath('/interviewer/profile');
  revalidatePath('/admin/interviewers');
  revalidatePath('/recruiter/interviewers');
}

export async function updateInterviewerProfileJson(formData: FormData) {
  const ctx = await requireRoleOrHigher('interviewer');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Profile ID is required');

  const preferredTypes = formData.get('preferred_interview_types');
  const languages = formData.get('languages_spoken');
  const workingHours = formData.get('working_hours');

  const result = await profileService.updateProfile(id, {
    preferredInterviewTypes: preferredTypes ? JSON.parse(preferredTypes as string) : undefined,
    languagesSpoken: languages ? JSON.parse(languages as string) : undefined,
    workingHours: workingHours ? JSON.parse(workingHours as string) : undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/interviewer/profile');
}

export async function adminUpdateInterviewerProfile(formData: FormData) {
  const ctx = await requireRole('organization_admin');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Profile ID is required');

  const result = await profileService.updateProfile(id, {
    fullName: formData.get('full_name') as string || undefined,
    department: formData.get('department') as string || undefined,
    roleTitle: formData.get('role_title') as string || undefined,
    timezone: formData.get('timezone') as string || undefined,
    seniority: formData.get('seniority') as string || undefined,
    bio: formData.get('bio') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    yearsOfExperience: formData.get('years_of_experience') ? parseInt(formData.get('years_of_experience') as string) : undefined,
    primaryExpertise: formData.get('primary_expertise') as string || undefined,
    secondaryExpertise: formData.get('secondary_expertise') as string || undefined,
    maxInterviewsPerDay: formData.get('max_interviews_per_day') ? parseInt(formData.get('max_interviews_per_day') as string) : undefined,
    maxInterviewsPerWeek: formData.get('max_interviews_per_week') ? parseInt(formData.get('max_interviews_per_week') as string) : undefined,
    weeklyInterviewLimit: formData.get('weekly_interview_limit') ? parseInt(formData.get('weekly_interview_limit') as string) : undefined,
  });

  if (!result.success) throw new Error(result.error.message);

  revalidatePath('/admin/interviewers');
  revalidatePath(`/admin/interviewers/${id}`);
}

import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { Profile } from '@/types';

interface UpdateProfileParams {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  department?: string;
  roleTitle?: string;
  timezone?: string;
  seniority?: string;
  bio?: string;
  phone?: string;
  weeklyInterviewLimit?: number;
  yearsOfExperience?: number;
  primaryExpertise?: string;
  secondaryExpertise?: string;
  preferredInterviewTypes?: string[];
  languagesSpoken?: string[];
  maxInterviewsPerDay?: number;
  maxInterviewsPerWeek?: number;
  workingHours?: Record<string, unknown>;
}

export async function getProfile(id: string): Promise<ActionResult<Profile>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } };
  }
  return success(data as Profile);
}

export async function updateProfile(id: string, params: UpdateProfileParams): Promise<ActionResult<Profile>> {
  const admin = createAdmin();
  const updateData: Record<string, unknown> = {};
  if (params.fullName !== undefined) updateData.full_name = params.fullName;
  if (params.email !== undefined) updateData.email = params.email;
  if (params.avatarUrl !== undefined) updateData.avatar_url = params.avatarUrl;
  if (params.department !== undefined) updateData.department = params.department;
  if (params.roleTitle !== undefined) updateData.role_title = params.roleTitle;
  if (params.timezone !== undefined) updateData.timezone = params.timezone;
  if (params.seniority !== undefined) updateData.seniority = params.seniority;
  if (params.bio !== undefined) updateData.bio = params.bio;
  if (params.phone !== undefined) updateData.phone = params.phone;
  if (params.weeklyInterviewLimit !== undefined) updateData.weekly_interview_limit = params.weeklyInterviewLimit;
  if (params.yearsOfExperience !== undefined) updateData.years_of_experience = params.yearsOfExperience;
  if (params.primaryExpertise !== undefined) updateData.primary_expertise = params.primaryExpertise;
  if (params.secondaryExpertise !== undefined) updateData.secondary_expertise = params.secondaryExpertise;
  if (params.preferredInterviewTypes !== undefined) updateData.preferred_interview_types = params.preferredInterviewTypes;
  if (params.languagesSpoken !== undefined) updateData.languages_spoken = params.languagesSpoken;
  if (params.maxInterviewsPerDay !== undefined) updateData.max_interviews_per_day = params.maxInterviewsPerDay;
  if (params.maxInterviewsPerWeek !== undefined) updateData.max_interviews_per_week = params.maxInterviewsPerWeek;
  if (params.workingHours !== undefined) updateData.working_hours = params.workingHours;

  const { data, error } = await admin
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Profile);
}

export async function listInterviewerProfiles(organizationId: string): Promise<ActionResult<Profile[]>> {
  const admin = createAdmin();

  const { data: interviewerMembers } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'interviewer');

  if (!interviewerMembers || interviewerMembers.length === 0) return success([]);

  const userIds = interviewerMembers.map((m) => m.user_id).filter(Boolean);
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .in('user_id', userIds);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as Profile[]);
}

export async function listAllProfilesInOrg(organizationId: string): Promise<ActionResult<Profile[]>> {
  const admin = createAdmin();

  const { data: members } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId);

  if (!members || members.length === 0) return success([]);

  const userIds = members.map((m) => m.user_id).filter(Boolean);
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .in('user_id', userIds);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as Profile[]);
}

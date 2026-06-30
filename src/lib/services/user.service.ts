import { createAdmin } from '@/lib/supabase/admin';
import { success, paginated, type ActionResult, type PaginatedData } from './response';
import type { Profile, OrganizationMember } from '@/types';

export async function removeMember(memberId: string, organizationId: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: targetMember } = await admin
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember) return { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } };
  if (targetMember.organization_id !== organizationId) return { success: false, error: { code: 'NOT_FOUND', message: 'Member not found in your organization' } };

  const { error } = await admin.from('organization_members').delete().eq('id', memberId);
  if (error) return { success: false, error: { code: 'DELETE_FAILED', message: error.message } };
  return success(undefined);
}

export async function updateMemberRole(
  memberId: string,
  role: string,
  organizationId: string,
): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: targetMember } = await admin
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember) return { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } };
  if (targetMember.organization_id !== organizationId) return { success: false, error: { code: 'NOT_FOUND', message: 'Member not found in your organization' } };

  const { error } = await admin.from('organization_members').update({ role }).eq('id', memberId);
  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(undefined);
}

export async function listProfilesByUserIds(userIds: string[]): Promise<ActionResult<Profile[]>> {
  if (userIds.length === 0) return success([]);
  const admin = createAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .in('user_id', userIds);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as Profile[]);
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const admin = createAdmin();
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data as Profile | null;
}

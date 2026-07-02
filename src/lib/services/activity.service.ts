import { createAdmin } from '@/lib/supabase/admin';
import { success, type ActionResult } from './response';
import type { ActivityLog, ActivityType } from '@/types';

export async function logActivity(params: {
  organizationId: string;
  profileId: string;
  activityType: ActivityType;
  description?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<ActivityLog>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('activity_log')
    .insert({
      organization_id: params.organizationId,
      profile_id: params.profileId,
      activity_type: params.activityType,
      description: params.description || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  return success(data as ActivityLog);
}

export async function getActivityLog(profileId: string, limit = 20): Promise<ActionResult<ActivityLog[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('activity_log')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as ActivityLog[]);
}

export async function getOrganizationActivity(organizationId: string, limit = 50): Promise<ActionResult<ActivityLog[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('activity_log')
    .select('*, profile:profiles(full_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(data as ActivityLog[]);
}

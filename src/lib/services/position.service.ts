import { createAdmin } from '@/lib/supabase/admin';
import { success, paginated, type ActionResult, type PaginatedData } from './response';
import type { Position } from '@/types';

interface CreatePositionParams {
  organizationId: string;
  title: string;
  department: string;
  experienceRequired?: string;
  description?: string;
  employmentType?: string;
  location?: string;
  skills?: string[];
}

interface UpdatePositionParams {
  title?: string;
  department?: string;
  experienceRequired?: string;
  description?: string;
  employmentType?: string;
  location?: string;
  skills?: string[];
  status?: string;
}

interface ListPositionsParams {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export async function createPosition(params: CreatePositionParams): Promise<ActionResult<Position>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('positions')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      department: params.department,
      experience_required: params.experienceRequired || null,
      description: params.description || null,
      employment_type: params.employmentType || null,
      location: params.location || null,
      skills: params.skills || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  return success(data as Position);
}

export async function updatePosition(id: string, params: UpdatePositionParams): Promise<ActionResult<Position>> {
  const admin = createAdmin();
  const updateData: Record<string, unknown> = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.department !== undefined) updateData.department = params.department;
  if (params.experienceRequired !== undefined) updateData.experience_required = params.experienceRequired;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.employmentType !== undefined) updateData.employment_type = params.employmentType;
  if (params.location !== undefined) updateData.location = params.location;
  if (params.skills !== undefined) updateData.skills = params.skills;
  if (params.status !== undefined) updateData.status = params.status;

  const { data, error } = await admin
    .from('positions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Position);
}

export async function deletePosition(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();

  const { data: activeInterviews } = await admin
    .from('interviews')
    .select('id')
    .eq('position_id', id)
    .in('status', ['pending', 'scheduled', 'confirmed'])
    .limit(1);

  if (activeInterviews && activeInterviews.length > 0) {
    return {
      success: false,
      error: { code: 'HAS_ACTIVE_INTERVIEWS', message: 'Cannot delete position with active interviews. Please close the position instead.' },
    };
  }

  const { error } = await admin
    .from('positions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: { code: 'DELETE_FAILED', message: error.message } };
  return success(undefined);
}

export async function getPosition(id: string): Promise<ActionResult<Position>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('positions')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Position not found' } };
  return success(data as Position);
}

export async function listPositions(params: ListPositionsParams): Promise<ActionResult<PaginatedData<Position>>> {
  const admin = createAdmin();
  const { organizationId, page = 1, pageSize = 20, search, status } = params;

  let query = admin
    .from('positions')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (search) {
    query = query.or(`title.ilike.%${search}%,department.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(paginated(data as Position[], count ?? 0, page, pageSize));
}

import { createAdmin } from '@/lib/supabase/admin';
import { NotFoundError, ValidationError } from './errors';
import { success, paginated, type ActionResult, type PaginatedData } from './response';
import type { Organization, OrganizationMember } from '@/types';

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const admin = createAdmin();
  const { data } = await admin
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  return data as Organization | null;
}

export async function updateOrganization(
  organizationId: string,
  name: string,
): Promise<ActionResult<Organization>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Organization);
}

export async function getOrganizationMembers(
  organizationId: string,
  page = 1,
  pageSize = 20,
): Promise<ActionResult<PaginatedData<OrganizationMember>>> {
  const admin = createAdmin();
  const { count: total } = await admin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await admin
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(paginated(data as OrganizationMember[], total ?? 0, page, pageSize));
}

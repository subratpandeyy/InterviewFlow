import { createAdmin } from '@/lib/supabase/admin';
import { NotFoundError, ValidationError } from './errors';
import { sendEmail } from './email.service';
import { success, paginated, type ActionResult, type PaginatedData } from './response';
import type { Candidate } from '@/types';

interface CreateCandidateParams {
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string;
  positionApplied?: string;
  resumeUrl?: string;
  notes?: string;
}

interface UpdateCandidateParams {
  fullName?: string;
  email?: string;
  phone?: string;
  positionApplied?: string;
  resumeUrl?: string;
  notes?: string;
  status?: string;
}

interface ListCandidatesParams {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  recruiterId?: string;
}

function generateAccessToken(): string {
  return crypto.randomUUID();
}

export async function createCandidate(params: CreateCandidateParams): Promise<ActionResult<Candidate>> {
  const admin = createAdmin();
  const token = generateAccessToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data, error } = await admin
    .from('candidates')
    .insert({
      organization_id: params.organizationId,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone || null,
      position_applied: params.positionApplied || null,
      resume_url: params.resumeUrl || null,
      notes: params.notes || null,
      status: 'applied',
      access_token: token,
      access_token_expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };

  const portalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portal/${token}`;

  await sendEmail({
    to: params.email,
    subject: 'Your Interview Portal Access',
    html: `<h1>Hello ${params.fullName},</h1><p>Welcome to InterviewFlow. Click the link below to access your portal:</p><p><a href="${portalLink}">${portalLink}</a></p>`,
  });

  return success(data as Candidate);
}

export async function updateCandidate(
  id: string,
  params: UpdateCandidateParams,
): Promise<ActionResult<Candidate>> {
  const admin = createAdmin();

  const updateData: Record<string, unknown> = {};
  if (params.fullName !== undefined) updateData.full_name = params.fullName;
  if (params.email !== undefined) updateData.email = params.email;
  if (params.phone !== undefined) updateData.phone = params.phone;
  if (params.positionApplied !== undefined) updateData.position_applied = params.positionApplied;
  if (params.resumeUrl !== undefined) updateData.resume_url = params.resumeUrl;
  if (params.notes !== undefined) updateData.notes = params.notes;
  if (params.status !== undefined) updateData.status = params.status;

  const { data, error } = await admin
    .from('candidates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Candidate);
}

export async function deleteCandidate(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: { code: 'DELETE_FAILED', message: error.message } };
  return success(undefined);
}

export async function getCandidate(id: string): Promise<ActionResult<Candidate>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('candidates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } };
  return success(data as Candidate);
}

export async function listCandidates(
  params: ListCandidatesParams,
): Promise<ActionResult<PaginatedData<Candidate>>> {
  const admin = createAdmin();
  const { organizationId, page = 1, pageSize = 20, search, status, recruiterId } = params;

  let query = admin
    .from('candidates')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (recruiterId) {
    query = query.eq('recruiter_id', recruiterId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: { code: 'FETCH_FAILED', message: error.message } };
  return success(paginated(data as Candidate[], count ?? 0, page, pageSize));
}

export async function updateCandidateStatus(
  id: string,
  status: string,
): Promise<ActionResult<Candidate>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('candidates')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
  return success(data as Candidate);
}

export async function bulkDeleteCandidates(ids: string[]): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return { success: false, error: { code: 'BULK_DELETE_FAILED', message: error.message } };
  return success(undefined);
}

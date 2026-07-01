import { createAdmin } from '@/lib/supabase/admin';
import { success, failure, type ActionResult } from './response';

export interface ParsingHistoryEntry {
  id: string;
  resume_id: string;
  candidate_id: string;
  organization_id: string;
  parse_version: string;
  status: 'processing' | 'completed' | 'failed';
  success: boolean;
  error_message: string | null;
  parse_duration_ms: number | null;
  extracted_skills_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function createParsingHistory(data: {
  resume_id: string;
  candidate_id: string;
  organization_id: string;
  status?: string;
  success?: boolean;
  error_message?: string | null;
  parse_duration_ms?: number | null;
  extracted_skills_count?: number;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<ParsingHistoryEntry>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('resume_parsing_history').insert({
    resume_id: data.resume_id,
    candidate_id: data.candidate_id,
    organization_id: data.organization_id,
    parse_version: '1.0',
    status: data.status || 'processing',
    success: data.success ?? false,
    error_message: data.error_message || null,
    parse_duration_ms: data.parse_duration_ms || null,
    extracted_skills_count: data.extracted_skills_count || 0,
    metadata: data.metadata || {},
  }).select().single();

  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as ParsingHistoryEntry);
}

export async function getParsingHistory(
  resumeId: string,
): Promise<ActionResult<ParsingHistoryEntry[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('resume_parsing_history')
    .select('*')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false });

  if (error) return failure('FETCH_FAILED', error.message);
  return success((data || []) as ParsingHistoryEntry[]);
}

export async function getCandidateParsingHistory(
  candidateId: string,
): Promise<ActionResult<ParsingHistoryEntry[]>> {
  const admin = createAdmin();
  const { data, error } = await admin
    .from('resume_parsing_history')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) return failure('FETCH_FAILED', error.message);
  return success((data || []) as ParsingHistoryEntry[]);
}

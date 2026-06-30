import { createAdmin } from '@/lib/supabase/admin';
import { success, failure, type ActionResult } from './response';
import type {
  Candidate,
  Resume,
  CandidateSkill,
  CandidateExperience,
  CandidateEducation,
  CandidateProject,
  CandidateCertification,
  CandidateDocument,
  CandidateNote,
  CandidateStatusHistory,
} from '@/types';

export interface CandidateProfileData {
  candidate: Candidate & {
    recruiter?: { id: string; full_name: string; email: string } | null;
    referred_by_profile?: { id: string; full_name: string } | null;
  };
  resumes: Resume[];
  skills: CandidateSkill[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  projects: CandidateProject[];
  certifications: CandidateCertification[];
  documents: CandidateDocument[];
  notes: CandidateNote[];
  statusHistory: CandidateStatusHistory[];
  interviews: Array<{
    id: string;
    interview_type: string;
    status: string;
    scheduled_at: string | null;
    meeting_link: string | null;
    duration_minutes: number;
    interviewer: { id: string; full_name: string; email: string } | null;
    feedback: Array<{
      id: string;
      rating: number;
      communication: number;
      technical_skills: number;
      problem_solving: number;
      comments: string | null;
      recommendation: string;
      is_finalized: boolean;
      created_at: string;
    }>;
  }>;
  activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    actor_name?: string;
  }>;
}

export async function getCandidateProfile(
  candidateId: string,
): Promise<ActionResult<CandidateProfileData>> {
  const admin = createAdmin();

  const candidateRes = await admin
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .is('deleted_at', null)
    .single();

  if (candidateRes.error || !candidateRes.data) {
    console.error('[candidate-profile] Candidate query failed:', candidateRes.error);
    return failure('NOT_FOUND', 'Candidate not found');
  }

  const candidate = candidateRes.data;

  const run = async (q: any) => {
    try { return await q; } catch { return { data: null, error: null }; }
  };

  const [
    recruiterRes,
    referredByRes,
    resumesRes,
    skillsRes,
    expRes,
    eduRes,
    projRes,
    certRes,
    docsRes,
    notesRes,
    statusHistRes,
    interviewsRes,
    feedbacksRes,
    activityRes,
  ] = await Promise.all([
    candidate.recruiter_id
      ? run(admin.from('profiles').select('id, full_name, email').eq('id', candidate.recruiter_id).maybeSingle())
      : run(Promise.resolve({ data: null, error: null })),
    candidate.referred_by
      ? run(admin.from('profiles').select('id, full_name').eq('id', candidate.referred_by).maybeSingle())
      : run(Promise.resolve({ data: null, error: null })),
    run(admin.from('resumes').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('candidate_skills').select('*').eq('candidate_id', candidateId).order('skill_name')),
    run(admin.from('candidate_experience').select('*').eq('candidate_id', candidateId).order('start_date', { ascending: false, nullsFirst: false })),
    run(admin.from('candidate_education').select('*').eq('candidate_id', candidateId).order('start_date', { ascending: false, nullsFirst: false })),
    run(admin.from('candidate_projects').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('candidate_certifications').select('*').eq('candidate_id', candidateId).order('issue_date', { ascending: false, nullsFirst: false })),
    run(admin.from('candidate_documents').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('candidate_notes').select('*, author:profiles(id, full_name, email)').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('candidate_status_history').select('*, changed_by_profile:profiles!changed_by(id, full_name)').eq('candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('interviews').select('id, interview_type, status, scheduled_at, meeting_link, duration_minutes, interviewer:profiles!interviewer_id(id, full_name, email)').eq('candidate_id', candidateId).is('deleted_at', null).order('created_at', { ascending: false })),
    run(admin.from('interview_feedback').select('*, interview:interviews!inner(candidate_id)').eq('interview.candidate_id', candidateId).order('created_at', { ascending: false })),
    run(admin.from('audit_logs').select('*, profile:profiles(full_name)').eq('entity_id', candidateId).order('created_at', { ascending: false }).limit(50)),
  ]);

  const feedbackByInterview: Record<string, Array<{
    id: string;
    rating: number;
    communication: number;
    technical_skills: number;
    problem_solving: number;
    comments: string | null;
    recommendation: string;
    is_finalized: boolean;
    created_at: string;
  }>> = {};
  for (const fb of feedbacksRes.data ?? []) {
    if (!feedbackByInterview[fb.interview_id]) {
      feedbackByInterview[fb.interview_id] = [];
    }
    feedbackByInterview[fb.interview_id]!.push({
      id: fb.id,
      rating: fb.rating,
      communication: fb.communication,
      technical_skills: fb.technical_skills,
      problem_solving: fb.problem_solving,
      comments: fb.comments,
      recommendation: fb.recommendation,
      is_finalized: fb.is_finalized,
      created_at: fb.created_at,
    });
  }

  const interviews = (interviewsRes.data ?? []).map((i: Record<string, any>) => {
    const interviewerRaw = i.interviewer as unknown as Record<string, unknown> | null;
    return {
      id: i.id,
      interview_type: i.interview_type,
      status: i.status,
      scheduled_at: i.scheduled_at,
      meeting_link: i.meeting_link,
      duration_minutes: i.duration_minutes,
      interviewer: interviewerRaw ? { id: String(interviewerRaw.id), full_name: String(interviewerRaw.full_name || ''), email: String(interviewerRaw.email || '') } : null,
      feedback: feedbackByInterview[i.id] ?? [],
    };
  });

  const activity = (activityRes.data ?? []).map((a: Record<string, any>) => ({
    id: a.id,
    action: a.action,
    entity_type: a.entity_type,
    created_at: a.created_at,
    actor_name: (a.profile as { full_name: string } | null)?.full_name,
  }));

  return success({
    candidate: {
      ...candidate,
      recruiter: recruiterRes?.data || null,
      referred_by_profile: referredByRes?.data || null,
    } as CandidateProfileData['candidate'],
    resumes: (resumesRes.data ?? []) as Resume[],
    skills: (skillsRes.data ?? []) as CandidateSkill[],
    experience: (expRes.data ?? []) as CandidateExperience[],
    education: (eduRes.data ?? []) as CandidateEducation[],
    projects: (projRes.data ?? []) as CandidateProject[],
    certifications: (certRes.data ?? []) as CandidateCertification[],
    documents: (docsRes.data ?? []) as CandidateDocument[],
    notes: (notesRes.data ?? []) as CandidateNote[],
    statusHistory: (statusHistRes.data ?? []) as CandidateStatusHistory[],
    interviews,
    activity,
  });
}

export async function getCandidateBasic(id: string): Promise<ActionResult<Candidate>> {
  const admin = createAdmin();
  const { data, error } = await admin.from('candidates').select('*').eq('id', id).is('deleted_at', null).single();
  if (error || !data) return failure('NOT_FOUND', 'Candidate not found');
  return success(data as Candidate);
}

export async function createSkill(data: {
  candidate_id: string;
  organization_id: string;
  skill_name: string;
  category?: string | null;
  proficiency?: string | null;
  years_experience?: number | null;
}): Promise<ActionResult<CandidateSkill>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_skills').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateSkill);
}

export async function updateSkill(id: string, data: {
  skill_name?: string;
  category?: string | null;
  proficiency?: string | null;
  years_experience?: number | null;
}): Promise<ActionResult<CandidateSkill>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_skills').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateSkill);
}

export async function deleteSkill(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_skills').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createExperience(data: {
  candidate_id: string;
  organization_id: string;
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  skills_used?: string[] | null;
}): Promise<ActionResult<CandidateExperience>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_experience').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateExperience);
}

export async function updateExperience(id: string, data: {
  company?: string;
  title?: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  skills_used?: string[] | null;
}): Promise<ActionResult<CandidateExperience>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_experience').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateExperience);
}

export async function deleteExperience(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_experience').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createEducation(data: {
  candidate_id: string;
  organization_id: string;
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  grade?: string | null;
}): Promise<ActionResult<CandidateEducation>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_education').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateEducation);
}

export async function updateEducation(id: string, data: {
  institution?: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  grade?: string | null;
}): Promise<ActionResult<CandidateEducation>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_education').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateEducation);
}

export async function deleteEducation(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_education').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createProject(data: {
  candidate_id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  technologies?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
}): Promise<ActionResult<CandidateProject>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_projects').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateProject);
}

export async function updateProject(id: string, data: {
  name?: string;
  description?: string | null;
  url?: string | null;
  technologies?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
}): Promise<ActionResult<CandidateProject>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_projects').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateProject);
}

export async function deleteProject(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_projects').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createCertification(data: {
  candidate_id: string;
  organization_id: string;
  name: string;
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
}): Promise<ActionResult<CandidateCertification>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_certifications').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateCertification);
}

export async function updateCertification(id: string, data: {
  name?: string;
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
}): Promise<ActionResult<CandidateCertification>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_certifications').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateCertification);
}

export async function deleteCertification(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_certifications').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createDocument(data: {
  candidate_id: string;
  organization_id: string;
  document_type: string;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
}): Promise<ActionResult<CandidateDocument>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_documents').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateDocument);
}

export async function deleteDocument(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_documents').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function createNote(data: {
  candidate_id: string;
  organization_id: string;
  author_id: string;
  content: string;
  note_type?: string;
  is_pinned?: boolean;
}): Promise<ActionResult<CandidateNote>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_notes').insert(data).select().single();
  if (error) return failure('CREATE_FAILED', error.message);
  return success(result as CandidateNote);
}

export async function updateNote(id: string, data: {
  content?: string;
  note_type?: string;
  is_pinned?: boolean;
}): Promise<ActionResult<CandidateNote>> {
  const admin = createAdmin();
  const { data: result, error } = await admin.from('candidate_notes').update(data).eq('id', id).select().single();
  if (error) return failure('UPDATE_FAILED', error.message);
  return success(result as CandidateNote);
}

export async function deleteNote(id: string): Promise<ActionResult<void>> {
  const admin = createAdmin();
  const { error } = await admin.from('candidate_notes').delete().eq('id', id);
  if (error) return failure('DELETE_FAILED', error.message);
  return success(undefined);
}

export async function uploadResume(
  candidateId: string,
  organizationId: string,
  file: File,
): Promise<ActionResult<{ file_url: string }>> {
  const admin = createAdmin();
  const ext = file.name.split('.').pop() || 'pdf';
  const filePath = `${organizationId}/${candidateId}/resume.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('candidate-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) return failure('UPLOAD_FAILED', uploadError.message);

  const { data: urlData } = admin.storage
    .from('candidate-files')
    .getPublicUrl(filePath);

  const { data: resume, error: dbError } = await admin
    .from('resumes')
    .insert({
      candidate_id: candidateId,
      organization_id: organizationId,
      file_url: urlData.publicUrl,
      file_type: file.type,
      parsing_status: 'pending',
    })
    .select()
    .single();

  if (dbError) return failure('DB_FAILED', dbError.message);

  return success({ file_url: urlData.publicUrl });
}

export async function uploadDocument(
  candidateId: string,
  organizationId: string,
  documentType: string,
  file: File,
  uploadedBy?: string,
): Promise<ActionResult<CandidateDocument>> {
  const admin = createAdmin();
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const filePath = `${organizationId}/${candidateId}/documents/${timestamp}_${file.name}`;

  const { error: uploadError } = await admin.storage
    .from('candidate-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) return failure('UPLOAD_FAILED', uploadError.message);

  const { data: urlData } = admin.storage
    .from('candidate-files')
    .getPublicUrl(filePath);

  const { data: doc, error: dbError } = await admin
    .from('candidate_documents')
    .insert({
      candidate_id: candidateId,
      organization_id: organizationId,
      document_type: documentType,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: uploadedBy || null,
    })
    .select()
    .single();

  if (dbError) return failure('DB_FAILED', dbError.message);
  return success(doc as CandidateDocument);
}

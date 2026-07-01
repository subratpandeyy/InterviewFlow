'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/services/auth.service';
import * as profileService from '@/lib/services/candidate-profile.service';
import { failure } from '@/lib/services/response';
import { createAdmin } from '@/lib/supabase/admin';
import { parseResumeAndUpdateDb } from '@/lib/services/resume-parser.service';
import { createParsingHistory } from '@/lib/services/resume-parsing-history.service';

export async function getCandidateProfile(id: string) {
  const ctx = await requireRole(['recruiter', 'organization_admin']);
  const result = await profileService.getCandidateProfile(id);
  return result;
}

export async function addSkill(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createSkill({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    skill_name: formData.get('skill_name') as string,
    category: (formData.get('category') as string) || null,
    proficiency: (formData.get('proficiency') as string) || null,
    years_experience: formData.get('years_experience') ? Number(formData.get('years_experience')) : null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editSkill(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateSkill(id, {
    skill_name: formData.get('skill_name') as string,
    category: (formData.get('category') as string) || null,
    proficiency: (formData.get('proficiency') as string) || null,
    years_experience: formData.get('years_experience') ? Number(formData.get('years_experience')) : null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeSkill(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteSkill(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addExperience(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createExperience({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    company: formData.get('company') as string,
    title: formData.get('title') as string,
    location: (formData.get('location') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    description: (formData.get('description') as string) || null,
    skills_used: formData.get('skills_used')
      ? (formData.get('skills_used') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editExperience(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateExperience(id, {
    company: formData.get('company') as string,
    title: formData.get('title') as string,
    location: (formData.get('location') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    description: (formData.get('description') as string) || null,
    skills_used: formData.get('skills_used')
      ? (formData.get('skills_used') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeExperience(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteExperience(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addEducation(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createEducation({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    institution: formData.get('institution') as string,
    degree: (formData.get('degree') as string) || null,
    field_of_study: (formData.get('field_of_study') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    grade: (formData.get('grade') as string) || null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editEducation(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateEducation(id, {
    institution: formData.get('institution') as string,
    degree: (formData.get('degree') as string) || null,
    field_of_study: (formData.get('field_of_study') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
    grade: (formData.get('grade') as string) || null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeEducation(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteEducation(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addProject(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createProject({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    url: (formData.get('url') as string) || null,
    technologies: formData.get('technologies')
      ? (formData.get('technologies') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editProject(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateProject(id, {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    url: (formData.get('url') as string) || null,
    technologies: formData.get('technologies')
      ? (formData.get('technologies') as string).split(',').map(s => s.trim()).filter(Boolean)
      : null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_current: formData.get('is_current') === 'true',
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeProject(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteProject(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addCertification(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createCertification({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    name: formData.get('name') as string,
    issuer: (formData.get('issuer') as string) || null,
    issue_date: (formData.get('issue_date') as string) || null,
    expiry_date: (formData.get('expiry_date') as string) || null,
    credential_url: (formData.get('credential_url') as string) || null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editCertification(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateCertification(id, {
    name: formData.get('name') as string,
    issuer: (formData.get('issuer') as string) || null,
    issue_date: (formData.get('issue_date') as string) || null,
    expiry_date: (formData.get('expiry_date') as string) || null,
    credential_url: (formData.get('credential_url') as string) || null,
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeCertification(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteCertification(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addDocument(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file provided' };

  const result = await profileService.uploadDocument(
    formData.get('candidate_id') as string,
    ctx.user.organizationId,
    formData.get('document_type') as string,
    file,
    ctx.user.profileId,
  );
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true, document: result.data };
}

export async function removeDocument(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteDocument(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function addNote(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const result = await profileService.createNote({
    candidate_id: formData.get('candidate_id') as string,
    organization_id: ctx.user.organizationId,
    author_id: ctx.user.profileId,
    content: formData.get('content') as string,
    note_type: (formData.get('note_type') as string) || 'general',
    is_pinned: formData.get('is_pinned') === 'true',
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function editNote(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.updateNote(id, {
    content: formData.get('content') as string,
    note_type: (formData.get('note_type') as string) || undefined,
    is_pinned: formData.get('is_pinned') === 'true',
  });
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function removeNote(formData: FormData) {
  await requireRole('recruiter');
  const id = formData.get('id') as string;
  const result = await profileService.deleteNote(id);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function uploadResume(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file provided' };

  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(file.type) && ext !== 'pdf' && ext !== 'docx') {
    return { error: 'Unsupported file format. Only PDF and DOCX are allowed.' };
  }

  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    return { error: 'File too large. Maximum size is 15MB.' };
  }

  const result = await profileService.uploadResume(
    formData.get('candidate_id') as string,
    ctx.user.organizationId,
    file,
  );
  if (!result.success) return { error: result.error.message };

  const resumeId = result.data.resume_id;
  const candidateId = formData.get('candidate_id') as string;

  // Parse the file directly (inline, not via HTTP)
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await createParsingHistory({
      resume_id: resumeId,
      candidate_id: candidateId,
      organization_id: ctx.user.organizationId,
      status: 'processing',
    });
    const parseResult = await parseResumeAndUpdateDb(resumeId, buffer, file.type, file.name);
    if (!parseResult.success) {
      console.error('[uploadResume] Parsing failed:', parseResult.error);
    }
  } catch (err) {
    console.error('[uploadResume] Parse error:', err);
    // File still uploaded successfully; parsing failure is non-fatal
  }

  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true, file_url: result.data.file_url };
}

export async function triggerParse(formData: FormData) {
  await requireRole('recruiter');
  const resumeId = formData.get('resume_id') as string;
  if (!resumeId) return { error: 'resume_id is required' };
  const result = await profileService.queueResumeParsing(resumeId);
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

export async function acceptParsedData(formData: FormData) {
  const ctx = await requireRole('recruiter');
  const candidateId = formData.get('candidate_id') as string;
  const resumeId = formData.get('resume_id') as string;

  const admin = createAdmin();

  const resumeRes = await admin.from('resumes').select('parsed_data').eq('id', resumeId).single();
  if (resumeRes.error || !resumeRes.data?.parsed_data) return { error: 'No parsed data found' };

  const parsed = resumeRes.data.parsed_data as Record<string, unknown>;
  const errors: string[] = [];

  if (parsed.skills && Array.isArray(parsed.skills)) {
    for (const skill of parsed.skills as Array<{ name: string; category?: string; confidence: number }>) {
      const existing = await admin.from('candidate_skills')
        .select('id').eq('candidate_id', candidateId).eq('skill_name', skill.name).maybeSingle();
      if (!existing.data) {
        const r = await admin.from('candidate_skills').insert({
          candidate_id: candidateId,
          organization_id: ctx.user.organizationId,
          skill_name: skill.name,
          category: skill.category || null,
          confidence_score: Math.round(skill.confidence * 100) / 100,
          source: 'resume_parser',
          is_verified: false,
        });
        if (r.error) errors.push(`Skill "${skill.name}": ${r.error.message}`);
      }
    }
  }

  if (parsed.experience && Array.isArray(parsed.experience)) {
    for (const exp of parsed.experience as Array<{ company: string; title: string; start_date?: string; end_date?: string; is_current?: boolean; description?: string }>) {
      const r = await admin.from('candidate_experience').insert({
        candidate_id: candidateId,
        organization_id: ctx.user.organizationId,
        company: exp.company,
        title: exp.title,
        start_date: exp.start_date || null,
        end_date: exp.is_current ? null : (exp.end_date || null),
        is_current: exp.is_current || false,
        description: exp.description || null,
        confidence_score: 80,
        extracted_data_source: 'resume_parser',
      });
      if (r.error) errors.push(`Experience "${exp.company}": ${r.error.message}`);
    }
  }

  if (parsed.education && Array.isArray(parsed.education)) {
    for (const edu of parsed.education as Array<{ institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; grade?: string }>) {
      const r = await admin.from('candidate_education').insert({
        candidate_id: candidateId,
        organization_id: ctx.user.organizationId,
        institution: edu.institution,
        degree: edu.degree || null,
        field_of_study: edu.field_of_study || null,
        start_date: edu.start_date || null,
        end_date: edu.end_date || null,
        grade: edu.grade || null,
        confidence_score: 75,
        extracted_data_source: 'resume_parser',
      });
      if (r.error) errors.push(`Education "${edu.institution}": ${r.error.message}`);
    }
  }

  if (parsed.projects && Array.isArray(parsed.projects)) {
    for (const proj of parsed.projects as Array<{ name: string; description?: string; technologies?: string[]; url?: string }>) {
      const r = await admin.from('candidate_projects').insert({
        candidate_id: candidateId,
        organization_id: ctx.user.organizationId,
        name: proj.name,
        description: proj.description || null,
        technologies: proj.technologies || null,
        url: proj.url || null,
        confidence_score: 70,
        extracted_data_source: 'resume_parser',
      });
      if (r.error) errors.push(`Project "${proj.name}": ${r.error.message}`);
    }
  }

  if (parsed.certifications && Array.isArray(parsed.certifications)) {
    for (const cert of parsed.certifications as Array<{ name: string; issuer?: string; issue_date?: string; credential_url?: string }>) {
      const r = await admin.from('candidate_certifications').insert({
        candidate_id: candidateId,
        organization_id: ctx.user.organizationId,
        name: cert.name,
        issuer: cert.issuer || null,
        issue_date: cert.issue_date || null,
        credential_url: cert.credential_url || null,
        confidence_score: 85,
        extracted_data_source: 'resume_parser',
      });
      if (r.error) errors.push(`Certification "${cert.name}": ${r.error.message}`);
    }
  }

  if (parsed.summary && typeof parsed.summary === 'object') {
    await admin.from('candidates').update({
      summary: parsed.summary as any,
    }).eq('id', candidateId);
  }

  if (parsed.contact && typeof parsed.contact === 'object') {
    const contact = parsed.contact as Record<string, unknown>;
    const candidate = await admin.from('candidates').select('*').eq('id', candidateId).single();
    if (candidate.data) {
      const updates: Record<string, unknown> = {};
      if (!candidate.data.linkedin_url && contact.linkedin) updates.linkedin_url = contact.linkedin;
      if (!candidate.data.github_url && contact.github) updates.github_url = contact.github;
      if (!candidate.data.portfolio_url && contact.portfolio) updates.portfolio_url = contact.portfolio;
      if (!candidate.data.current_company && (parsed.summary as Record<string, unknown>)?.current_company) {
        updates.current_company = (parsed.summary as Record<string, unknown>).current_company;
      }
      if (!candidate.data.current_title && (parsed.summary as Record<string, unknown>)?.current_role) {
        updates.current_title = (parsed.summary as Record<string, unknown>).current_role;
      }
      if (Object.keys(updates).length > 0) {
        await admin.from('candidates').update(updates).eq('id', candidateId);
      }
    }
  }

  if (errors.length > 0) {
    return { success: true, warnings: errors };
  }

  revalidatePath(`/recruiter/candidates/${candidateId}`);
  return { success: true };
}

export async function rejectParsedData(formData: FormData) {
  await requireRole('recruiter');
  const resumeId = formData.get('resume_id') as string;
  const admin = createAdmin();
  await admin.from('resumes').update({
    parsed_data: {},
    parsed_text: null,
    parsing_status: 'completed',
    parsing_error: 'Rejected by recruiter',
  }).eq('id', resumeId);
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true };
}

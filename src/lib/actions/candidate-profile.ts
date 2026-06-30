'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/services/auth.service';
import * as profileService from '@/lib/services/candidate-profile.service';
import { failure } from '@/lib/services/response';

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

  const result = await profileService.uploadResume(
    formData.get('candidate_id') as string,
    ctx.user.organizationId,
    file,
  );
  if (!result.success) return { error: result.error.message };
  revalidatePath(`/recruiter/candidates/${formData.get('candidate_id')}`);
  return { success: true, file_url: result.data.file_url };
}

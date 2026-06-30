import { z } from 'zod';

export const skillSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  skill_name: z.string().min(1, 'Skill name is required').max(100),
  category: z.string().max(100).optional().nullable(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional().nullable(),
  years_experience: z.number().min(0).max(100).optional().nullable(),
});

export const experienceSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  company: z.string().min(1, 'Company is required').max(200),
  title: z.string().min(1, 'Position is required').max(200),
  location: z.string().max(200).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().default(false),
  description: z.string().optional().nullable(),
  skills_used: z.array(z.string()).optional().nullable(),
});

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  institution: z.string().min(1, 'Institution is required').max(200),
  degree: z.string().max(200).optional().nullable(),
  field_of_study: z.string().max(200).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().default(false),
  grade: z.string().max(50).optional().nullable(),
});

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  name: z.string().min(1, 'Project title is required').max(200),
  description: z.string().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  technologies: z.array(z.string()).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().default(false),
});

export const certificationSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  name: z.string().min(1, 'Certification name is required').max(200),
  issuer: z.string().max(200).optional().nullable(),
  issue_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  credential_url: z.string().url().optional().nullable().or(z.literal('')),
});

export const noteSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string().uuid(),
  content: z.string().min(1, 'Note content is required'),
  note_type: z.enum(['general', 'feedback', 'summary', 'action_item']).default('general'),
  is_pinned: z.boolean().default(false),
});

export const candidateBasicSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  position_applied: z.string().max(200).optional().nullable(),
  current_company: z.string().max(200).optional().nullable(),
  current_title: z.string().max(200).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  source_detail: z.string().max(200).optional().nullable(),
  preferred_timezone: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

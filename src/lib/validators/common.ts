import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().max(255);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const candidateStatusSchema = z.enum([
  'applied',
  'screening',
  'scheduled',
  'interviewed',
  'selected',
  'rejected',
]);

export const interviewTypeSchema = z.enum([
  'hr',
  'technical',
  'managerial',
  'final',
]);

export const interviewStatusSchema = z.enum([
  'pending',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export const positionStatusSchema = z.enum([
  'open',
  'closed',
  'on-hold',
  'filled',
]);

export const employmentTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'internship',
]);

export const roleSchema = z.enum([
  'organization_admin',
  'recruiter',
  'interviewer',
]);

export const meetingProviderSchema = z.enum([
  'google_meet',
  'zoom',
  'microsoft_teams',
  'custom',
]);

export const feedbackRecommendationSchema = z.enum([
  'hire',
  'maybe',
  'reject',
]);

export const availabilityStatusSchema = z.enum([
  'available',
  'booked',
  'blocked',
]);

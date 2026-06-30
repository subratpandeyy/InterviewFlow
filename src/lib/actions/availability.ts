'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/services/auth.service';
import * as availabilityService from '@/lib/services/availability.service';

export async function addAvailabilitySlot(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const date = formData.get('date') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;

  if (!date || !startTime || !endTime) throw new Error('Missing required fields');

  const result = await availabilityService.addDateSpecificSlot({
    interviewerId: ctx.user.profileId,
    date,
    startTime,
    endTime,
  });

  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/interviewer/availability');
}

export async function removeAvailabilitySlot(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const slotId = formData.get('slot_id') as string;
  if (!slotId) throw new Error('Missing slot ID');

  const result = await availabilityService.removeSlot(slotId, ctx.user.profileId);
  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/interviewer/availability');
}

export async function blockDate(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const date = formData.get('date') as string;

  const result = await availabilityService.blockDate(ctx.user.profileId, date);
  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/interviewer/availability');
}

export async function removeBlockedDate(formData: FormData) {
  const ctx = await requireRole('interviewer');

  const slotId = formData.get('slot_id') as string;
  if (!slotId) throw new Error('Missing slot ID');

  const result = await availabilityService.removeSlot(slotId, ctx.user.profileId);
  if (!result.success) throw new Error(result.error.message);
  revalidatePath('/interviewer/availability');
}


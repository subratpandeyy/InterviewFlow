'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

export async function addAvailabilitySlot(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const date = formData.get('date') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;

  if (!date || !startTime || !endTime) throw new Error('Missing required fields');
  if (startTime >= endTime) throw new Error('Start time must be before end time');

  const admin = createAdmin();
  const { data: overlap } = await admin
    .from('interviewer_availability')
    .select('id, start_time, end_time')
    .eq('interviewer_id', profile.id)
    .eq('date', date)
    .eq('status', 'available')
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (overlap && overlap.length > 0) {
    throw new Error('This slot overlaps with existing availability');
  }

  const { error } = await supabase.from('interviewer_availability').insert({
    interviewer_id: profile.id,
    date,
    start_time: startTime,
    end_time: endTime,
    status: 'available',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/availability');
}

export async function removeAvailabilitySlot(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const slotId = formData.get('slot_id') as string;
  if (!slotId) throw new Error('Missing slot ID');

  const { error } = await supabase
    .from('interviewer_availability')
    .delete()
    .eq('id', slotId)
    .eq('interviewer_id', profile.id);

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/availability');
}

export async function blockDate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'interviewer') throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const date = formData.get('date') as string;

  const { error } = await supabase.from('interviewer_availability').insert({
    interviewer_id: profile.id,
    date,
    start_time: '00:00',
    end_time: '23:59',
    status: 'blocked',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/availability');
}

export async function removeBlockedDate(formData: FormData) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const slotId = formData.get('slot_id') as string;

  const { error } = await supabase
    .from('interviewer_availability')
    .delete()
    .eq('id', slotId)
    .eq('interviewer_id', profile.id)
    .eq('status', 'blocked');

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/availability');
}

export async function disconnectGoogleCalendar() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const { error } = await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('profile_id', profile.id);

  if (error) throw new Error(error.message);
  revalidatePath('/interviewer/calendar');
}

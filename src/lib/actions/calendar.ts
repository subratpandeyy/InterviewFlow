'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { getInterviewerTokens, listUpcomingEvents, checkCalendarHealth, createCalendarEvent } from '@/lib/services/calendar.service';

export async function syncCalendar() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const admin = createAdmin();

  try {
    await admin.from('google_calendar_tokens').update({
      sync_status: 'syncing',
    }).eq('profile_id', profile.id);
  } catch {
    // migration column sync_status may not exist yet
  }

  try {
    const tokens = await getInterviewerTokens(profile.id);
    if (!tokens) throw new Error('No Google Calendar connected');

    const events = await listUpcomingEvents(
      tokens.accessToken,
      tokens.refreshToken,
      tokens.calendarEmail,
      20,
    );

    try {
      await admin.from('google_calendar_tokens').update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'synced',
        sync_error: null,
      }).eq('profile_id', profile.id);
    } catch {
      // migration columns may not exist yet
    }

    revalidatePath('/interviewer/calendar');
    revalidatePath('/interviewer');

    return { success: true, events };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';

    try {
      await admin.from('google_calendar_tokens').update({
        sync_status: 'error',
        sync_error: message,
      }).eq('profile_id', profile.id);
    } catch {
      // migration columns may not exist yet
    }

    revalidatePath('/interviewer/calendar');
    throw new Error(message);
  }
}

export async function disconnectGoogleCalendarAction() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const admin = createAdmin();
  const { error } = await admin
    .from('google_calendar_tokens')
    .delete()
    .eq('profile_id', profile.id);

  if (error) throw new Error(error.message);

  revalidatePath('/interviewer/calendar');
  revalidatePath('/interviewer');
}

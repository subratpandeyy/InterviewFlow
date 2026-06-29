'use server';

import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { getInterviewerTokens } from '@/lib/google/tokens';
import { listUpcomingEvents, checkCalendarHealth, createCalendarEvent } from '@/lib/google/calendar';
import { encryptToken } from '@/lib/google/encryption';
import { sendEmail } from '@/lib/email';

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

export async function checkCalendarConnectionHealth(): Promise<{
  connected: boolean;
  healthy: boolean;
  message: string;
  email?: string;
  lastSync?: string;
  syncStatus?: string;
}> {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false, healthy: false, message: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { connected: false, healthy: false, message: 'Profile not found' };

  const admin = createAdmin();
  const { data: tokenRow } = await admin
    .from('google_calendar_tokens')
    .select('calendar_email')
    .eq('profile_id', profile.id)
    .maybeSingle();

  let meta: Record<string, string | null> | null = null;
  try {
    const { data: m } = await admin
      .from('google_calendar_tokens')
      .select('last_sync_at, sync_status, sync_error')
      .eq('profile_id', profile.id)
      .maybeSingle();
    meta = m as Record<string, string | null> | null;
  } catch {
    // migration columns don't exist yet
  }

  if (!tokenRow) {
    return { connected: false, healthy: false, message: 'No Google Calendar connected' };
  }

  const tokens = await getInterviewerTokens(profile.id);
  if (!tokens) {
    return {
      connected: true,
      healthy: false,
      message: 'Failed to retrieve tokens. Try reconnecting.',
      email: tokenRow.calendar_email,
      lastSync: meta?.last_sync_at ?? undefined,
      syncStatus: meta?.sync_status ?? undefined,
    };
  }

  const health = await checkCalendarHealth(
    tokens.accessToken,
    tokens.refreshToken,
    tokens.calendarEmail,
  );

  return {
    connected: true,
    healthy: health.healthy,
    message: health.message,
    email: tokenRow.calendar_email,
    lastSync: meta?.last_sync_at ?? undefined,
    syncStatus: meta?.sync_status ?? undefined,
  };
}

export async function getUpcomingCalendarEvents() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return [];

  const tokens = await getInterviewerTokens(profile.id);
  if (!tokens) return [];

  try {
    return await listUpcomingEvents(
      tokens.accessToken,
      tokens.refreshToken,
      tokens.calendarEmail,
      20,
    );
  } catch {
    return [];
  }
}

export async function getInterviewerFreeSlots(interviewerId: string) {
  const tokens = await getInterviewerTokens(interviewerId);
  if (!tokens) return null;

  const { getFreeBusySlots } = await import('@/lib/google/calendar');
  return getFreeBusySlots(
    tokens.accessToken,
    tokens.refreshToken,
    tokens.calendarEmail,
    60,
    30,
  );
}

export async function getInterviewerCalendarStatus(interviewerId: string): Promise<{
  connected: boolean;
  email?: string;
  lastSync?: string;
  syncStatus?: string;
}> {
  const admin = createAdmin();
  const { data: tokenRow } = await admin
    .from('google_calendar_tokens')
    .select('calendar_email')
    .eq('profile_id', interviewerId)
    .maybeSingle();

  if (!tokenRow) return { connected: false };

  let meta: Record<string, string | null> | null = null;
  try {
    const { data: m } = await admin
      .from('google_calendar_tokens')
      .select('last_sync_at, sync_status')
      .eq('profile_id', interviewerId)
      .maybeSingle();
    meta = m as Record<string, string | null> | null;
  } catch {
    // migration columns don't exist yet
  }

  return {
    connected: true,
    email: tokenRow.calendar_email,
    lastSync: meta?.last_sync_at ?? undefined,
    syncStatus: meta?.sync_status ?? undefined,
  };
}

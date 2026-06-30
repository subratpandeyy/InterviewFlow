import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { CalendarPageClient } from '@/components/interviewer/calendar-page-client';
import { getInterviewerTokens, listUpcomingEvents, checkCalendarHealth, type CalendarEventData } from '@/lib/services/calendar.service';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return null;

  const admin = createAdmin();
  // Select calendar_email only (exists in all DB versions). Migration columns
  // (last_sync_at, sync_status, sync_error) are fetched separately if available.
  const { data: calendarToken } = await admin
    .from('google_calendar_tokens')
    .select('calendar_email')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const isConnected = !!calendarToken;

  let syncStatus: string | undefined;
  let syncError: string | undefined;
  let lastSyncAt: string | undefined;

  if (isConnected) {
    try {
      const { data: meta } = await admin
        .from('google_calendar_tokens')
        .select('last_sync_at, sync_status, sync_error')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (meta) {
        syncStatus = meta.sync_status;
        syncError = meta.sync_error;
        lastSyncAt = meta.last_sync_at;
      }
    } catch {
      // migration columns don't exist yet — that's fine
    }
  }

  let upcomingEvents: CalendarEventData[] = [];
  let isHealthy = false;
  let healthMessage = 'Not connected';

  if (isConnected) {
    const tokens = await getInterviewerTokens(profile.id);
    if (tokens) {
      try {
        upcomingEvents = await listUpcomingEvents(
          tokens.accessToken,
          tokens.refreshToken,
          tokens.calendarEmail,
          20,
        );

        const health = await checkCalendarHealth(
          tokens.accessToken,
          tokens.refreshToken,
          tokens.calendarEmail,
        );
        isHealthy = health.healthy;
        healthMessage = health.message;
      } catch (e) {
        isHealthy = false;
        healthMessage = `Calendar error: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      isHealthy = false;
      healthMessage = 'Failed to retrieve tokens. Try reconnecting.';
    }
  }

  return (
    <CalendarPageClient
      isConnected={isConnected}
      calendarEmail={calendarToken?.calendar_email}
      lastSyncAt={lastSyncAt}
      syncStatus={syncStatus}
      syncError={syncError}
      upcomingEvents={upcomingEvents}
      isHealthy={isHealthy}
      healthMessage={healthMessage}
    />
  );
}

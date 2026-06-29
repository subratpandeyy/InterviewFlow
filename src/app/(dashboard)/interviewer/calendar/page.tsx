import { createServer } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { CalendarPageClient } from '@/components/interviewer/calendar-page-client';
import { getInterviewerTokens } from '@/lib/google/tokens';
import { listUpcomingEvents, checkCalendarHealth, getFreeBusySlots, type CalendarEvent, type FreeBusySlot } from '@/lib/google/calendar';

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
  const { data: calendarToken } = await admin
    .from('google_calendar_tokens')
    .select('calendar_email, last_sync_at, sync_status, sync_error')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const isConnected = !!calendarToken;

  let upcomingEvents: CalendarEvent[] = [];
  let freeSlots: FreeBusySlot[] = [];
  let isHealthy = false;
  let healthMessage = 'Not connected';

  if (isConnected) {
    const tokens = await getInterviewerTokens(profile.id);
    if (tokens) {
      try {
        [upcomingEvents, freeSlots] = await Promise.all([
          listUpcomingEvents(
            tokens.accessToken,
            tokens.refreshToken,
            tokens.calendarEmail,
            20,
          ),
          getFreeBusySlots(
            tokens.accessToken,
            tokens.refreshToken,
            tokens.calendarEmail,
            60,
            30,
          ),
        ]);

        const health = await checkCalendarHealth(
          tokens.accessToken,
          tokens.refreshToken,
          tokens.calendarEmail,
        );
        isHealthy = health.healthy;
        healthMessage = health.message;
      } catch {
        isHealthy = false;
        healthMessage = 'Failed to fetch calendar data';
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
      lastSyncAt={calendarToken?.last_sync_at}
      syncStatus={calendarToken?.sync_status}
      syncError={calendarToken?.sync_error}
      upcomingEvents={upcomingEvents}
      freeSlots={freeSlots}
      isHealthy={isHealthy}
      healthMessage={healthMessage}
    />
  );
}

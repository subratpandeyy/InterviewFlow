import { createServer } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { disconnectGoogleCalendar } from '@/lib/actions/availability';
import { getAuthUrl } from '@/lib/google/oauth';

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; date?: string }>;
}) {
  const { connected, error } = await searchParams;
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user?.id)
    .single();

  if (!profile) return null;

  const { data: calendarToken } = await supabase
    .from('google_calendar_tokens')
    .select('calendar_email, updated_at')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const isConnected = !!calendarToken;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Availability</h1>

      {connected === 'true' && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-green-800 dark:text-green-300">
          Google Calendar connected successfully! Your availability will now be synced from Google Calendar.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-300">
          {error === 'google_auth_denied' && 'Google Calendar access was denied.'}
          {error === 'not_authenticated' && 'Please sign in to connect Google Calendar.'}
          {error === 'profile_not_found' && 'Profile not found.'}
          {error === 'missing_tokens' && 'Failed to retrieve tokens from Google.'}
          {error === 'save_failed' && 'Failed to save calendar connection.'}
          {error === 'auth_failed' && 'Authentication failed. Please try again.'}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Sync</CardTitle>
          <CardDescription>
            Connect your Google Calendar so candidates can book interviews based on your real-time availability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Connected</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {calendarToken.calendar_email} &mdash; last synced {new Date(calendarToken.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <form action={disconnectGoogleCalendar}>
                <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
                  Disconnect Google Calendar
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your availability will be fetched directly from Google Calendar. Candidates will see only times when you are free.
              </p>
              <a href={getAuthUrl(profile.id)}>
                <Button>Connect Google Calendar</Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

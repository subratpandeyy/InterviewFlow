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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your Google Calendar sync and interview availability</p>
      </div>

      {connected === 'true' && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          Google Calendar connected successfully! Your availability will now be synced from Google Calendar.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
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
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <div className="size-3 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Connected</p>
                  <p className="text-xs text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
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

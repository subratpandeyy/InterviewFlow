'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { syncCalendar, disconnectGoogleCalendarAction } from '@/lib/actions/calendar';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unlink,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface CalendarEvent {
  id?: string;
  hangoutLink?: string;
  summary?: string;
  start?: string;
  end?: string;
}

interface Props {
  isConnected: boolean;
  calendarEmail?: string;
  lastSyncAt?: string;
  syncStatus?: string;
  syncError?: string;
  upcomingEvents: CalendarEvent[];
  isHealthy: boolean;
  healthMessage: string;
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function CalendarPageClient({
  isConnected,
  calendarEmail,
  lastSyncAt,
  syncStatus,
  syncError,
  upcomingEvents,
  isHealthy,
  healthMessage,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncCalendar();
      toast.success('Calendar synced successfully');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectGoogleCalendarAction();
      toast.success('Google Calendar disconnected');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  const todayEvents = upcomingEvents.filter((e) => isToday(e.start));
  const upcomingOnly = upcomingEvents.filter((e) => !isToday(e.start));

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Google Calendar to manage your interview availability
          </p>
        </div>

        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">No Calendar Connected</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Connect your Google Calendar so candidates can book interviews based on your real-time availability.
                Your calendar becomes the single source of truth for when you&apos;re free.
              </p>
            </div>
            <a href="/auth/google/connect">
              <Button className="mt-2">
                <Calendar className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">Your Google Calendar integration and upcoming events</p>
      </div>

      {syncStatus === 'error' && syncError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Sync Error</p>
            <p>{syncError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isHealthy ? 'default' : 'destructive'}>
                {isHealthy ? 'Connected' : 'Issues Found'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Account</span>
              <span className="text-sm font-medium">{calendarEmail}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Last Synced</span>
              <span className="text-sm font-medium">
                {lastSyncAt ? formatDateTime(lastSyncAt) : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Calendar Health</span>
              <span className="text-sm text-muted-foreground">{healthMessage}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-muted-foreground" />
              Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Calendar className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No events today</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {todayEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div className="size-2 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.summary || 'Untitled Event'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(event.start)}
                      </p>
                      {event.hangoutLink && (
                        <a
                          href={event.hangoutLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="size-3" />
                          Join Meet
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>
            Your next {upcomingOnly.length} upcoming calendar events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingOnly.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Calendar className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcomingOnly.map((event) => (
                <div key={event.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="size-2 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.summary || 'Untitled Event'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(event.start)}
                      {event.end ? ` — ${formatDateTime(event.end)}` : ''}
                    </p>
                    {event.hangoutLink && (
                      <a
                        href={event.hangoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="size-3" />
                        Join Meet
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LoadingButton
          onClick={handleSync}
          loading={syncing}
          loadingText="Syncing..."
          variant="default"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </LoadingButton>
        <LoadingButton
          onClick={handleDisconnect}
          loading={disconnecting}
          loadingText="Disconnecting..."
          variant="outline"
          className="text-destructive hover:text-destructive"
        >
          <Unlink className="h-4 w-4 mr-2" />
          Disconnect Calendar
        </LoadingButton>
      </div>
    </div>
  );
}

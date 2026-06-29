'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CalendarConnection {
  profileId: string;
  fullName: string;
  email: string;
  googleEmail: string;
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  upcomingCount: number;
  freeSlotCount: number;
  nextFreeSlot: string | null;
}

interface Props {
  connections: CalendarConnection[];
}

export function CalendarConnections({ connections }: Props) {
  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Connections</CardTitle>
          <CardDescription>No interviewers have connected their calendars yet</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Interviewers need to connect their Google Calendar from their Calendar page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Connections</CardTitle>
        <CardDescription>
          Overview of interviewer Google Calendar connections ({connections.length})
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Interviewer</th>
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Google Email</th>
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Status</th>
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Free Slots</th>
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Next Free</th>
              <th className="text-left font-medium text-muted-foreground py-3 pr-4">Last Sync</th>
              <th className="text-left font-medium text-muted-foreground py-3">Events</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn) => (
              <tr key={conn.profileId} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium">{conn.fullName}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {conn.connected ? conn.googleEmail : '-'}
                </td>
                <td className="py-3 pr-4">
                  {conn.connected ? (
                    conn.syncStatus === 'error' ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="size-3" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="size-3" />
                        Connected
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="size-3" />
                      Not Connected
                    </Badge>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {conn.connected ? (
                    <span className="font-medium">{conn.freeSlotCount}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-muted-foreground text-xs">
                  {conn.nextFreeSlot ?? '-'}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {conn.lastSyncAt
                    ? new Date(conn.lastSyncAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </td>
                <td className="py-3">
                  {conn.connected ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="size-3 text-muted-foreground" />
                      {conn.upcomingCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

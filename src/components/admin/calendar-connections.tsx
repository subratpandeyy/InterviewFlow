'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Mail,
  Clock,
  Search,
} from 'lucide-react';

type ConnectionStatus = 'connected' | 'token_expired' | 'not_connected' | 'error';

interface CalendarConnectionMember {
  profileId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  googleEmail: string | null;
  lastSyncAt: string | null;
  syncStatus: string | null;
  connectionStatus: ConnectionStatus;
}

interface Props {
  connections: CalendarConnectionMember[];
}

type FilterValue = 'all' | 'connected' | 'not_connected' | 'expired';

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'connected', label: 'Connected' },
  { value: 'not_connected', label: 'Not Connected' },
  { value: 'expired', label: 'Expired' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  connected: { label: 'Connected', variant: 'success', icon: CheckCircle2 },
  token_expired: { label: 'Token Expired', variant: 'warning', icon: Clock },
  not_connected: { label: 'Not Connected', variant: 'outline', icon: XCircle },
  error: { label: 'Connection Error', variant: 'destructive', icon: AlertCircle },
};

export function CalendarConnections({ connections }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');

  const handleRefresh = useCallback(async (profileId: string) => {
    try {
      const { refreshConnectionStatus } = await import('@/lib/actions/admin');
      const result = await refreshConnectionStatus(profileId);
      if (result.success) {
        window.location.reload();
      }
    } catch {
      // silent
    }
  }, []);

  const handleRequestReconnect = useCallback(async (profileId: string) => {
    try {
      const { requestReconnection } = await import('@/lib/actions/admin');
      await requestReconnection(profileId);
    } catch {
      // silent
    }
  }, []);

  const connectedCount = connections.filter((c) => c.connectionStatus === 'connected').length;
  const expiredCount = connections.filter((c) => c.connectionStatus === 'token_expired').length;
  const notConnectedCount = connections.filter((c) => c.connectionStatus === 'not_connected').length;

  const filtered = connections.filter((conn) => {
    if (filter === 'connected' && conn.connectionStatus !== 'connected') return false;
    if (filter === 'not_connected' && conn.connectionStatus !== 'not_connected') return false;
    if (filter === 'expired' && conn.connectionStatus !== 'token_expired') return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesName = conn.fullName.toLowerCase().includes(q);
      const matchesEmail = conn.email.toLowerCase().includes(q);
      const matchesGoogle = conn.googleEmail?.toLowerCase().includes(q) ?? false;
      if (!matchesName && !matchesEmail && !matchesGoogle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Connections</CardTitle>
          <CardDescription>Interviewer Google Calendar connection status</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <Separator className="my-4" />

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No interviewers have connected their Google Calendar yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Interviewers can connect their calendar from their Calendar page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground py-3 pr-3">Interviewer</th>
                    <th className="text-left font-medium text-muted-foreground py-3 pr-3">Google Account</th>
                    <th className="text-left font-medium text-muted-foreground py-3 pr-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground py-3 pr-3">Last Synced</th>
                    <th className="text-right font-medium text-muted-foreground py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((conn) => {
                    const statusCfg = STATUS_CONFIG[conn.connectionStatus];
                    const StatusIcon = statusCfg.icon;
                    const initials = getInitials(conn.fullName);
                    return (
                      <tr key={conn.profileId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              {conn.avatarUrl ? (
                                <img src={conn.avatarUrl} alt="" className="aspect-square size-full rounded-full object-cover" />
                              ) : (
                                <AvatarFallback className="text-xs bg-accent/10 text-accent">{initials}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground text-sm">{conn.fullName}</p>
                              <p className="text-xs text-muted-foreground">{conn.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          {conn.googleEmail ? (
                            <span className="text-muted-foreground text-xs">{conn.googleEmail}</span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={statusCfg.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-xs text-muted-foreground">
                            {conn.lastSyncAt ? formatDate(conn.lastSyncAt) : 'Never'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg hover:bg-muted size-7 outline-none transition-colors">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleRefresh(conn.profileId)}>
                                <RefreshCw className="size-3.5" />
                                Refresh Status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRequestReconnect(conn.profileId)} disabled={conn.connectionStatus === 'connected'}>
                                <Mail className="size-3.5" />
                                Request Reconnection
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                <Eye className="size-3.5" />
                                View Details
                              </DropdownMenuItem>
                              {conn.lastSyncAt && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                    <Clock className="size-3.5" />
                                    Last sync: {formatDate(conn.lastSyncAt)}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CalendarConnectionsSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonStats />
      <div className="rounded-xl border border-border">
        <div className="p-6 pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64 mt-1.5" />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    </div>
  );
}

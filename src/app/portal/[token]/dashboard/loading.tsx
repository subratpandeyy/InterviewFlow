import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader><div className="h-5 w-36 animate-pulse rounded bg-muted" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <SkeletonTable rows={3} cols={7} />
      <Card>
        <CardHeader><div className="h-5 w-16 animate-pulse rounded bg-muted" /></CardHeader>
        <CardContent><div className="h-4 w-full animate-pulse rounded bg-muted" /></CardContent>
      </Card>
    </div>
  );
}

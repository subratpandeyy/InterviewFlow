import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function RecruiterDashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>
      <SkeletonStats />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonTable rows={5} cols={3} />
        <SkeletonTable rows={5} cols={3} />
      </div>
      <SkeletonTable rows={8} cols={4} />
    </div>
  );
}

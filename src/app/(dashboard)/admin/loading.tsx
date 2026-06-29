import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
      </div>
      <SkeletonStats />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonTable rows={5} cols={4} />
        <SkeletonTable rows={5} cols={4} />
      </div>
      <SkeletonTable rows={8} cols={4} />
    </div>
  );
}

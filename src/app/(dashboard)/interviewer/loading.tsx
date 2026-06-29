import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export default function InterviewerDashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <SkeletonStats />
      <SkeletonTable rows={5} cols={5} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

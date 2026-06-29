import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function UpcomingInterviewsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}

import { SkeletonTable } from '@/components/ui/skeleton';

export default function RecruiterPositionsLoading() {
  return <SkeletonTable rows={8} cols={4} />;
}

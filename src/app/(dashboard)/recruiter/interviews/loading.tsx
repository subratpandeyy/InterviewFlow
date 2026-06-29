import { SkeletonTable } from '@/components/ui/skeleton';

export default function RecruiterInterviewsLoading() {
  return <SkeletonTable rows={8} cols={6} />;
}

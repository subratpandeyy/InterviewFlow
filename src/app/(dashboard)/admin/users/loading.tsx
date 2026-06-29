import { SkeletonTable } from '@/components/ui/skeleton';

export default function AdminUsersLoading() {
  return <SkeletonTable rows={8} cols={4} />;
}

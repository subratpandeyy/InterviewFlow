import { Spinner } from '@/components/ui/spinner';

export default function PortalLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <Spinner size="lg" />
    </div>
  );
}

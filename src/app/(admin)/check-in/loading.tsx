import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

export default function CheckInLoading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={6} />
    </div>
  );
}

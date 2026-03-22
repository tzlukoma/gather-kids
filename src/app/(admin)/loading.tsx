import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

export default function AdminLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <CardGridSkeleton count={6} />
    </div>
  );
}

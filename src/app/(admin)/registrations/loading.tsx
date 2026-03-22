import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function RegistrationsLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

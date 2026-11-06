'use client';

import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { PermissionEmpty } from '@/components/ui/permission-empty';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { EventsAdmin } from '@/components/gatherKids/events-admin';

/**
 * Check-in events (#565). Admins only: the database refuses event writes from
 * anyone else whatever this page shows, so the gate here is about not showing
 * controls that cannot work.
 */
export default function EventsPage() {
	const { user, loading } = useAuth();

	if (loading) return <TableSkeleton rows={4} columns={4} />;

	if (!user || user.metadata?.role !== AuthRole.ADMIN) {
		return (
			<PermissionEmpty
				reason="restricted"
				title="Events are managed by administrators"
				description="Your account does not have access to add, rename, archive or delete check-in events."
				remedy="If you need access, ask an administrator to update your role."
			/>
		);
	}

	return <EventsAdmin />;
}

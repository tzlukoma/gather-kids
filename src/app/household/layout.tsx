import { ROLES } from '@/lib/constants/roles';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';

interface GuardianLayoutProps {
	children: React.ReactNode;
}

export default function GuardianLayout({ children }: GuardianLayoutProps) {
	return (
		<ProtectedRoute
			allowedRoles={[ROLES.GUARDIAN]}
			loadingComponent={<GuardianSkeleton />}>
			<div className="container mx-auto px-4 py-6">
				<h1 className="text-2xl font-bold mb-6">My Household</h1>
				{children}
			</div>
		</ProtectedRoute>
	);
}

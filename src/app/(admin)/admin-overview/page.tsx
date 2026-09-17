import { getGatherSystemAdminFlag } from '@/lib/flags/get-gathersystem-admin-flag';
import { AdminDashboardLegacy } from '@/components/gatherKids/admin-dashboard-legacy';
import { AdminDashboardGatherSystem } from '@/components/gatherKids/admin-dashboard-gathersystem';

export default async function Page() {
	const useGatherSystemDashboard = await getGatherSystemAdminFlag();

	return useGatherSystemDashboard ? (
		<AdminDashboardGatherSystem />
	) : (
		<AdminDashboardLegacy />
	);
}

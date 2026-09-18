import { AuthRole } from '@/lib/auth-types';
import { getGatherSystemDoorFlag } from '@/lib/flags/get-gathersystem-door-flag';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CheckInContentLegacy } from '@/components/gatherKids/check-in-content-legacy';
import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

export default async function Page() {
	const useGatherSystemDoor = await getGatherSystemDoorFlag();

	return (
		<ProtectedRoute
			allowedRoles={[AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN]}>
			{useGatherSystemDoor ? <CheckInContentGatherSystem /> : <CheckInContentLegacy />}
		</ProtectedRoute>
	);
}

// Re-exported for the existing page tests, which assert the gate through the
// route module. The evaluation itself lives in
// `src/lib/flags/get-gathersystem-door-flag.ts`.
export { getGatherSystemDoorFlag };

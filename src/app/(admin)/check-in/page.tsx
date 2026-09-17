import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';
import { AuthRole } from '@/lib/auth-types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CheckInContentLegacy } from '@/components/gatherKids/check-in-content-legacy';
import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

/**
 * Server-side gate for the GatherSystem door surface (`gathersystem_door`).
 *
 * Previously this had its own copy of the evaluation logic and was **missing
 * the no-session guard**, so with the flag enabled an unauthenticated request
 * could be bucketed under the shared anonymous distinct id and served the new
 * UI. It now shares `getGatherSystemFlag`, which fails closed.
 */
async function getGatherSystemDoorFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_door');
}

export default async function Page() {
	const useGatherSystemDoor = await getGatherSystemDoorFlag();

	return (
		<ProtectedRoute
			allowedRoles={[AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN]}>
			{useGatherSystemDoor ? <CheckInContentGatherSystem /> : <CheckInContentLegacy />}
		</ProtectedRoute>
	);
}

export { getGatherSystemDoorFlag };

import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';
import { AuthRole } from '@/lib/auth-types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CheckInContentLegacy } from '@/components/gatherKids/check-in-content-legacy';
import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

async function getGatherSystemDoorFlag(): Promise<boolean> {
	try {
		const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
		if (!canEvaluateFlags) {
			return false;
		}

		return await getBoolean('gathersystem_door', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_door flag:', error);
		return false;
	}
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

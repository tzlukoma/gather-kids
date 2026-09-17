import 'server-only';

import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';

/**
 * Server-side gate for the GatherSystem incidents surface
 * (`gathersystem_incidents`). Fails closed to the legacy UI: missing Supabase
 * env, no session, or a flag-provider error all return `false`.
 *
 * Mirrors `getGatherSystemAdminFlag`. The flag never widens who can see or
 * acknowledge an incident — `getIncidentsForUser` and the ADMIN check on the
 * acknowledge action are the authorization boundary and are identical on both
 * the legacy and GatherSystem paths.
 */
export async function getGatherSystemIncidentsFlag(): Promise<boolean> {
	try {
		const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
		if (!canEvaluateFlags) {
			return false;
		}

		// `canEvaluateFlags` only reports that Supabase public env exists, so it
		// is still true when `getUser()` found no session. Evaluating here would
		// bucket the request under the shared `<env>:anonymous` distinct id, and
		// a globally enabled flag would then select the new UI for an
		// unauthenticated request. No session, legacy.
		if (!userId) {
			return false;
		}

		return await getBoolean('gathersystem_incidents', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_incidents flag:', error);
		return false;
	}
}

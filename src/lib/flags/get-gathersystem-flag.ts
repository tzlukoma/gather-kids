import 'server-only';

import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';
import type { GatherSystemFlagKey } from '@/lib/flags/env';

/**
 * Evaluate a GatherSystem kill switch on the server, failing closed to legacy.
 *
 * Returns `false` for missing Supabase env, **no session**, or a provider
 * error. The no-session guard is the load-bearing one and the reason this is
 * shared rather than copied: `canEvaluateFlags` only reports that the public
 * Supabase env exists, so it stays true when `getUser()` found no session, and
 * `buildFlagDistinctId(undefined)` then buckets the request under a shared
 * `<env>:anonymous` distinct id. A globally enabled flag would hand the new UI
 * to an unauthenticated request. Each surface having its own copy of this is
 * how the door helper was left without it.
 *
 * Flags never widen authorization. They select a rendering; the route guards
 * and role checks are unchanged on both paths.
 *
 * Only for surfaces that require a session. `/register` deliberately serves
 * signed-out visitors and evaluates `gathersystem_registration` on its own, so
 * it must NOT adopt the no-session guard — doing so would gate the wizard shut
 * for exactly the people it exists for.
 */
export async function getGatherSystemFlag(
	key: GatherSystemFlagKey
): Promise<boolean> {
	try {
		const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
		if (!canEvaluateFlags) {
			return false;
		}

		if (!userId) {
			return false;
		}

		return await getBoolean(key, false, { userId, role });
	} catch (error) {
		console.error(`Failed to evaluate ${key} flag:`, error);
		return false;
	}
}

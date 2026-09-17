import 'server-only';

import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';

/**
 * Server-side gate for the GatherSystem staff shell + admin overview
 * (`gathersystem_admin`). Fails closed to the legacy UI: missing Supabase
 * env, no session, or a flag-provider error all return `false`.
 *
 * Shared by `src/app/(admin)/layout.tsx` and
 * `src/app/(admin)/admin-overview/page.tsx` so both surfaces flip together.
 */
export async function getGatherSystemAdminFlag(): Promise<boolean> {
	try {
		const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
		if (!canEvaluateFlags) {
			return false;
		}

		return await getBoolean('gathersystem_admin', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_admin flag:', error);
		return false;
	}
}

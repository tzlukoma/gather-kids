import 'server-only';

import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';

/**
 * Server-only gate for the signed-out account-entry journey. Anonymous
 * requests deliberately use the shared deploy-environment distinct id; this
 * flag must therefore be configured as 0% or 100% per deploy environment.
 */
export async function getGatherSystemAccountEntryFlag(): Promise<boolean> {
	try {
		const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
		if (!canEvaluateFlags) return false;

		return await getBoolean('gathersystem_account_entry', false, {
			userId,
			role,
		});
	} catch (error) {
		console.error('Failed to evaluate gathersystem_account_entry flag:', error);
		return false;
	}
}

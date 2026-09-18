import 'server-only';

import {
	shouldUseRemoteFlags,
	type FlagEvalContext,
	type FlagKey,
} from '@/lib/flags/env';
import {
	createPostHogFlagAdapter,
	getSharedPostHogFlagsClient,
} from '@/lib/flags/posthog-adapter';
import { isLocalFlagOverrideEnabled } from '@/lib/flags/local-flag-overrides';
import type { FlagAdapter } from '@/lib/flags/types';

export {
	GATHERSYSTEM_FLAG_KEYS,
	buildFlagDistinctId,
	buildFlagPersonProperties,
	getFlagsDeployEnv,
	shouldUseRemoteFlags,
	type FlagEvalContext,
	type FlagKey,
	type GatherSystemFlagKey,
} from '@/lib/flags/env';
export {
	getFlagEvalContext,
	type FlagServerEvalContext,
} from '@/lib/flags/get-flag-eval-context';
export type { FlagAdapter } from '@/lib/flags/types';

/**
 * Used whenever remote flags are unavailable — always in development and test,
 * and in any deployment without a usable PostHog client.
 *
 * Returns each flag's default, which keeps GatherSystem off, EXCEPT for keys
 * explicitly listed in `GATHERSYSTEM_LOCAL_FLAGS`. That override is refused
 * outright in production and UAT by `isLocalFlagOverrideEnabled`, which asks the
 * environment directly rather than assuming this adapter implies a local run —
 * `getDefaultFlagAdapter` can select it in production when the client is
 * missing. See `src/lib/flags/local-flag-overrides.ts`.
 */
const localAdapter: FlagAdapter = {
	async getBoolean(key, defaultValue) {
		if (isLocalFlagOverrideEnabled(key)) return true;
		return defaultValue;
	},
	async getVariant(_key, defaultValue) {
		return defaultValue;
	},
};

export function createFlagEvaluator(adapter?: FlagAdapter): {
	getBoolean: typeof getBoolean;
	getVariant: typeof getVariant;
} {
	const resolved = adapter ?? getDefaultFlagAdapter();
	return {
		getBoolean(key, defaultValue, context) {
			return resolved.getBoolean(key, defaultValue, context ?? {});
		},
		getVariant(key, defaultValue, context) {
			return resolved.getVariant(key, defaultValue, context ?? {});
		},
	};
}

function getDefaultFlagAdapter(): FlagAdapter {
	if (!shouldUseRemoteFlags()) return localAdapter;
	const client = getSharedPostHogFlagsClient();
	if (!client) return localAdapter;
	return createPostHogFlagAdapter(client);
}

/**
 * Server-side boolean flag. Defaults keep GatherSystem **off** (legacy UI).
 * Call from RSC / route handlers only — this module imports `server-only`.
 */
export async function getBoolean(
	key: FlagKey,
	defaultValue: boolean,
	context: FlagEvalContext = {}
): Promise<boolean> {
	return createFlagEvaluator().getBoolean(key, defaultValue, context);
}

/**
 * Server-side multivariate flag. Missing/failed evaluation returns `defaultValue`.
 */
export async function getVariant(
	key: FlagKey,
	defaultValue: string,
	context: FlagEvalContext = {}
): Promise<string> {
	return createFlagEvaluator().getVariant(key, defaultValue, context);
}

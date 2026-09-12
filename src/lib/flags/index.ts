import {
	shouldUseRemoteFlags,
	type FlagEvalContext,
	type FlagKey,
} from '@/lib/flags/env';
import {
	createPostHogFlagAdapter,
	getSharedPostHogFlagsClient,
} from '@/lib/flags/posthog-adapter';
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
export type { FlagAdapter } from '@/lib/flags/types';

const localAdapter: FlagAdapter = {
	async getBoolean(_key, defaultValue) {
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
 * Call from RSC / route handlers; do not import this into client components.
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

import { PostHog } from 'posthog-node';
import type { FlagAdapter } from '@/lib/flags/types';
import {
	buildFlagDistinctId,
	buildFlagPersonProperties,
	getPostHogHost,
	getPostHogProjectToken,
	type FlagEvalContext,
} from '@/lib/flags/env';

export type FlagSnapshot = {
	isEnabled(key: string, options?: { defaultValue?: boolean }): boolean;
	getFlag(key: string): string | boolean | undefined;
};

export type PostHogFlagsClient = {
	evaluateFlags(
		distinctId: string,
		options?: {
			personProperties?: Record<string, string>;
			flagKeys?: string[];
			disableGeoip?: boolean;
		}
	): Promise<FlagSnapshot>;
};

let sharedClient: PostHog | null = null;

export function getSharedPostHogFlagsClient(): PostHogFlagsClient | null {
	const token = getPostHogProjectToken();
	const host = getPostHogHost();
	if (!token || !host) return null;

	if (!sharedClient) {
		sharedClient = new PostHog(token, {
			host,
			disableGeoip: true,
			sendFeatureFlagEvent: false,
			enableLocalEvaluation: false,
		});
	}

	return sharedClient;
}

export function createPostHogFlagAdapter(client: PostHogFlagsClient): FlagAdapter {
	return {
		async getBoolean(key, defaultValue, context) {
			try {
				const snapshot = await evaluate(client, key, context);
				return snapshot.isEnabled(key, { defaultValue });
			} catch {
				return defaultValue;
			}
		},
		async getVariant(key, defaultValue, context) {
			try {
				const snapshot = await evaluate(client, key, context);
				const value = snapshot.getFlag(key);
				return typeof value === 'string' && value.length > 0
					? value
					: defaultValue;
			} catch {
				return defaultValue;
			}
		},
	};
}

async function evaluate(
	client: PostHogFlagsClient,
	key: string,
	context: FlagEvalContext
): Promise<FlagSnapshot> {
	return client.evaluateFlags(buildFlagDistinctId(context.userId), {
		flagKeys: [key],
		disableGeoip: true,
		personProperties: buildFlagPersonProperties(context.role),
	});
}

/**
 * Shared Sentry sampling and Replay policy.
 *
 * Product decision (Thomas, 2026-08-30): Replay stays on, but only for
 * sessions that error. Trace sampling stays well below 1.0 in production
 * so the Developer (free) quota is not burned. enableLogs stays off.
 */

export const SENTRY_TRACES_SAMPLE_RATE_PRODUCTION = 0.05;
export const SENTRY_TRACES_SAMPLE_RATE_UAT = 0.2;
/** Used only if Sentry is initialized locally; today init is production-only. */
export const SENTRY_TRACES_SAMPLE_RATE_DEV = 1;

export const SENTRY_ENABLE_LOGS = false;

export const SENTRY_REPLAYS_SESSION_SAMPLE_RATE = 0;
export const SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = 1.0;

/** Default Replay masking, set explicitly so it cannot silently change. */
export const SENTRY_REPLAY_MASKING = {
	maskAllText: true,
	maskAllInputs: true,
	blockAllMedia: true,
} as const;

type EnvLike = Record<string, string | undefined>;

export type SentrySamplingInput = {
	env?: EnvLike;
	/** Sentry `environment` or deploy env. `uat` uses the UAT trace rate. */
	environment?: string | null;
};

function readEnv(env: EnvLike, key: string): string {
	return (env[key] ?? '').trim();
}

function resolveEnvironment(input: SentrySamplingInput): string {
	const env = input.env ?? process.env;
	return (
		input.environment ??
		readEnv(env, 'NEXT_PUBLIC_DEPLOY_ENV') ??
		''
	)
		.trim()
		.toLowerCase();
}

export function isUatDeploy(input: SentrySamplingInput = {}): boolean {
	return resolveEnvironment(input) === 'uat';
}

/**
 * Production ~5%, UAT 20%. Not 1.0 in production.
 * Local/dev may stay at 1.0 if Sentry is ever initialized there.
 */
export function getTracesSampleRate(input: SentrySamplingInput = {}): number {
	const env = input.env ?? process.env;
	const environment = resolveEnvironment(input);

	if (environment === 'uat') {
		return SENTRY_TRACES_SAMPLE_RATE_UAT;
	}

	if (
		environment === 'development' ||
		environment === 'dev' ||
		readEnv(env, 'NODE_ENV') === 'development'
	) {
		return SENTRY_TRACES_SAMPLE_RATE_DEV;
	}

	return SENTRY_TRACES_SAMPLE_RATE_PRODUCTION;
}

export function getSharedSentryRuntimeOptions(input: SentrySamplingInput = {}) {
	return {
		tracesSampleRate: getTracesSampleRate(input),
		enableLogs: SENTRY_ENABLE_LOGS,
	};
}

export function getClientReplaySampleRates() {
	return {
		replaysSessionSampleRate: SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
		replaysOnErrorSampleRate: SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
	};
}

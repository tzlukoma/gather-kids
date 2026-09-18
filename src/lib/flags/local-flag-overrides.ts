import {
	GATHERSYSTEM_FLAG_KEYS,
	getFlagsDeployEnv,
	type FlagKey,
	type GatherSystemFlagKey,
} from '@/lib/flags/env';

/**
 * Local-only escape hatch that lets a GatherSystem flag be forced on in
 * development, so flag-gated screens can be rendered, screenshotted and
 * e2e-tested before they are enabled anywhere real.
 *
 * Without this there is no way to see a GatherSystem screen locally at all:
 * `shouldUseRemoteFlags()` is false whenever `NODE_ENV` is `development` or
 * `test`, so the local adapter is always used, and it returns each flag's
 * default — which is `false` for every GatherSystem gate.
 *
 * ## Why the guard is an explicit environment check
 *
 * `getDefaultFlagAdapter()` falls back to the local adapter when the PostHog
 * client is missing, and that fallback is reachable **in production** (a
 * missing or misconfigured project token is enough). So "we are running on the
 * local adapter" does NOT imply "we are running locally", and this module must
 * never infer permission from which adapter is in play. It asks the
 * environment directly and refuses production and UAT by name.
 *
 * Same shape as `isGatherSystemRegistrationOverrideEnabled`, generalised to all
 * six keys. That one predates this and stays in place: `/register` consumes it
 * outside the adapter because it serves signed-out visitors, and
 * `npm run test:e2e:gathersystem` depends on it.
 */

type Env = Record<string, string | undefined>;

/** The env var holding a comma-separated allowlist of flags to force on. */
export const LOCAL_FLAG_OVERRIDES_ENV_VAR = 'GATHERSYSTEM_LOCAL_FLAGS';

const KNOWN_KEYS: ReadonlySet<string> = new Set(GATHERSYSTEM_FLAG_KEYS);

/** Deploy environments where an override is never honoured, whatever is set. */
const FORBIDDEN_DEPLOY_ENVS: ReadonlySet<string> = new Set([
	'production',
	'uat',
]);

const EMPTY: ReadonlySet<GatherSystemFlagKey> = new Set();

function readEnv(override?: Env): Env {
	if (override) return override;
	return {
		NODE_ENV: process.env.NODE_ENV,
		[LOCAL_FLAG_OVERRIDES_ENV_VAR]: process.env.GATHERSYSTEM_LOCAL_FLAGS,
	};
}

/**
 * Whether this environment may honour local flag overrides at all.
 *
 * Deliberately refuses on two independent signals, because they can disagree:
 * `NODE_ENV` is set by the build/runtime, while the deploy env comes from
 * `NEXT_PUBLIC_DEPLOY_ENV` / `VERCEL_ENV`. A production deployment built with a
 * non-production `NODE_ENV`, or a preview build pointed at UAT, must be refused
 * by whichever signal catches it.
 */
export function areLocalFlagOverridesAllowed(env?: Env): boolean {
	const source = readEnv(env);

	if (source.NODE_ENV === 'production') return false;

	const deployEnv = getFlagsDeployEnv(env)?.trim().toLowerCase();
	if (deployEnv && FORBIDDEN_DEPLOY_ENVS.has(deployEnv)) return false;

	return true;
}

/**
 * Parse the allowlist. Unknown or misspelled keys are dropped silently rather
 * than throwing or matching loosely: a typo must not enable a different flag,
 * and must not break a dev server on boot.
 */
export function parseLocalFlagOverrides(
	raw: string | undefined
): ReadonlySet<GatherSystemFlagKey> {
	if (!raw) return EMPTY;

	const keys = new Set<GatherSystemFlagKey>();
	for (const part of raw.split(',')) {
		const candidate = part.trim();
		if (!candidate) continue;
		if (KNOWN_KEYS.has(candidate)) {
			keys.add(candidate as GatherSystemFlagKey);
		}
	}
	return keys;
}

/** The set of flags forced on in this environment. Empty unless permitted. */
export function getLocalFlagOverrides(
	env?: Env
): ReadonlySet<GatherSystemFlagKey> {
	if (!areLocalFlagOverridesAllowed(env)) return EMPTY;
	const source = readEnv(env);
	return parseLocalFlagOverrides(source[LOCAL_FLAG_OVERRIDES_ENV_VAR]);
}

/** Whether this specific flag is forced on locally. */
export function isLocalFlagOverrideEnabled(key: FlagKey, env?: Env): boolean {
	// Redundant with the filter in `parseLocalFlagOverrides` — an unknown key can
	// never be in the set — and kept as depth so a future change to parsing
	// cannot widen what this answers `true` for. Removing it does not change
	// behaviour today, so no test pins it.
	if (!KNOWN_KEYS.has(key)) return false;
	return getLocalFlagOverrides(env).has(key as GatherSystemFlagKey);
}

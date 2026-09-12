type Env = Record<string, string | undefined>;

export const GATHERSYSTEM_FLAG_KEYS = [
	'gathersystem_door',
	'gathersystem_guardian',
	'gathersystem_bible_bee_household',
] as const;

export type GatherSystemFlagKey = (typeof GATHERSYSTEM_FLAG_KEYS)[number];

export type FlagKey = GatherSystemFlagKey | (string & {});

export type FlagEvalContext = {
	/** Opaque Supabase auth uuid. Never pass email or name. */
	userId?: string | null;
	role?: string | null;
};

function envValue(value: string | undefined): string | undefined {
	if (value === undefined || value.trim() === '') return undefined;
	return value;
}

/**
 * Static `process.env.NEXT_PUBLIC_*` reads so Next.js inlines them. Do not pass
 * `process.env` as an object. Do not read `process.env.CI` here: Vercel sets
 * `CI=true` at build time.
 */
function readFlagsEnv(override?: Env): Env {
	if (override) return override;
	return {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_DEPLOY_ENV: process.env.NEXT_PUBLIC_DEPLOY_ENV,
		VERCEL_ENV: process.env.VERCEL_ENV,
		NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
			process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	};
}

export function getFlagsDeployEnv(env?: Env): string {
	const source = readFlagsEnv(env);
	return (
		envValue(source.NEXT_PUBLIC_DEPLOY_ENV) ||
		envValue(source.VERCEL_ENV) ||
		'development'
	);
}

export function getPostHogProjectToken(env?: Env): string | undefined {
	const source = readFlagsEnv(env);
	return envValue(source.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
}

export function getPostHogHost(env?: Env): string | undefined {
	const source = readFlagsEnv(env);
	return envValue(source.NEXT_PUBLIC_POSTHOG_HOST);
}

export function shouldUseRemoteFlags(env?: Env): boolean {
	const source = readFlagsEnv(env);
	if (source.NODE_ENV === 'test' || source.NODE_ENV === 'development') {
		return false;
	}

	const deployEnv = getFlagsDeployEnv(source);
	if (deployEnv !== 'uat' && deployEnv !== 'production') return false;

	return Boolean(getPostHogProjectToken(source) && getPostHogHost(source));
}

export function buildFlagDistinctId(
	userId: string | null | undefined,
	env?: Env
): string {
	const deployEnv = getFlagsDeployEnv(env);
	const opaqueId = envValue(userId ?? undefined);
	if (!opaqueId || opaqueId.includes('@')) {
		return `${deployEnv}:anonymous`;
	}
	return `${deployEnv}:${opaqueId}`;
}

export function buildFlagPersonProperties(
	role: string | null | undefined,
	env?: Env
): Record<string, string> {
	const properties: Record<string, string> = {
		deploy_env: getFlagsDeployEnv(env),
	};
	const trimmedRole = envValue(role ?? undefined);
	if (trimmedRole) properties.role = trimmedRole;
	return properties;
}

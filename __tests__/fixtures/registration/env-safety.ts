import {
	BLOCKED_SUPABASE_PROJECT_REFS,
} from './constants';

export type RegistrationEnvLike = {
	SUPABASE_URL?: string;
	NEXT_PUBLIC_SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function resolveSupabaseUrl(env: RegistrationEnvLike): string {
	return (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
}

/**
 * True when the URL's hostname is an exact local disposable host.
 * Rejects deceptive hosts such as `localhost.attacker.example` or
 * query strings that merely contain `127.0.0.1`.
 */
export function isDisposableRegistrationSupabaseUrl(url: string): boolean {
	if (!url) return false;

	let hostname: string;
	try {
		hostname = new URL(url).hostname.toLowerCase();
	} catch {
		return false;
	}

	// IPv6 URL hostnames may be wrapped in brackets.
	const normalized =
		hostname.startsWith('[') && hostname.endsWith(']')
			? hostname.slice(1, -1)
			: hostname;

	if (!LOCAL_HOSTNAMES.has(normalized)) {
		return false;
	}

	const lower = url.toLowerCase();
	if (
		BLOCKED_SUPABASE_PROJECT_REFS.some((ref) => lower.includes(ref.toLowerCase()))
	) {
		return false;
	}

	return true;
}

/**
 * Throws if registration tests would run against UAT, production, or a missing URL.
 * Call from E2E/Jest setup before any admin client or seed that mutates data.
 */
export function assertDisposableRegistrationEnv(
	env: RegistrationEnvLike | NodeJS.ProcessEnv = process.env
): void {
	const url = resolveSupabaseUrl(env as RegistrationEnvLike);
	if (!url) {
		throw new Error(
			'Registration fixtures require SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for a disposable local stack.'
		);
	}
	if (!isDisposableRegistrationSupabaseUrl(url)) {
		throw new Error(
			`Registration fixtures refuse non-disposable Supabase URL (UAT/production blocked): ${url}`
		);
	}
}

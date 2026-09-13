import {
	BLOCKED_SUPABASE_PROJECT_REFS,
	DISPOSABLE_SUPABASE_HOST_PATTERN,
} from './constants';

export type RegistrationEnvLike = {
	SUPABASE_URL?: string;
	NEXT_PUBLIC_SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
};

function resolveSupabaseUrl(env: RegistrationEnvLike): string {
	return (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
}

/**
 * True when the URL points at a disposable local Supabase stack.
 * UAT and production project refs are never disposable for registration tests.
 */
export function isDisposableRegistrationSupabaseUrl(url: string): boolean {
	if (!url) return false;
	const lower = url.toLowerCase();
	if (
		BLOCKED_SUPABASE_PROJECT_REFS.some((ref) => lower.includes(ref.toLowerCase()))
	) {
		return false;
	}
	return DISPOSABLE_SUPABASE_HOST_PATTERN.test(lower);
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

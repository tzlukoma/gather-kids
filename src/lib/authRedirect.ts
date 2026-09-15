import { getBaseUrl } from "./baseUrl";

const SAFE_POST_AUTH_BASE = 'https://placeholder.invalid';

/**
 * Accept only same-origin relative paths for post-auth redirects.
 * Parsed with the same URL rules browsers apply to avoid open redirects.
 */
export function resolveSafePostAuthPath(
	nextParam: string | null | undefined,
	fallback: string
): string {
	if (!nextParam) return fallback;
	try {
		const url = new URL(nextParam, SAFE_POST_AUTH_BASE);
		if (url.origin !== SAFE_POST_AUTH_BASE) return fallback;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}

/** Append a query param to an already-sanitized internal post-auth path. */
export function appendSafePostAuthSearchParam(
	path: string,
	key: string,
	value: string
): string {
	try {
		const url = new URL(path, SAFE_POST_AUTH_BASE);
		if (url.origin !== SAFE_POST_AUTH_BASE) return path;
		url.searchParams.set(key, value);
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return path;
	}
}

/** Where a family lands after confirming a newly created account. */
export const POST_ACCOUNT_CREATION_PATH = '/register';

/**
 * Build the `emailRedirectTo` for account-creation confirmation emails.
 *
 * Deliberately carries NO query string. Supabase validates `redirect_to`
 * against the project's redirect allowlist and silently falls back to
 * SITE_URL on a miss. Preview entries have been path-only
 * (`https://*.vercel.app/auth/callback`), so appending `?next=/register` made
 * every preview confirmation land on SITE_URL — a stale UAT domain — instead
 * of the app.
 *
 * The destination is resolved after sign-in instead: see the role-aware
 * fallback in src/app/auth/callback/page.tsx, which sends a guardian who still
 * needs the active cycle to POST_ACCOUNT_CREATION_PATH and leaves staff on
 * their own landing page.
 *
 * Before reintroducing an explicit `next`, confirm every deployment target has
 * an allowlist entry ending in `/**` — a path-only entry will not match it.
 */
export function buildAccountCreationRedirectUrl(origin: string): string {
	return `${origin}/auth/callback`;
}

/**
 * Get the redirect URL for Supabase auth callbacks
 * This ensures preview deployments use their own URL for redirects
 * and handles both development and production environments properly
 */
export const getAuthRedirectTo = (nextPath?: string | null): string => {
  const baseUrl = getBaseUrl();
  const callbackPath = '/auth/callback';
  const safeNext = resolveSafePostAuthPath(nextPath, '/household');
  const fullUrl = `${baseUrl}${callbackPath}?next=${encodeURIComponent(safeNext)}`;
  
  // Log the redirect URL for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth redirect URL:', fullUrl);
  }
  
  return fullUrl;
};

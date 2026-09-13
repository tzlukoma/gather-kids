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

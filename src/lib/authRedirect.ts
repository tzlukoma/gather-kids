import { getBaseUrl } from "./baseUrl";

/**
 * Accept only same-origin relative paths for post-auth redirects.
 */
export function resolveSafePostAuthPath(
	nextParam: string | null | undefined,
	fallback: string
): string {
	if (!nextParam || !nextParam.startsWith('/') || nextParam.startsWith('//')) {
		return fallback;
	}
	if (nextParam.includes('://')) {
		return fallback;
	}
	return nextParam;
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
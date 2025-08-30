import { getBaseUrl } from "./baseUrl";

/**
 * Get the redirect URL for Supabase auth callbacks
 * This ensures preview deployments use their own URL for redirects
 */
export const getAuthRedirectTo = (): string => {
  return `${getBaseUrl()}/auth/callback`;
};
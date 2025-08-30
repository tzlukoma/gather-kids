import { getBaseUrl } from "./baseUrl";

/**
 * Get the redirect URL for Supabase auth callbacks
 * This ensures preview deployments use their own URL for redirects
 * and handles both development and production environments properly
 */
export const getAuthRedirectTo = (): string => {
  const baseUrl = getBaseUrl();
  const callbackPath = '/auth/callback';
  const fullUrl = `${baseUrl}${callbackPath}`;
  
  // Log the redirect URL for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth redirect URL:', fullUrl);
  }
  
  return fullUrl;
};
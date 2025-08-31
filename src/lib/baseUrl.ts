/**
 * Get the base URL for the application, aware of preview deployments
 * This handles Vercel preview deployments by using VERCEL_URL when available
 */
export function getBaseUrl(): string {
  // Client side - use the current window location
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  // Server side - check for Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback to configured site URL or localhost
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:9002";
}
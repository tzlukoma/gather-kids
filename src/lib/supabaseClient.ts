import { createBrowserClient } from '@supabase/ssr';

/**
 * Next.js-compatible storage adapter for Supabase Auth
 * Based on Supabase docs: uses localStorage for persistence across tabs and sessions
 */
class NextJSStorage implements Storage {
  get length(): number {
    if (typeof window === 'undefined') return 0;
    return localStorage.length;
  }

  key(index: number): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.key(index);
  }

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
}

/**
 * Create a Supabase client for browser usage with auth support
 * Uses localStorage-based storage for cross-tab magic link compatibility
 * Based on Supabase Next.js documentation patterns
 */
export const supabaseBrowser = () => {
  // Check if we're in a test environment
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  // Use dummy values for testing to avoid the "URL and API key required" error
  const supabaseUrl = isTestEnv ? 'https://test.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = isTestEnv ? 'test-anon-key' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Check if we're in a Vercel preview environment
  const isVercelPreview = 
    typeof window !== 'undefined' && 
    window.location.hostname.includes('vercel.app');
  
  // Create the client with appropriate configuration
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Only the callback page should parse the URL
        flowType: 'pkce',
        storage: new NextJSStorage(),
        // Additional error logging for vercel preview environments
        ...(isVercelPreview && {
          debug: true,
          onAuthStateChange: (event: string, session: unknown) => {
            console.log(`[Vercel Preview] Auth state change: ${event}`, session);
          }
        })
      },
    }
  );
};

// Lazily create the browser client. Avoid instantiating at module load time
// (which can happen during SSR) because the server-created client may not
// include browser-only helpers like `getSessionFromUrl`.
let _supabase: ReturnType<typeof supabaseBrowser> | null = null;
export const supabase = (() => {
  // In test environment, we want to create a client even if window is undefined
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  if (typeof window === 'undefined' && !isTestEnv) return null as any;
  if (!_supabase) _supabase = supabaseBrowser();
  return _supabase;
})();

// production: no dev exports or compatibility helpers — use native helpers from the
// Supabase browser client (createBrowserClient) which includes getSessionFromUrl.

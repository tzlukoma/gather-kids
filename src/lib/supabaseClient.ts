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
  const supabaseUrl = isTestEnv ? 'https://test.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = isTestEnv ? 'test-anon-key' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if we have valid Supabase configuration
  if (!isTestEnv && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('❌ Supabase configuration missing:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseAnonKey: supabaseAnonKey ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    });
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }

  // Check if we're in a Vercel preview environment
  const isVercelPreview = 
    typeof window !== 'undefined' && 
    window.location.hostname.includes('vercel.app');
  
  // Create the client with appropriate configuration
  // Create client config with localStorage-based storage for cross-tab compatibility
  const clientOptions = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // For the callback page, we DO want to detect the code in the URL
      detectSessionInUrl: window?.location?.pathname === '/auth/callback',
      flowType: 'pkce' as const, // Type assertion to fix TS error
      storage: new NextJSStorage(),
      // Additional debugging for all environments to help troubleshoot
      debug: true,
      onAuthStateChange: (event: string, session: unknown) => {
        console.log(`[Auth Debug] Auth state change: ${event}`, 
          isVercelPreview ? 'Vercel Preview Environment' : 'Standard Environment');
      }
    },
  };

  // Create and return the client
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    clientOptions
  );
};

// Lazily create the browser client. Avoid instantiating at module load time
// (which can happen during SSR) because the server-created client may not
// include browser-only helpers like `getSessionFromUrl`.
let _supabase: ReturnType<typeof supabaseBrowser> | null = null;
// Exported with a non-null assertion cast to satisfy calling sites that expect a client
// Runtime behavior unchanged: may still be null during SSR, but most callers are browser-only.
const _maybeSupabase = (() => {
  // In test environment, we want to create a client even if window is undefined
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  if (typeof window === 'undefined' && !isTestEnv) return null;
  if (!_supabase) _supabase = supabaseBrowser();
  return _supabase;
})();

// Export `supabase` as a non-null client type for convenience in browser-only modules.
// Callers should ensure they're running in a browser context; this cast keeps call sites concise.
export const supabase = _maybeSupabase as unknown as ReturnType<typeof supabaseBrowser>;

// Backwards-compatible alias
export const supabaseClient = supabase;

/**
 * Helper function to explicitly handle PKCE auth flow code exchange
 * Used in the auth callback page
 * 
 * This enhanced version includes additional checks for partial success cases and
 * attempts recovery when possible.
 */
export const handlePKCECodeExchange = async (code: string) => {
  try {
    // Log debug info
    console.log('PKCE debugging info:');
    console.log('- Auth callback URL:', window.location.href);
    
    // Check if we have a code verifier in storage
    const codeVerifier = localStorage.getItem('supabase.auth.token.code_verifier');
    console.log('- Code verifier exists:', !!codeVerifier);
    
    // Log storage info
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      allKeys.push(key);
    }
    console.log('- All localStorage keys:', allKeys);
    
    // Check for Supabase auth tokens that would indicate a previous successful auth
    const hasSupabaseTokens = allKeys.some(key => key && key.startsWith('sb-'));
    console.log('- Has existing Supabase tokens:', hasSupabaseTokens);

    // Check if we might already be signed in (this could happen if auth worked but callback handling failed)
    const client = supabase;
    if (!client) throw new Error('Supabase client not available in this environment');
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session) {
      console.log('- Already have active session:', sessionData.session.user.id);
      return { data: sessionData, error: null };
    }
    
    // If we have tokens but no session, try to refresh the session first
    if (hasSupabaseTokens && !sessionData?.session) {
      console.log('- Found tokens but no session, attempting session refresh...');
  const refreshResult = await client.auth.refreshSession();
      if (refreshResult.data?.session) {
        console.log('- Session refresh succeeded!', refreshResult.data.session.user.id);
        return refreshResult;
      } else {
        console.log('- Session refresh failed, proceeding with code exchange');
      }
    }
    
    // Attempt the exchange
    console.log('- Starting code exchange...');
  const result = await client.auth.exchangeCodeForSession(code);
    console.log('- Exchange completed', result);
    
    // Check for Supabase-created auth tokens even if there was an error
    // This helps detect the "successful but something else broke" case
    if (result.error) {
      // Look for Supabase tokens that might indicate successful auth despite the error
      const hasTokensAfterAttempt = Object.keys(localStorage).some(key => key && key.startsWith('sb-'));
      if (hasTokensAfterAttempt) {
        console.log('- Found Supabase tokens despite error - partial success detected');
        
        // If we see tokens but got an error, make one more attempt to get a session
        console.log('- Attempting to recover session after partial success...');
  const recoveryResult = await client.auth.refreshSession();
        if (recoveryResult.data?.session) {
          console.log('- Session recovery succeeded after partial success!');
          return recoveryResult;
        } else {
          console.log('- Session recovery failed after partial success');
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('PKCE code exchange error:', error);
    throw error;
  }
};

// production: no dev exports or compatibility helpers — use native helpers from the
// Supabase browser client (createBrowserClient) which includes getSessionFromUrl.

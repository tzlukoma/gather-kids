import { createBrowserClient } from '@supabase/ssr';
import { devLog, isDevLogEnabled } from '@/lib/dev-log';

const authLog = devLog('auth');

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

  // Create client config with localStorage-based storage for cross-tab compatibility
  const clientOptions = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // For the callback page, we DO want to detect the code in the URL
      detectSessionInUrl: window?.location?.pathname === '/auth/callback',
      flowType: 'pkce' as const, // Type assertion to fix TS error
      storage: new NextJSStorage(),
      debug: isDevLogEnabled('auth'),
      onAuthStateChange: (event: string) => {
        authLog.log(`Auth state change: ${event}`);
      }
    },
  };

  // Create and return the client
  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!,
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
    authLog.log('PKCE debugging info:');
    authLog.log('- Auth callback URL:', window.location.href);

    const codeVerifier = localStorage.getItem('supabase.auth.token.code_verifier');
    authLog.log('- Code verifier exists:', !!codeVerifier);

    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      allKeys.push(key);
    }
    authLog.log('- All localStorage keys:', allKeys);

    const hasSupabaseTokens = allKeys.some(key => key && key.startsWith('sb-'));
    authLog.log('- Has existing Supabase tokens:', hasSupabaseTokens);

    // Check if we might already be signed in (this could happen if auth worked but callback handling failed)
    const client = supabase;
    if (!client) throw new Error('Supabase client not available in this environment');
    
    const sessionPromise = client.auth.getSession();
    const sessionTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session check timeout after 5 seconds')), 5000)
    );
    const { data: sessionData } = await Promise.race([sessionPromise, sessionTimeoutPromise]);
    if (sessionData?.session) {
      authLog.log('- Already have active session:', sessionData.session.user.id);
      return { data: sessionData, error: null };
    }

    if (hasSupabaseTokens && !sessionData?.session) {
      authLog.log('- Found tokens but no session, attempting session refresh...');
      const refreshPromise = client.auth.refreshSession();
      const refreshTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session refresh timeout after 5 seconds')), 5000)
      );
      const refreshResult = await Promise.race([refreshPromise, refreshTimeoutPromise]);
      if (refreshResult.data?.session) {
        authLog.log('- Session refresh succeeded!', refreshResult.data.session.user.id);
        return refreshResult;
      } else {
        authLog.log('- Session refresh failed, proceeding with code exchange');
      }
    }

    authLog.log('- Starting code exchange...');
    const exchangePromise = client.auth.exchangeCodeForSession(code);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Code exchange timeout after 10 seconds')), 10000)
    );

    const result = await Promise.race([exchangePromise, timeoutPromise]);
    authLog.log('- Exchange completed', result);

    if (result.error) {
      const hasTokensAfterAttempt = Object.keys(localStorage).some(key => key && key.startsWith('sb-'));
      if (hasTokensAfterAttempt) {
        authLog.log('- Found Supabase tokens despite error - partial success detected');
        authLog.log('- Attempting to recover session after partial success...');
        const recoveryPromise = client.auth.refreshSession();
        const recoveryTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session recovery timeout after 5 seconds')), 5000)
        );
        const recoveryResult = await Promise.race([recoveryPromise, recoveryTimeoutPromise]);
        if (recoveryResult.data?.session) {
          authLog.log('- Session recovery succeeded after partial success!');
          return recoveryResult;
        } else {
          authLog.log('- Session recovery failed after partial success');
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

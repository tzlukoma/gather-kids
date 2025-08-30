import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for browser usage with auth support
 * This client handles session persistence and auto-refresh
 */
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Explicitly set flow type to ensure PKCE is used
        flowType: 'pkce',
        // Set storage key prefix to avoid conflicts
        storageKey: 'gatherKids-auth-token'
      },
    }
  );

// Backward compatibility - keep the old export but use the new client
export const supabase = supabaseBrowser();

import { createBrowserClient } from '@supabase/ssr';

/**
 * Custom storage adapter that uses localStorage for PKCE data to persist across tabs
 * This ensures magic links work when opened in different browser tabs
 */
class CrossTabStorage implements Storage {
  private readonly prefix = 'gatherKids-auth-';

  get length(): number {
    return Object.keys(localStorage).filter(key => key.startsWith(this.prefix)).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    // Use localStorage for all auth-related data to ensure persistence across tabs
    return localStorage.getItem(this.prefix + key);
  }

  setItem(key: string, value: string): void {
    // Store all auth data in localStorage for cross-tab compatibility
    localStorage.setItem(this.prefix + key, value);
    
    // Enhanced debugging for PKCE flow
    if (key.includes('code-verifier') || key.includes('pkce')) {
      console.log('CrossTabStorage: Storing PKCE data', {
        key: this.prefix + key,
        valueLength: value?.length || 0,
        timestamp: new Date().toISOString(),
        storageMethod: 'localStorage'
      });
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
    
    // Enhanced debugging for PKCE flow
    if (key.includes('code-verifier') || key.includes('pkce')) {
      console.log('CrossTabStorage: Removing PKCE data', {
        key: this.prefix + key,
        timestamp: new Date().toISOString()
      });
    }
  }

  clear(): void {
    // Only clear items with our prefix to avoid affecting other app data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Create a Supabase client for browser usage with auth support
 * This client handles session persistence and auto-refresh with cross-tab PKCE support
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
        storageKey: 'auth-token',
        // Use custom storage that persists PKCE data across tabs
        storage: new CrossTabStorage(),
      },
    }
  );

// Backward compatibility - keep the old export but use the new client
export const supabase = supabaseBrowser();

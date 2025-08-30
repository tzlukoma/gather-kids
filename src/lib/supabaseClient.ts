import { createBrowserClient } from '@supabase/ssr';

/**
 * Simple cross-tab PKCE storage adapter
 * Uses localStorage for PKCE verifiers to enable cross-tab magic links
 */
class CrossTabStorage implements Storage {
  private readonly pkceKey = 'auth-token-code-verifier';
  
  get length(): number {
    return sessionStorage.length;
  }

  key(index: number): string | null {
    return sessionStorage.key(index);
  }

  getItem(key: string): string | null {
    // For PKCE verifier, check localStorage first for cross-tab support
    if (key === this.pkceKey) {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key);
      
      // Only log once per session to avoid spam
      if (!(window as any).gatherKidsPKCELogged) {
        console.log('CrossTabStorage: PKCE verifier check', {
          key,
          hasValue: !!value,
          source: value ? (localStorage.getItem(key) ? 'localStorage' : 'sessionStorage') : 'none'
        });
        (window as any).gatherKidsPKCELogged = true;
      }
      
      return value;
    }
    
    // For other data, use sessionStorage normally
    return sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    // For PKCE verifier, store in both localStorage and sessionStorage
    if (key === this.pkceKey) {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
      
      console.log('CrossTabStorage: Stored PKCE verifier in both storages', {
        key,
        valueLength: value?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // Store backup metadata for debugging
      try {
        const backup = {
          verifier: value,
          storedAt: new Date().toISOString(),
          url: window.location.href
        };
        localStorage.setItem('gatherKids-pkce-backup', JSON.stringify(backup));
      } catch (e) {
        console.warn('Failed to store PKCE backup:', e);
      }
      
      return;
    }
    
    // For other data, use sessionStorage
    sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (key === this.pkceKey) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      localStorage.removeItem('gatherKids-pkce-backup');
    } else {
      sessionStorage.removeItem(key);
    }
  }

  clear(): void {
    // Clear auth-related items from localStorage
    const authKeys = Object.keys(localStorage).filter(k => 
      k.includes('auth') || k.includes('token') || k === this.pkceKey
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
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
        // Use simplified cross-tab storage that handles PKCE verifiers correctly
        storage: new CrossTabStorage(),
      },
    }
  );

// Backward compatibility - keep the old export but use the new client
export const supabase = supabaseBrowser();

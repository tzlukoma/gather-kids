import { createBrowserClient } from '@supabase/ssr';
import { patchStorageForCrossTabAuth } from './storage-patch';
import { monitorAndPersistPKCE } from './pkce-monitor';

// Initialize comprehensive PKCE monitoring and storage patching
if (typeof window !== 'undefined') {
  patchStorageForCrossTabAuth();
  monitorAndPersistPKCE();
}

/**
 * Cross-tab PKCE storage adapter specifically designed for Supabase's exact key patterns
 * This ensures PKCE code verifiers persist across browser tabs by using localStorage
 */
class CrossTabPKCEStorage implements Storage {
  private readonly storageKey = 'auth-token'; // Must match the storageKey in Supabase config
  private readonly codeVerifierKey = `${this.storageKey}-code-verifier`; // Exact Supabase pattern
  
  get length(): number {
    return sessionStorage.length;
  }

  key(index: number): string | null {
    return sessionStorage.key(index);
  }

  getItem(key: string): string | null {
    // For the PKCE code verifier, ALWAYS use localStorage for cross-tab persistence
    if (key === this.codeVerifierKey) {
      const value = localStorage.getItem(key);
      console.log('CrossTabPKCEStorage.getItem (PKCE):', {
        key,
        hasValue: !!value,
        valueLength: value?.length || 0,
        source: 'localStorage (cross-tab safe)'
      });
      return value;
    }
    
    // For all other auth data, check both storages but prefer localStorage for auth keys
    if (key.includes('auth') || key.includes('token')) {
      let value = localStorage.getItem(key);
      if (!value) {
        value = sessionStorage.getItem(key);
        if (value) {
          // Promote to localStorage for cross-tab access
          localStorage.setItem(key, value);
          console.log('CrossTabPKCEStorage: Promoted auth data to localStorage', { key });
        }
      }
      
      console.log('CrossTabPKCEStorage.getItem (auth):', {
        key,
        hasValue: !!value,
        source: localStorage.getItem(key) ? 'localStorage' : 'sessionStorage'
      });
      
      return value;
    }
    
    // For non-auth data, use sessionStorage as normal
    return sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    // For PKCE code verifier, store in localStorage for cross-tab persistence
    if (key === this.codeVerifierKey) {
      localStorage.setItem(key, value);
      // Also store in sessionStorage for immediate access
      sessionStorage.setItem(key, value);
      
      console.log('CrossTabPKCEStorage.setItem (PKCE):', {
        key,
        valueLength: value?.length || 0,
        storedInBoth: true,
        isPKCEVerifier: true,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // For other auth data, store in both locations
    if (key.includes('auth') || key.includes('token')) {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
      
      console.log('CrossTabPKCEStorage.setItem (auth):', {
        key,
        valueLength: value?.length || 0,
        storedInBoth: true
      });
      return;
    }
    
    // For non-auth data, use sessionStorage only
    sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    // Remove from both storages for auth data
    if (key === this.codeVerifierKey || key.includes('auth') || key.includes('token')) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      
      console.log('CrossTabPKCEStorage.removeItem:', {
        key,
        removedFromBoth: true,
        isPKCEVerifier: key === this.codeVerifierKey
      });
    } else {
      sessionStorage.removeItem(key);
    }
  }

  clear(): void {
    // Don't clear localStorage completely as it may have other app data
    // Instead, only clear auth-related items
    const authKeys = Object.keys(localStorage).filter(k => 
      k.includes('auth') || k.includes('token') || k === this.codeVerifierKey
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    
    sessionStorage.clear();
    console.log('CrossTabPKCEStorage.clear: Cleared auth data from both storages');
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
        // Use cross-tab compatible storage that handles PKCE verifiers correctly
        storage: new CrossTabPKCEStorage(),
      },
    }
  );

// Backward compatibility - keep the old export but use the new client
export const supabase = supabaseBrowser();

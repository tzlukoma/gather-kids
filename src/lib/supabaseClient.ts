import { createBrowserClient } from '@supabase/ssr';
import { patchStorageForCrossTabAuth } from './storage-patch';

// Initialize storage patching for cross-tab auth support
if (typeof window !== 'undefined') {
  patchStorageForCrossTabAuth();
}

/**
 * Intelligent storage proxy that automatically persists auth data across tabs
 * This intercepts ALL Supabase storage operations and ensures cross-tab persistence
 */
class IntelligentAuthStorage implements Storage {
  private readonly authPrefix = 'sb-auth-';  // Match Supabase's default prefix
  private readonly backupPrefix = 'gatherKids-auth-backup-';

  get length(): number {
    return Object.keys(localStorage).length;
  }

  key(index: number): string | null {
    return Object.keys(localStorage)[index] || null;
  }

  getItem(key: string): string | null {
    // For auth-related keys, always check both localStorage and sessionStorage
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    let value: string | null = null;
    
    if (isAuthKey) {
      // Try localStorage first (cross-tab persistence)
      value = localStorage.getItem(key);
      
      // If not in localStorage, try sessionStorage
      if (!value) {
        value = sessionStorage.getItem(key);
        if (value) {
          // Copy to localStorage for future cross-tab access
          localStorage.setItem(key, value);
          console.log('AuthStorage: Promoted sessionStorage to localStorage', { key });
        }
      }
      
      // Also try our backup storage
      if (!value) {
        value = localStorage.getItem(this.backupPrefix + key);
      }
    } else {
      // For non-auth keys, use sessionStorage as default
      value = sessionStorage.getItem(key);
    }
    
    if (isAuthKey) {
      console.log('IntelligentAuthStorage.getItem:', {
        key,
        hasValue: !!value,
        valueLength: value?.length || 0,
        source: value ? (localStorage.getItem(key) ? 'localStorage' : 
                        sessionStorage.getItem(key) ? 'sessionStorage' : 'backup') : 'none'
      });
    }
    
    return value;
  }

  setItem(key: string, value: string): void {
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    if (isAuthKey) {
      // Store auth data in BOTH localStorage and sessionStorage for maximum reliability
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
      // Also create a backup with our prefix
      localStorage.setItem(this.backupPrefix + key, value);
      
      console.log('IntelligentAuthStorage.setItem (auth):', {
        key,
        valueLength: value?.length || 0,
        storedInAll: true,
        isPKCE: key.includes('verifier') || key.includes('pkce'),
        timestamp: new Date().toISOString()
      });
    } else {
      // Store non-auth data in sessionStorage only
      sessionStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    // Remove from all storage locations
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    if (isAuthKey) {
      localStorage.removeItem(this.backupPrefix + key);
    }
    
    if (isAuthKey) {
      console.log('IntelligentAuthStorage.removeItem:', {
        key,
        removedFromAll: true
      });
    }
  }

  clear(): void {
    // Clear both storage types completely (Supabase may call this)
    localStorage.clear();
    sessionStorage.clear();
    console.log('IntelligentAuthStorage.clear: Cleared all storage');
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
        // Use intelligent storage that handles all auth data persistence
        storage: new IntelligentAuthStorage(),
      },
    }
  );

// Backward compatibility - keep the old export but use the new client
export const supabase = supabaseBrowser();

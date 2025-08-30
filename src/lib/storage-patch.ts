/**
 * Global storage interceptor for Supabase PKCE cross-tab compatibility
 * This module patches browser storage to ensure PKCE data persists across tabs
 */

interface StorageOperation {
  operation: 'getItem' | 'setItem' | 'removeItem';
  key: string;
  value?: string;
  timestamp: number;
}

let storageOperations: StorageOperation[] = [];

/**
 * Patch browser storage to intercept Supabase auth operations
 */
export function patchStorageForCrossTabAuth(): void {
  if (typeof window === 'undefined') return;
  
  // Save original storage methods
  const originalSessionStorageSetItem = sessionStorage.setItem.bind(sessionStorage);
  const originalSessionStorageGetItem = sessionStorage.getItem.bind(sessionStorage);
  const originalSessionStorageRemoveItem = sessionStorage.removeItem.bind(sessionStorage);
  
  // Patch sessionStorage.setItem to also store in localStorage for auth keys
  sessionStorage.setItem = function(key: string, value: string) {
    storageOperations.push({ operation: 'setItem', key, value, timestamp: Date.now() });
    
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    if (isAuthKey) {
      // Store in localStorage for cross-tab persistence
      localStorage.setItem(`cross-tab-${key}`, value);
      console.log('StoragePatch: Auth setItem intercepted', {
        key,
        valueLength: value?.length,
        alsoStoredInLocalStorage: true
      });
    }
    
    return originalSessionStorageSetItem(key, value);
  };
  
  // Patch sessionStorage.getItem to check localStorage for auth keys
  sessionStorage.getItem = function(key: string): string | null {
    storageOperations.push({ operation: 'getItem', key, timestamp: Date.now() });
    
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    let value = originalSessionStorageGetItem(key);
    
    if (!value && isAuthKey) {
      // Try localStorage as fallback for cross-tab access
      value = localStorage.getItem(`cross-tab-${key}`);
      if (value) {
        // If found in localStorage, restore to sessionStorage
        originalSessionStorageSetItem(key, value);
        console.log('StoragePatch: Auth getItem recovered from localStorage', {
          key,
          valueLength: value.length,
          restoredToSessionStorage: true
        });
      }
    }
    
    if (isAuthKey) {
      console.log('StoragePatch: Auth getItem', {
        key,
        hasValue: !!value,
        source: value ? (originalSessionStorageGetItem(key) ? 'sessionStorage' : 'localStorage') : 'none'
      });
    }
    
    return value;
  };
  
  // Patch sessionStorage.removeItem to also remove from localStorage
  sessionStorage.removeItem = function(key: string) {
    storageOperations.push({ operation: 'removeItem', key, timestamp: Date.now() });
    
    const isAuthKey = key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce');
    
    if (isAuthKey) {
      localStorage.removeItem(`cross-tab-${key}`);
      console.log('StoragePatch: Auth removeItem intercepted', {
        key,
        alsoRemovedFromLocalStorage: true
      });
    }
    
    return originalSessionStorageRemoveItem(key);
  };
  
  console.log('Storage patching enabled for cross-tab auth compatibility');
}

/**
 * Get storage operation history for debugging
 */
export function getStorageOperationHistory(): StorageOperation[] {
  return [...storageOperations];
}

/**
 * Clear storage operation history
 */
export function clearStorageOperationHistory(): void {
  storageOperations = [];
}

/**
 * Manual cleanup of cross-tab auth storage
 */
export function cleanupCrossTabAuthStorage(): void {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('cross-tab-'));
  keys.forEach(key => localStorage.removeItem(key));
  console.log('Cleaned up cross-tab auth storage:', keys);
}
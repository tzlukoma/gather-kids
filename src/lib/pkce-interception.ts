/**
 * Aggressive PKCE interception system for cross-tab magic link support
 * This module intercepts ALL storage operations to capture and persist PKCE data
 */

interface PKCEInterceptionData {
  verifier: string;
  storedAt: string;
  requestContext: {
    url: string;
    userAgent: string;
    origin: string;
  };
}

const PKCE_PATTERNS = [
  'auth-token-code-verifier',
  'sb-auth-token-code-verifier',
  'supabase-auth-token-code-verifier'
];

const BACKUP_KEY = 'gatherKids-pkce-interception-backup';

/**
 * Initialize aggressive PKCE interception that captures verifiers regardless of storage pattern
 */
export function initializePKCEInterception(): void {
  if (typeof window === 'undefined') return;

  // Override both localStorage and sessionStorage to capture PKCE data
  const originalLocalStorageSetItem = localStorage.setItem.bind(localStorage);
  const originalSessionStorageSetItem = sessionStorage.setItem.bind(sessionStorage);
  
  // Create a robust storage interceptor
  const interceptStorageOperation = (storageType: 'localStorage' | 'sessionStorage', key: string, value: string) => {
    // Check if this looks like a PKCE verifier
    const isPKCEKey = PKCE_PATTERNS.some(pattern => key.includes(pattern)) || 
                     (key.includes('verifier') && value.length > 40) ||
                     (key.includes('auth') && key.includes('code') && value.length > 40);
    
    if (isPKCEKey) {
      console.log('🔍 PKCE Interception: Captured potential PKCE verifier', {
        storageType,
        key,
        valueLength: value.length,
        valuePreview: `${value.substring(0, 8)}...${value.substring(value.length - 8)}`,
        timestamp: new Date().toISOString(),
        patterns: PKCE_PATTERNS
      });
      
      // Store in multiple locations for maximum persistence
      const targetKey = 'auth-token-code-verifier'; // Standardize on this key
      
      try {
        localStorage.setItem(targetKey, value);
        sessionStorage.setItem(targetKey, value);
        localStorage.setItem(`cross-tab-${targetKey}`, value);
        
        // Create comprehensive backup
        const backupData: PKCEInterceptionData = {
          verifier: value,
          storedAt: new Date().toISOString(),
          requestContext: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            origin: window.location.origin
          }
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
        
        console.log('✅ PKCE Interception: Successfully stored verifier in multiple locations', {
          originalKey: key,
          standardizedKey: targetKey,
          backupKey: BACKUP_KEY,
          storageLocations: ['localStorage', 'sessionStorage', 'cross-tab-backup', 'metadata-backup']
        });
      } catch (e) {
        console.error('❌ PKCE Interception: Failed to store verifier', e);
      }
    }
  };

  // Override localStorage.setItem
  localStorage.setItem = function(key: string, value: string) {
    interceptStorageOperation('localStorage', key, value);
    return originalLocalStorageSetItem(key, value);
  };

  // Override sessionStorage.setItem  
  sessionStorage.setItem = function(key: string, value: string) {
    interceptStorageOperation('sessionStorage', key, value);
    return originalSessionStorageSetItem(key, value);
  };

  console.log('🚀 PKCE Interception: Initialized aggressive PKCE capture system', {
    patterns: PKCE_PATTERNS,
    backupKey: BACKUP_KEY,
    timestamp: new Date().toISOString()
  });
}

/**
 * Attempt to recover PKCE verifier from any available source
 */
export function recoverPKCEVerifier(): string | null {
  if (typeof window === 'undefined') return null;

  const targetKey = 'auth-token-code-verifier';
  
  // Try multiple recovery methods
  const sources = [
    () => localStorage.getItem(targetKey),
    () => sessionStorage.getItem(targetKey),
    () => localStorage.getItem(`cross-tab-${targetKey}`),
    () => {
      // Try backup metadata
      try {
        const backupData = localStorage.getItem(BACKUP_KEY);
        if (backupData) {
          const backup: PKCEInterceptionData = JSON.parse(backupData);
          const age = new Date().getTime() - new Date(backup.storedAt).getTime();
          const maxAge = 55 * 60 * 1000; // 55 minutes
          
          if (age < maxAge) {
            console.log('🔄 PKCE Recovery: Found valid backup data', {
              age: Math.round(age / 1000 / 60),
              verifierLength: backup.verifier.length
            });
            return backup.verifier;
          } else {
            console.log('⏰ PKCE Recovery: Backup data expired', {
              age: Math.round(age / 1000 / 60)
            });
            localStorage.removeItem(BACKUP_KEY);
          }
        }
      } catch (e) {
        console.warn('PKCE Recovery: Failed to parse backup data:', e);
      }
      return null;
    },
    () => {
      // Search for any key that might contain a PKCE verifier
      const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      for (const key of allKeys) {
        if (key.includes('verifier') || (key.includes('auth') && key.includes('code'))) {
          const value = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (value && value.length > 40) {
            console.log('🔍 PKCE Recovery: Found potential verifier with different key', {
              key,
              valueLength: value.length
            });
            return value;
          }
        }
      }
      return null;
    }
  ];

  for (let i = 0; i < sources.length; i++) {
    try {
      const verifier = sources[i]();
      if (verifier) {
        console.log(`✅ PKCE Recovery: Found verifier from source ${i + 1}`, {
          verifierLength: verifier.length,
          verifierPreview: `${verifier.substring(0, 8)}...${verifier.substring(verifier.length - 8)}`
        });
        
        // Store in standard location for future use
        localStorage.setItem(targetKey, verifier);
        sessionStorage.setItem(targetKey, verifier);
        
        return verifier;
      }
    } catch (e) {
      console.warn(`PKCE Recovery: Source ${i + 1} failed:`, e);
    }
  }

  console.log('❌ PKCE Recovery: No verifier found in any source');
  return null;
}

/**
 * Get debug information about current PKCE state
 */
export function getPKCEDebugInfo(): Record<string, any> {
  if (typeof window === 'undefined') return {};

  const targetKey = 'auth-token-code-verifier';
  
  return {
    targetKey,
    localStorage: {
      hasTarget: !!localStorage.getItem(targetKey),
      hasCrossTab: !!localStorage.getItem(`cross-tab-${targetKey}`),
      hasBackup: !!localStorage.getItem(BACKUP_KEY),
      allAuthKeys: Object.keys(localStorage).filter(k => 
        k.includes('auth') || k.includes('token') || k.includes('verifier')
      )
    },
    sessionStorage: {
      hasTarget: !!sessionStorage.getItem(targetKey),
      allAuthKeys: Object.keys(sessionStorage).filter(k => 
        k.includes('auth') || k.includes('token') || k.includes('verifier')
      )
    },
    context: {
      url: window.location.href,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  };
}
/**
 * Enhanced PKCE verifier persistence for cross-tab magic link support
 * This module provides aggressive PKCE storage management to ensure code verifiers
 * are available when magic links are clicked in different browser tabs
 */

/**
 * Enhanced PKCE verifier persistence for cross-tab magic link support
 * This module provides aggressive PKCE storage management to ensure code verifiers
 * are available when magic links are clicked in different browser tabs
 */

/**
 * Aggressively monitor and persist PKCE code verifiers across all storage methods
 */
export function monitorAndPersistPKCE(): void {
  if (typeof window === 'undefined') return;

  const PKCE_KEY = 'auth-token-code-verifier';
  const BACKUP_KEY = 'gatherKids-pkce-backup';
  
  // Monitor all possible storage operations
  let monitoringInterval: NodeJS.Timeout;
  
  const startMonitoring = () => {
    // Clear any existing monitoring
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }
    
    // Monitor every 50ms for PKCE data and ensure it's in localStorage
    monitoringInterval = setInterval(() => {
      // Check if PKCE verifier exists in sessionStorage but not localStorage
      const sessionVerifier = sessionStorage.getItem(PKCE_KEY);
      const localVerifier = localStorage.getItem(PKCE_KEY);
      
      if (sessionVerifier && !localVerifier) {
        // Copy to localStorage for cross-tab access
        localStorage.setItem(PKCE_KEY, sessionVerifier);
        localStorage.setItem(`cross-tab-${PKCE_KEY}`, sessionVerifier);
        console.log('PKCE Monitor: Detected verifier in sessionStorage, copied to localStorage', {
          key: PKCE_KEY,
          verifierLength: sessionVerifier.length,
          timestamp: new Date().toISOString(),
          action: 'session->local_promotion'
        });
        
        // Also create a timestamped backup
        const backup = {
          verifier: sessionVerifier,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          source: 'monitor_detected'
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      }
      
      // If we find a backup but no active verifier, restore it (if recent)
      if (!sessionVerifier && !localVerifier) {
        try {
          const backupData = localStorage.getItem(BACKUP_KEY);
          if (backupData) {
            const backup = JSON.parse(backupData);
            const backupAge = new Date().getTime() - new Date(backup.timestamp).getTime();
            const maxAge = 55 * 60 * 1000; // 55 minutes (magic links expire after 1 hour)
            
            if (backupAge < maxAge) {
              localStorage.setItem(PKCE_KEY, backup.verifier);
              sessionStorage.setItem(PKCE_KEY, backup.verifier);
              localStorage.setItem(`cross-tab-${PKCE_KEY}`, backup.verifier);
              console.log('PKCE Monitor: Restored verifier from backup', {
                backupAge: Math.round(backupAge / 1000 / 60),
                verifierLength: backup.verifier.length,
                source: backup.source || 'unknown'
              });
            } else {
              localStorage.removeItem(BACKUP_KEY);
              console.log('PKCE Monitor: Removed expired backup', { backupAge: Math.round(backupAge / 1000 / 60) });
            }
          }
        } catch (e) {
          console.warn('PKCE Monitor: Failed to restore from backup:', e);
        }
      }
      
      // Also check if Supabase stored the verifier with a different pattern
      const allAuthKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('verifier') || (key.includes('auth') && key.includes('token'))
      );
      
      allAuthKeys.forEach(authKey => {
        if (authKey !== PKCE_KEY) {
          const authValue = sessionStorage.getItem(authKey);
          if (authValue && authValue.length > 40) { // PKCE verifiers are typically 43+ chars
            console.log('PKCE Monitor: Found potential PKCE verifier with different key pattern', {
              key: authKey,
              expectedKey: PKCE_KEY,
              valueLength: authValue.length,
              promoting: true
            });
            
            // Store it under the expected key
            localStorage.setItem(PKCE_KEY, authValue);
            localStorage.setItem(`cross-tab-${PKCE_KEY}`, authValue);
            sessionStorage.setItem(PKCE_KEY, authValue);
          }
        }
      });
    }, 50); // More frequent monitoring
    
    console.log('PKCE monitoring started - will ensure verifiers persist across tabs');
  };
  
  // Start monitoring immediately
  startMonitoring();
  
  // Also monitor page visibility changes to restart monitoring in new tabs
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('PKCE Monitor: Page became visible, checking storage state');
      startMonitoring();
    }
  });
  
  // Monitor for page focus to handle tab switching
  window.addEventListener('focus', () => {
    console.log('PKCE Monitor: Window focused, ensuring PKCE data is available');
    startMonitoring();
  });
  
  // Monitor storage events across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === PKCE_KEY || e.key === `cross-tab-${PKCE_KEY}`) {
      console.log('PKCE Monitor: Storage event detected for PKCE key', {
        key: e.key,
        newValue: e.newValue ? `${e.newValue.substring(0, 8)}...` : null,
        oldValue: e.oldValue ? `${e.oldValue.substring(0, 8)}...` : null,
        storageType: 'cross-tab-event'
      });
      
      if (e.newValue && e.key === `cross-tab-${PKCE_KEY}`) {
        // Sync to the main PKCE key
        localStorage.setItem(PKCE_KEY, e.newValue);
        sessionStorage.setItem(PKCE_KEY, e.newValue);
      }
    }
  });
}

/**
 * Manually inject PKCE verifier into storage if it's missing during auth callback
 */
export function ensurePKCEVerifierExists(): boolean {
  if (typeof window === 'undefined') return false;
  
  const PKCE_KEY = 'auth-token-code-verifier';
  const BACKUP_KEY = 'gatherKids-pkce-backup';
  
  let verifier: string | null = localStorage.getItem(PKCE_KEY) || sessionStorage.getItem(PKCE_KEY);
  
  if (!verifier) {
    // Try to restore from backup
    try {
      const backupData = localStorage.getItem(BACKUP_KEY);
      if (backupData) {
        const backup = JSON.parse(backupData);
        const backupAge = new Date().getTime() - new Date(backup.timestamp).getTime();
        const maxAge = 55 * 60 * 1000; // 55 minutes
        
        if (backupAge < maxAge && backup.verifier) {
          const restoredVerifier = backup.verifier;
          verifier = restoredVerifier;
          localStorage.setItem(PKCE_KEY, restoredVerifier);
          sessionStorage.setItem(PKCE_KEY, restoredVerifier);
          
          console.log('ensurePKCEVerifierExists: Restored verifier from backup', {
            backupAge: Math.round(backupAge / 1000 / 60),
            verifierLength: restoredVerifier.length
          });
        }
      }
    } catch (e) {
      console.warn('ensurePKCEVerifierExists: Failed to restore from backup:', e);
    }
  }
  
  console.log('ensurePKCEVerifierExists result:', {
    verifierExists: !!verifier,
    verifierLength: verifier?.length || 0,
    foundInLocalStorage: !!localStorage.getItem(PKCE_KEY),
    foundInSessionStorage: !!sessionStorage.getItem(PKCE_KEY)
  });
  
  return !!verifier;
}

/**
 * Clean up expired PKCE data
 */
export function cleanupExpiredPKCE(): void {
  if (typeof window === 'undefined') return;
  
  const BACKUP_KEY = 'gatherKids-pkce-backup';
  
  try {
    const backupData = localStorage.getItem(BACKUP_KEY);
    if (backupData) {
      const backup = JSON.parse(backupData);
      const backupAge = new Date().getTime() - new Date(backup.timestamp).getTime();
      const maxAge = 55 * 60 * 1000; // 55 minutes
      
      if (backupAge >= maxAge) {
        localStorage.removeItem(BACKUP_KEY);
        localStorage.removeItem('auth-token-code-verifier');
        sessionStorage.removeItem('auth-token-code-verifier');
        console.log('cleanupExpiredPKCE: Removed expired PKCE data');
      }
    }
  } catch (e) {
    console.warn('cleanupExpiredPKCE: Error during cleanup:', e);
  }
}
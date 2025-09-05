/**
 * Debug flag management for the global debug panel
 * Controls localStorage-based debug panel visibility
 */

export const DEBUG_LS_KEY = 'gk:debug-panel';

/**
 * Check if debug panel is enabled via localStorage
 */
export function isDebugOn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEBUG_LS_KEY) === '1';
}

/**
 * Set debug panel flag
 */
export function setDebugFlag(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  console.log(`🔧 Debug flag: Setting debug panel to ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  if (enabled) {
    localStorage.setItem(DEBUG_LS_KEY, '1');
    console.log(`🔧 Debug flag: Set ${DEBUG_LS_KEY}='1' in localStorage`);
  } else {
    localStorage.removeItem(DEBUG_LS_KEY);
    console.log(`🔧 Debug flag: Removed ${DEBUG_LS_KEY} from localStorage`);
  }
  
  // Dispatch custom event to notify listeners
  window.dispatchEvent(new CustomEvent('gk:debug-flag-change', { 
    detail: { enabled } 
  }));
  console.log(`🔧 Debug flag: Dispatched gk:debug-flag-change event with enabled=${enabled}`);
}

/**
 * Subscribe to debug flag changes
 */
export function onDebugFlagChange(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: CustomEvent) => {
    callback(event.detail.enabled);
  };
  
  window.addEventListener('gk:debug-flag-change', handler as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('gk:debug-flag-change', handler as EventListener);
  };
}

/**
 * Toggle debug flag state
 */
export function toggleDebugFlag(): void {
  setDebugFlag(!isDebugOn());
}
/**
 * Helper functions for working with database adapters
 */

import { db as dbAdapter } from './database/factory';
import { getFlag } from './featureFlags';

// Helper function to check if we're using Supabase or IndexedDB
export function isSupabase(): boolean {
  // Prefer duck-typing: Supabase adapter exposes a `from` method for querying
  // and may have a `supabase` client property. This avoids unsafe `any` casts.
  try {
    const candidate: unknown = dbAdapter as unknown;
    if (candidate && typeof (candidate as any).from === 'function') return true;
    if (candidate && typeof (candidate as any).supabase === 'object') return true;
  } catch (err) {
    // ignore and fall through
  }
  return false;
}

// Helper function to get the current database mode
export function getDatabaseMode(): 'supabase' | 'indexeddb' {
  return isSupabase() ? 'supabase' : 'indexeddb';
}

// Re-export the adapter
export { dbAdapter };

// Make adapter available in window for debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.dbAdapter = dbAdapter;
}

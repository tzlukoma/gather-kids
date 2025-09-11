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
    const candRec = candidate as Record<string, unknown> | undefined;
    if (candRec && typeof candRec['from'] === 'function') return true;
    if (candRec && typeof candRec['supabase'] === 'object') return true;
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
  // @ts-expect-error - expose adapter for debugging in dev only
  window.dbAdapter = dbAdapter;
}

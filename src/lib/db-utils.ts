/**
 * Helper functions for working with database adapters
 */

import { db as dbAdapter } from './database/factory';
import { getFlag } from './featureFlags';

// Helper function to check if we're using Supabase or IndexedDB
export function isSupabase(): boolean {
  return (dbAdapter as any).constructor.name === 'SupabaseAdapter';
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

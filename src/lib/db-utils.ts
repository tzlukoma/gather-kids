/**
 * Helper functions for working with the Supabase database adapter.
 */

import { db as dbAdapter } from './database/factory';

export { dbAdapter };

if (typeof window !== 'undefined') {
  // @ts-expect-error - expose adapter for debugging in dev only
  window.dbAdapter = dbAdapter;
}

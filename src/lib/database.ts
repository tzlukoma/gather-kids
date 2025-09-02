// Compatibility layer that provides the current Dexie-like interface
// while allowing switching between adapters behind the scenes
import { db as dexieDb } from './db';
import { createDatabaseAdapter } from './database/factory';

// For now, we keep the existing Dexie interface for backward compatibility
// Later, we can migrate DAL functions to use the adapter interface directly
export const db = dexieDb;

// Export the new adapter for new code
export const dbAdapter = createDatabaseAdapter();
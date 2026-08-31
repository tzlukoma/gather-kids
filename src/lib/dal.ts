/**
 * DAL — thin facade
 *
 * Public entry-point for `@/lib/dal` imports. Supabase-backed implementations
 * live in the domain modules under `./dal/`. This file re-exports that surface
 * plus a couple of backward-compat aliases used by tests.
 */

export * from './dal/index';

/** The Supabase adapter instance — exported for backward compat with tests. */
export { db as dbAdapter } from './database/factory';

/** Canonical registration function (for tests that import registerHouseholdCanonical). */
export { registerHouseholdCanonical } from './database/canonical-dal';

/**
 * Central type re-exports (MAINT-05)
 *
 * All domain types live in `src/lib/types.ts`.  This shim re-exports them
 * from `src/types/index.ts` so that new code can import from the shorter
 * `@/types` path.  Existing imports from `@/lib/types` continue to work
 * unchanged.
 *
 * Prefer `@/types` for new code.
 */
export type * from '../lib/types';

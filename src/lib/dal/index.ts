/**
 * DAL — main barrel export
 *
 * Re-exports all public DAL functions from domain modules.  Callers may
 * import from '@/lib/dal' (the thin facade in src/lib/dal.ts) or directly
 * from the domain modules for tree-shaking.
 */

export * from './utils';
export * from './attendance';
export * from './households';
export * from './children';
export * from './ministries';
export * from './leaders';
export * from './bible-bee';
export * from './branding';
export * from './dashboard';
export * from './exports';
export * from './registration';
export * from './cycle-scoping';
export * from './registration-cycle-utils';
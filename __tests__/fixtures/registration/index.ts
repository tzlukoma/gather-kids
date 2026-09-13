/**
 * Reusable synthetic GatherSystem registration fixtures/builders.
 *
 * Import from `__tests__/fixtures/registration` (Jest) or
 * `e2e/fixtures/registration` (Playwright). Data is synthetic only —
 * never point these helpers at UAT/production (see env-safety).
 *
 * Remaining #399 work (flag-on E2E matrix, screenshots, CI gate) is deferred
 * until after functional regression issues such as #390 stabilize.
 */

export * from './constants';
export * from './env-safety';
export * from './ids';
export * from './age';
export * from './guardians';
export * from './children';
export * from './household';
export * from './ministries';
export * from './consents';
export * from './form';

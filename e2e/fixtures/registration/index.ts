/**
 * Playwright-facing re-exports of synthetic registration fixtures.
 * Canonical builders live in `__tests__/fixtures/registration`.
 *
 * Call `assertDisposableRegistrationEnv()` before any admin seed/client
 * that mutates Supabase so UAT/production stay unreachable from tests.
 */

export * from '../../../__tests__/fixtures/registration';

import { test, expect } from '@playwright/test';
import {
  acceptAllRegistrationConsents,
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
  submitRegistration,
} from './utils/r1-helpers';

/** Legacy entry point — full suite lives in e2e/r1/*.spec.ts */
r1Describe('Returning-family registration (legacy entry)', () => {
  test('login → prefill → consents → submit → household', async ({ page, context }) => {
    test.slow();
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);
    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);
    await page.waitForURL(/\/household/, { timeout: 120000 });
  });

  test('blocks unauthenticated submit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/register');
    await page.waitForURL(/\/login\?next=%2Fregister/, { timeout: 15000 });
  });
});

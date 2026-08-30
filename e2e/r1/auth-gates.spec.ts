import { test, expect } from '@playwright/test';
import {
  R1_ACCOUNTS,
  loginReturningGuardian,
  loginWithPassword,
  r1Describe,
  waitForPostLoginRoute,
} from '../utils/r1-helpers';

r1Describe('R1 auth gates', () => {
  test('unauthenticated /register redirects to login with return path', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/register');
    await page.waitForURL(/\/login\?next=%2Fregister/, { timeout: 15000 });
    await expect(page.locator('#email')).toBeVisible();
  });

  test('invalid credentials stay on login with feedback', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginWithPassword(
      page,
      R1_ACCOUNTS.returning.email,
      'wrong-password-for-e2e',
    );
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByText('Login Failed', { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  test('returning guardian login routes to register or household based on cycle state', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);
    await expect(page).toHaveURL(/\/(register|household)/);
  });

  test('household page redirects to register when active-cycle registration is still needed', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);

    if (page.url().includes('/register')) {
      await page.goto('/household');
      await expect(page).toHaveURL(/\/register/, { timeout: 30000 });
    } else {
      await page.goto('/register');
      await page.waitForURL(/\/register/, { timeout: 15000 });
      test.info().annotations.push({
        type: 'note',
        description:
          'Returning household already registered for active cycle; household redirect skipped.',
      });
    }
  });

  test('login from register redirect lands back in authenticated app', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/register');
    await page.waitForURL(/\/login\?next=%2Fregister/, { timeout: 15000 });

    await loginWithPassword(
      page,
      R1_ACCOUNTS.returning.email,
      R1_ACCOUNTS.returning.password,
    );
    await waitForPostLoginRoute(page);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

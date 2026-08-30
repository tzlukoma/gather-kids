import { test, expect } from '@playwright/test';
import {
  acceptAllRegistrationConsents,
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
  submitRegistration,
} from '../utils/r1-helpers';

r1Describe('R1 submit and household @mutating', () => {
  test('returning guardian can submit and land on household profile', async ({
    page,
    context,
  }) => {
    test.slow();
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);

    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);

    await page.waitForURL(/\/household/, { timeout: 120000 });
    await expect(
      page.getByText(/registration year|enrolled|household|children/i).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('after successful registration household no longer redirects to register', async ({
    page,
    context,
  }) => {
    test.slow();
    await context.clearCookies();
    await loginReturningGuardian(page);

    if (!page.url().includes('/register')) {
      test.info().annotations.push({
        type: 'note',
        description: 'Household already registered for active cycle.',
      });
      await page.goto('/household');
      await expect(page).toHaveURL(/\/household/, { timeout: 30000 });
      return;
    }

    await gotoRegisterAsLoggedInUser(page);
    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);
    await page.waitForURL(/\/household/, { timeout: 120000 });

    await page.goto('/household');
    await expect(page).toHaveURL(/\/household/, { timeout: 30000 });
    await expect(page).not.toHaveURL(/\/register/);
  });
});

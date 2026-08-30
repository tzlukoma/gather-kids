import { test, expect } from '@playwright/test';
import {
  acceptAllRegistrationConsents,
  acceptRequiredConsents,
  fulfillGroupAndOptionalConsents,
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
  submitRegistration,
  expectStayedOnRegister,
} from '../utils/r1-helpers';

r1Describe('R1 dynamic ministry consents', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);
  });

  test('blocks submit when choir group consent is missing', async ({ page }) => {
    await acceptRequiredConsents(page);
    await submitRegistration(page);
    await expectStayedOnRegister(page);
    await expect(page.getByText(/^required$/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('acceptAllRegistrationConsents satisfies choir and optional ministry consents', async ({
    page,
  }) => {
    await acceptAllRegistrationConsents(page);

    const choirsHeading = page.getByRole('heading', { name: 'Choirs', exact: true });
    if (await choirsHeading.count()) {
      await expect(page.getByRole('radio', { name: 'No', exact: true }).first()).toBeChecked();
    }

    const oratorsConsent = page.getByRole('checkbox', {
      name: /new jersey orators consent/i,
    });
    if (await oratorsConsent.count()) {
      await expect(oratorsConsent).toBeChecked();
    }
  });
});

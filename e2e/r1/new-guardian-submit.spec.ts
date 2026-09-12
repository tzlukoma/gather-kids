import { test, expect } from '@playwright/test';
import {
  acceptAllRegistrationConsents,
  captureRegistrationSubmitFailures,
  fillMinimumNewHouseholdRegistration,
  gotoRegisterAsLoggedInUser,
  loginNewGuardian,
  r1Describe,
  submitRegistration,
} from '../utils/r1-helpers';

r1Describe('R1 new guardian submit @mutating', () => {
  test('new household registration submits without FK or submission errors', async ({
    page,
    context,
  }) => {
    test.slow();
    await context.clearCookies();
    await loginNewGuardian(page);
    await gotoRegisterAsLoggedInUser(page);

    const street = page.getByRole('textbox', { name: /^street address$/i });
    test.skip(
      (await street.inputValue()).length > 0,
      'New guardian already has a household; reseed R1 fixtures to exercise createHousehold.',
    );

    const failures = captureRegistrationSubmitFailures(page);
    await fillMinimumNewHouseholdRegistration(page);
    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);

    await expect(page.getByText(/submission error/i)).toHaveCount(0);
    expect(failures, failures.join('\n')).toEqual([]);
    await page.waitForURL(/\/household/, { timeout: 120000 });
    await expect(page).not.toHaveURL(/\/register/);
  });
});

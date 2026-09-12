import { test, expect } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import { createConfirmedTestUser, deleteTestUser } from './utils/seed';
import {
  acceptAllRegistrationConsents,
  captureRegistrationSubmitFailures,
  fillMinimumNewHouseholdRegistration,
  loginWithPassword,
  submitRegistration,
  waitForPostLoginRoute,
  waitForRegisterFormReady,
} from './utils/r1-helpers';

function isLocalSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  return Boolean(key) && /localhost|127\.0\.0\.1/.test(url);
}

test.describe('New household registration submit @mutating', () => {
  test.skip(
    !isLocalSupabaseConfigured(),
    'Requires local Supabase credentials in .env.e2e.local',
  );

  let createdUserId: string | undefined;

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  test('first-time guardian can submit without household FK errors', async ({
    page,
    context,
  }) => {
    test.slow();
    const email = generateUniqueEmail('new-household');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await context.clearCookies();
    const failures = captureRegistrationSubmitFailures(page);

    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await page.goto('/register');
    await waitForRegisterFormReady(page);

    await fillMinimumNewHouseholdRegistration(page);
    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);

    await expect(page.getByText(/submission error/i)).toHaveCount(0);
    expect(failures, failures.join('\n')).toEqual([]);
    await page.waitForURL(/\/household/, { timeout: 120000 });
    await expect(page).not.toHaveURL(/\/register/);
  });
});

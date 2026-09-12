import { test, expect } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createReturningGuardianFixture,
  deleteTestUser,
  ensureRegistrationSmokeFixtures,
} from './utils/seed';
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

test.describe('Registration submit smoke @mutating', () => {
  test.beforeAll(() => {
    if (process.env.CI && !isLocalSupabaseConfigured()) {
      throw new Error(
        'CI registration smoke requires SUPABASE_URL (localhost) and SUPABASE_SERVICE_ROLE',
      );
    }
  });

  test.skip(
    !process.env.CI && !isLocalSupabaseConfigured(),
    'Requires local Supabase credentials in .env.e2e.local',
  );

  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) {
      return;
    }
    await ensureRegistrationSmokeFixtures();
  });

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  test('first-time guardian can submit a new household', async ({ page, context }) => {
    test.slow();
    const email = generateUniqueEmail('smoke-new');
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

  test('returning guardian can submit for the active cycle', async ({ page, context }) => {
    test.slow();
    const email = generateUniqueEmail('smoke-returning');
    const fixture = await createReturningGuardianFixture(email, TEST_PASSWORD);
    createdUserId = fixture.user.id;

    await context.clearCookies();
    const failures = captureRegistrationSubmitFailures(page);

    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await page.goto('/register');
    await waitForRegisterFormReady(page);

    await expect(page.getByRole('textbox', { name: /^street address$/i })).toHaveValue(
      '200 Returning St',
    );

    const grade = page.getByRole('combobox', { name: /grade/i });
    if (await grade.count()) {
      const gradeText = (await grade.innerText()).trim();
      if (!gradeText || /select grade/i.test(gradeText)) {
        await grade.click();
        await page.getByRole('option', { name: /kindergarten/i }).click();
      }
    }

    await acceptAllRegistrationConsents(page);
    await submitRegistration(page);

    await expect(page.getByText(/submission error/i)).toHaveCount(0);
    expect(failures, failures.join('\n')).toEqual([]);
    await page.waitForURL(/\/household/, { timeout: 120000 });
    await expect(page).not.toHaveURL(/\/register/);
  });
});

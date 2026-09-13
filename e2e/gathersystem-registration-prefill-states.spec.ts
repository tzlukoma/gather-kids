import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createCurrentCycleGuardianFixture,
  createReturningGuardianFixture,
  deleteTestUser,
  ensureRegistrationSmokeFixtures,
} from './utils/seed';
import {
  loginWithPassword,
  waitForPostLoginRoute,
} from './utils/r1-helpers';

function isLocalSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  return Boolean(key) && /localhost|127\.0\.0\.1/.test(url);
}

function gathersystemDescribe(title: string, fn: () => void) {
  test.describe(title, () => {
    test.skip(
      process.env.GATHERSYSTEM_REGISTRATION_E2E !== '1',
      'Set GATHERSYSTEM_REGISTRATION_E2E=1 with gathersystem_registration enabled for the test user',
    );
    test.skip(
      !process.env.CI && !isLocalSupabaseConfigured(),
      'Requires local Supabase credentials in .env.e2e.local',
    );
    fn();
  });
}

async function openRegistrationEntry(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await expect(page.getByTestId('registration-entry')).toBeVisible({
    timeout: 30000,
  });
}

gathersystemDescribe('GatherSystem registration prefill states @mobile', () => {
  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    if (isLocalSupabaseConfigured()) {
      await ensureRegistrationSmokeFixtures();
    }
  });

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  test('first-time entry shows neutral copy without last-year claims', async ({
    page,
    context,
  }) => {
    test.slow();
    const email = generateUniqueEmail('gs-first');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await context.clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await openRegistrationEntry(page);

    const description = page.getByTestId('registration-entry-description');
    await expect(description).toHaveAttribute('data-prefill-kind', 'first_time');
    await expect(description).toContainText(/complete your family registration/i);
    await expect(description).not.toContainText(/last year|on file|returning/i);
    await expect(page.getByTestId('registration-entry-overwrite-warning')).toHaveCount(0);

    await page.getByRole('button', { name: /start registration/i }).click();
    await expect(page.getByTestId('step1-on-file-notice')).toHaveCount(0);
    await expect(page.getByTestId('step1-overwrite-warning')).toHaveCount(0);
  });

  test('prior-cycle returning entry shows last-year prefill copy', async ({
    page,
    context,
  }) => {
    test.slow();
    const email = generateUniqueEmail('gs-prior');
    const fixture = await createReturningGuardianFixture(email, TEST_PASSWORD);
    createdUserId = fixture.user.id;

    await context.clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await openRegistrationEntry(page);

    const description = page.getByTestId('registration-entry-description');
    await expect(description).toHaveAttribute('data-prefill-kind', 'prior_cycle');
    await expect(description).toContainText(/last year's answers/i);
    await expect(page.getByTestId('registration-entry-overwrite-warning')).toHaveCount(0);
    await expect(page.getByTestId('registration-entry-child-status')).toContainText(
      /returning/i,
    );

    await page.getByRole('button', { name: /start registration/i }).click();
    await expect(page.getByTestId('step1-on-file-notice')).toBeVisible();
    await expect(page.getByTestId('step1-overwrite-warning')).toHaveCount(0);
  });

  test('current-cycle update shows overwrite warning before submit', async ({
    page,
    context,
  }) => {
    test.slow();
    const email = generateUniqueEmail('gs-current');
    const fixture = await createCurrentCycleGuardianFixture(email, TEST_PASSWORD);
    createdUserId = fixture.user.id;

    await context.clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await openRegistrationEntry(page);

    const description = page.getByTestId('registration-entry-description');
    await expect(description).toHaveAttribute('data-prefill-kind', 'current_cycle');
    await expect(description).toContainText(/already registered/i);
    await expect(description).not.toContainText(/last year/i);
    await expect(page.getByTestId('registration-entry-overwrite-warning')).toContainText(
      /overwrite/i,
    );
    await expect(page.getByTestId('registration-entry-child-status')).toContainText(
      /registered/i,
    );

    await page.getByRole('button', { name: /start registration/i }).click();
    await expect(page.getByTestId('step1-overwrite-warning')).toBeVisible();
    await expect(page.getByTestId('step1-overwrite-warning')).toContainText(/overwrite/i);
    await expect(page.getByTestId('step1-on-file-notice')).toBeVisible();
  });
});

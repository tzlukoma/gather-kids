import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createCurrentCycleGuardianFixture,
  createReturningGuardianFixture,
  createE2EAdminClient,
  deleteTestUser,
  ensureRegistrationSmokeFixtures,
} from './utils/seed';
import {
  loginWithPassword,
  waitForPostLoginRoute,
} from './utils/r1-helpers';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Exact-local hostname only — never trust CI env alone or substring matches.
 * A misconfigured CI URL must not reach service-role seed/mutation helpers.
 */
function isDisposableLocalSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const normalized =
      hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname;
    return LOCAL_HOSTNAMES.has(normalized);
  } catch {
    return false;
  }
}

function assertDisposableLocalSupabase(): void {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  if (!key || !isDisposableLocalSupabaseUrl(url)) {
    throw new Error(
      `GatherSystem prefill E2E refuses non-disposable Supabase URL (exact localhost/127.0.0.1/::1 required): ${url || '(missing)'}`,
    );
  }
}

function isLocalSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  return Boolean(key) && isDisposableLocalSupabaseUrl(url);
}

/**
 * Prefer: `npm run test:e2e:gathersystem` which sets E2E=1 + OVERRIDE=true and
 * injects OVERRIDE into Playwright webServer (remote PostHog flags stay off locally).
 */
function gathersystemDescribe(title: string, fn: () => void) {
  test.describe(title, () => {
    test.skip(
      process.env.GATHERSYSTEM_REGISTRATION_E2E !== '1',
      'Set GATHERSYSTEM_REGISTRATION_E2E=1 (prefer: npm run test:e2e:gathersystem)',
    );
    test.skip(
      !isLocalSupabaseConfigured(),
      'Requires disposable local Supabase (exact localhost/127.0.0.1) in .env.e2e.local',
    );
    fn();
  });
}

async function continueToNextStep(page: Page) {
  await page.getByRole('button', { name: /save & continue/i }).click();
}

async function openRegistrationEntry(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await expect(page.getByTestId('registration-entry')).toBeVisible({
    timeout: 30000,
  });
}

async function advancePrefillWizardToConsents(page: Page) {
  // Step 1 (household prefilled) → 2 → 3 → 4 → 5
  await continueToNextStep(page);
  await expect(page.getByText(/who can collect the children/i)).toBeVisible({
    timeout: 15000,
  });
  await continueToNextStep(page);
  await expect(page.getByText(/tell us about/i).first()).toBeVisible({
    timeout: 15000,
  });
  // Compatible with #411: blank allergies block Save & continue.
  const noKnownAllergies = page.getByRole('radio', {
    name: /no known allergies/i,
  });
  if (await noKnownAllergies.count()) {
    await noKnownAllergies.click();
  }
  await continueToNextStep(page);
  await expect(page.getByText(/ministry programs|sunday school/i).first()).toBeVisible({
    timeout: 15000,
  });
  await continueToNextStep(page);
}

gathersystemDescribe('GatherSystem registration prefill states @mobile', () => {
  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    assertDisposableLocalSupabase();
    await ensureRegistrationSmokeFixtures();
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
    assertDisposableLocalSupabase();
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
    assertDisposableLocalSupabase();
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

  test('current-cycle update shows overwrite warning before submit and preserves ids', async ({
    page,
    context,
  }) => {
    test.slow();
    assertDisposableLocalSupabase();
    const email = generateUniqueEmail('gs-current');
    const fixture = await createCurrentCycleGuardianFixture(email, TEST_PASSWORD);
    createdUserId = fixture.user.id;
    const { householdId, childId } = fixture;

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

    await advancePrefillWizardToConsents(page);

    await expect(page.getByTestId('step5-overwrite-warning')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('step5-overwrite-warning')).toContainText(/overwrite/i);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({
      timeout: 30000,
    });

    const supabase = createE2EAdminClient();
    const { data: households, error: householdError } = await supabase
      .from('households')
      .select('household_id')
      .eq('email', email);
    expect(householdError).toBeNull();
    expect(households).toHaveLength(1);
    expect(households![0].household_id).toBe(householdId);

    const { data: children, error: childError } = await supabase
      .from('children')
      .select('child_id, household_id')
      .eq('household_id', householdId);
    expect(childError).toBeNull();
    expect(children).toHaveLength(1);
    expect(children![0].child_id).toBe(childId);
    expect(children![0].household_id).toBe(householdId);
  });
});

import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createE2EAdminClient,
  deleteTestUser,
  ensureRegistrationSmokeFixtures,
} from './utils/seed';
import {
  loginWithPassword,
  waitForPostLoginRoute,
} from './utils/r1-helpers';

const SYNTHETIC_ALLERGY_DETAILS = '  Peanut allergy — EpiPen (synthetic E2E)  ';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

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
      `GatherSystem allergy E2E refuses non-disposable Supabase URL (exact localhost/127.0.0.1/::1 required): ${url || '(missing)'}`,
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

async function startWizardRegistration(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');

  const startButton = page.getByRole('button', {
    name: /start registration|continue/i,
  });
  if (await startButton.count()) {
    await startButton.first().click();
  }

  await expect(page.getByRole('button', { name: /save & continue/i })).toBeVisible({
    timeout: 15000,
  });
}

async function fillWizardHousehold(page: Page) {
  await page
    .getByRole('textbox', { name: /street address|address line 1/i })
    .first()
    .fill('100 Allergy E2E St');
  await page.getByRole('textbox', { name: /^city$/i }).fill('Perth Amboy');
  await page.getByRole('textbox', { name: /^state$/i }).fill('NJ');
  await page.getByRole('textbox', { name: /zip/i }).fill('08861');
  await continueToNextStep(page);
}

async function fillWizardGuardians(page: Page) {
  await expect(page.getByText(/who can collect the children/i)).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: /^edit$/i }).first().click();

  await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
  await page.locator('input[name="guardians.0.last_name"]').fill('Allergy');
  await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');

  await page
    .getByRole('combobox')
    .filter({ hasText: /mother|father|select relationship/i })
    .first()
    .click();
  await page.getByRole('option', { name: 'Mother' }).click();

  await page.getByRole('button', { name: /^done$/i }).click();

  await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
  await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');

  await continueToNextStep(page);
}

async function addChildThroughGrade(page: Page) {
  await expect(page.getByText(/tell us about your children/i)).toBeVisible({
    timeout: 15000,
  });

  const addFirst = page.getByRole('button', { name: /add your first child/i });
  if (await addFirst.count()) {
    await addFirst.click();
  } else {
    const addChild = page.getByRole('button', { name: /add (another )?child/i });
    if (await addChild.count()) {
      await addChild.first().click();
    }
  }

  await page.locator('input[name="children.0.first_name"]').fill('Jordan');
  await page.locator('input[name="children.0.last_name"]').fill('Allergy');
  await page.locator('input[name="children.0.dob"]').fill('2015-05-15');

  const grade = page.getByRole('combobox', { name: /grade/i }).first();
  await grade.click();
  await page.getByRole('option').first().click();
}

async function finishMinistriesAndSubmit(page: Page) {
  await expect(
    page.getByText(/ministry programs|sunday school|expressed interest/i).first()
  ).toBeVisible({ timeout: 15000 });
  await continueToNextStep(page);

  const liability = page.getByRole('checkbox', { name: /liability release/i });
  const photo = page.getByRole('checkbox', { name: /photo release/i });
  if (!(await liability.isChecked())) await liability.check();
  if (!(await photo.isChecked())) await photo.check();

  await page.getByRole('button', { name: /submit registration/i }).click();
  await expect(page.getByText(/you.?re registered!/i)).toBeVisible({
    timeout: 30000,
  });
}

gathersystemDescribe('GatherSystem registration allergies @mobile @mutating', () => {
  // Context-safe mobile viewport only — full iPhone 13 device descriptors include
  // defaultBrowserType, which Playwright forbids inside a nested describe.
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

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

  test('blocks blank allergies and persists details after Back/Next + submit', async ({
    page,
    context,
  }) => {
    test.slow();
    assertDisposableLocalSupabase();

    const email = generateUniqueEmail('gs-allergies');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await context.clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);
    await fillWizardHousehold(page);
    await fillWizardGuardians(page);
    await addChildThroughGrade(page);

    const continueButton = page.getByRole('button', { name: /save & continue/i });
    await expect(continueButton).toBeDisabled();

    await page.getByRole('radio', { name: /no known allergies/i }).click();
    await expect(continueButton).toBeEnabled();

    // Switch to details and keep surrounding whitespace (#396 exact persistence).
    await page.getByRole('radio', { name: /this child has allergies/i }).click();
    await page.getByLabel(/allergy details/i).fill(SYNTHETIC_ALLERGY_DETAILS);
    await expect(continueButton).toBeEnabled();

    await continueToNextStep(page);
    await expect(
      page.getByText(/ministry programs|sunday school|expressed interest/i).first()
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /^back$/i }).click();
    await expect(page.getByLabel(/allergy details/i)).toHaveValue(
      SYNTHETIC_ALLERGY_DETAILS
    );

    await continueToNextStep(page);
    await finishMinistriesAndSubmit(page);

    const supabase = createE2EAdminClient();
    const { data: households, error: householdError } = await supabase
      .from('households')
      .select('household_id')
      .eq('email', email);
    expect(householdError).toBeNull();
    expect(households).toHaveLength(1);

    const { data: children, error: childError } = await supabase
      .from('children')
      .select('child_id, allergies, household_id')
      .eq('household_id', households![0].household_id);
    expect(childError).toBeNull();
    expect(children).toHaveLength(1);
    expect(children![0].allergies).toBe(SYNTHETIC_ALLERGY_DETAILS);
  });
});

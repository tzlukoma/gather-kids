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
import {
  assertDisposableLocalSupabase,
  continueToNextStep,
  gathersystemDescribe,
  isLocalSupabaseConfigured,
  startWizardRegistration,
  fillWizardGuardians,
  fillWizardHousehold,
  addChildFormOpen,
} from './utils/gathersystem-wizard';

const SYNTHETIC_ALLERGY_DETAILS = '  Peanut allergy — EpiPen (synthetic E2E)  ';

/**
 * Prefer: `npm run test:e2e:gathersystem` which sets E2E=1 + OVERRIDE=true and
 * injects OVERRIDE into Playwright webServer (remote PostHog flags stay off locally).
 */
async function addChildThroughGrade(page: Page) {
  await expect(page.getByRole('heading', { name: /tell us about your children/i }).first()).toBeVisible({
    timeout: 15000,
  });

  // Deliberately NOT the shared helper: it answers the allergy question, which
  // is the very gate under test here. `count()` is avoided for the #461 reason —
  // it resolves before the step renders and silently skips the click.
  await addChildFormOpen(page);

  await page.locator('input[name="children.0.first_name"]').fill('Jordan');
  await page.locator('input[name="children.0.last_name"]').fill('Allergy');
  await page.locator('input[name="children.0.dob"]').fill('2015-05-15');

  const grade = page.getByRole('combobox', { name: /grade/i }).first();
  await grade.click();
  await page.getByRole('option', { name: '4th Grade', exact: true }).click();
  await expect(grade).toContainText('4th');
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
  test.skip(
    !isLocalSupabaseConfigured(),
    'Requires disposable local Supabase (exact localhost/127.0.0.1) in .env.e2e.local',
  );
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
    await fillWizardHousehold(page, 'Allergy');
    await fillWizardGuardians(page, 'Allergy', email);
    await addChildThroughGrade(page);

    // #398 replaced the disabled-button gate with a recoverable one: Continue
    // stays enabled, and pressing it holds the step and names the problem. This
    // spec asserted `toBeDisabled()`, i.e. behaviour the product deliberately
    // dropped, so it failed on a contract that no longer exists.
    await continueToNextStep(page);
    await expect(page.locator('[data-testid="registration-problem-summary"]')).toBeVisible();
    await expect(
      page.getByText(/no known allergies.*or enter allergy details/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /tell us about your children/i }).first(),
    ).toBeVisible();

    await page.getByRole('radio', { name: /no known allergies/i }).click();

    // Switch to details and keep surrounding whitespace (#396 exact persistence).
    await page.getByRole('radio', { name: /this child has allergies/i }).click();
    await page.getByLabel(/allergy details/i).fill(SYNTHETIC_ALLERGY_DETAILS);
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
    // The address typed into the wizard is the *guardian's*; registration does
    // not copy it onto `households.email`, so looking the household up by that
    // column always returned zero rows and the allergy assertions below were
    // never reached.
    const { data: households, error: householdError } = await supabase
      .from('guardians')
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

  test('keeps No known allergies through Back/Next and persists none', async ({
    page,
    context,
  }) => {
    test.slow();
    assertDisposableLocalSupabase();

    const email = generateUniqueEmail('gs-allergies-none');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await context.clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);
    await fillWizardHousehold(page, 'Allergy');
    await fillWizardGuardians(page, 'Allergy', email);
    await addChildThroughGrade(page);

    // #398 replaced the disabled-button gate with a recoverable one: Continue
    // stays enabled, and pressing it holds the step and names the problem. This
    // spec asserted `toBeDisabled()`, i.e. behaviour the product deliberately
    // dropped, so it failed on a contract that no longer exists.
    await continueToNextStep(page);
    await expect(page.locator('[data-testid="registration-problem-summary"]')).toBeVisible();
    await expect(
      page.getByText(/no known allergies.*or enter allergy details/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /tell us about your children/i }).first(),
    ).toBeVisible();

    await page.getByRole('radio', { name: /no known allergies/i }).click();

    await continueToNextStep(page);
    await expect(
      page.getByText(/ministry programs|sunday school|expressed interest/i).first()
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /^back$/i }).click();
    await expect(
      page.getByRole('radio', { name: /no known allergies/i })
    ).toBeChecked();
    await expect(page.getByLabel(/allergy details/i)).toHaveCount(0);
    await continueToNextStep(page);
    await finishMinistriesAndSubmit(page);

    const supabase = createE2EAdminClient();
    // The address typed into the wizard is the *guardian's*; registration does
    // not copy it onto `households.email`, so looking the household up by that
    // column always returned zero rows and the allergy assertions below were
    // never reached.
    const { data: households, error: householdError } = await supabase
      .from('guardians')
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
    expect(children![0].allergies).toBe('none');
  });
});

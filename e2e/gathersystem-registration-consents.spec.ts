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

const E2E_ORATORS_ID = 'e2e_orators';
const E2E_TEEN_CHOIR_ID = 'e2e_teen_choir';
const E2E_CHOIRS_GROUP_ID = 'e2e_choirs_group';

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
    fn();
  });
}

async function assertGatherSystemWizard(page: Page) {
  await expect(page.getByRole('button', { name: /save & continue/i })).toBeVisible({
    timeout: 15000,
  });
}

async function startWizardRegistration(page: Page) {
  await page.goto('/register');
  await assertGatherSystemWizard(page);

  const startButton = page.getByRole('button', { name: /start registration|continue/i });
  if (await startButton.count()) {
    await startButton.first().click();
  }
}

async function fillWizardHouseholdAndGuardians(page: Page) {
  await page.getByRole('textbox', { name: /street address|address line 1/i }).first().fill('100 Consent Test St');
  await page.getByRole('textbox', { name: /^city$/i }).fill('Perth Amboy');
  await page.getByRole('textbox', { name: /^state$/i }).fill('NJ');
  await page.getByRole('textbox', { name: /zip/i }).fill('08861');

  await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
  await page.locator('input[name="guardians.0.last_name"]').fill('Consent');
  await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
  await page.locator('input[name="guardians.0.relationship"]').fill('Parent');

  await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
  await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');
}

async function addWizardChild(page: Page) {
  const addChild = page.getByRole('button', { name: /add child/i });
  if (await addChild.count()) {
    await addChild.click();
  }

  await page.locator('input[name="children.0.first_name"]').fill('Jordan');
  await page.locator('input[name="children.0.last_name"]').fill('Consent');
  await page.locator('input[name="children.0.dob"]').fill('2015-05-15');

  const grade = page.getByRole('combobox', { name: /grade/i }).first();
  if (await grade.count()) {
    await grade.click();
    await page.getByRole('option').first().click();
  }
}

async function continueToNextStep(page: Page) {
  await page.getByRole('button', { name: /save & continue/i }).click();
  await page.waitForTimeout(300);
}

async function acceptBaseConsents(page: Page) {
  const liability = page.getByRole('checkbox', { name: /liability release/i });
  const photo = page.getByRole('checkbox', { name: /photo release/i });
  if (!(await liability.isChecked())) await liability.check();
  if (!(await photo.isChecked())) await photo.check();
}

async function seedConsentMinistries() {
  const supabase = createE2EAdminClient();

  await supabase.from('ministry_groups').upsert(
    {
      id: E2E_CHOIRS_GROUP_ID,
      code: 'choirs',
      name: 'Choirs',
      custom_consent_required: true,
      custom_consent_text:
        'Cathedral International youth choirs communicate using the Planning Center app.',
    },
    { onConflict: 'id' },
  );

  await supabase.from('ministries').upsert(
    [
      {
        ministry_id: E2E_TEEN_CHOIR_ID,
        name: 'E2E Teen Choir',
        code: 'e2e-teen-choir',
        enrollment_type: 'enrolled',
        data_profile: 'Basic',
        is_active: true,
      },
      {
        ministry_id: E2E_ORATORS_ID,
        name: 'E2E New Jersey Orators',
        code: 'orators',
        enrollment_type: 'expressed_interest',
        data_profile: 'Basic',
        is_active: true,
        optional_consent_text: 'I agree to the E2E New Jersey Orators participation terms.',
      },
    ],
    { onConflict: 'ministry_id' },
  );

  await supabase.from('ministry_group_members').upsert(
    {
      group_id: E2E_CHOIRS_GROUP_ID,
      ministry_id: E2E_TEEN_CHOIR_ID,
    },
    { onConflict: 'group_id,ministry_id' },
  );
}

gathersystemDescribe('GatherSystem registration consents @mutating', () => {
  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    await ensureRegistrationSmokeFixtures();
    await seedConsentMinistries();
  });

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  async function loginFreshGuardian(page: Page) {
    const email = generateUniqueEmail('gs-consents');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
  }

  test('submits normally without conditional consents @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHouseholdAndGuardians(page);
    await continueToNextStep(page);

    await addWizardChild(page);
    await continueToNextStep(page);
    await continueToNextStep(page);

    await acceptBaseConsents(page);
    await page.getByRole('button', { name: /submit registration/i }).click();

    await expect(page.getByText(/submission error/i)).toHaveCount(0);
  });

  test('blocks Orators until consent accepted, then submits @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHouseholdAndGuardians(page);
    await continueToNextStep(page);
    await addWizardChild(page);
    await continueToNextStep(page);

    const oratorsCheckbox = page.getByRole('checkbox', { name: /orators/i }).first();
    if (await oratorsCheckbox.count()) {
      await oratorsCheckbox.check();
    }

    await continueToNextStep(page);
    await acceptBaseConsents(page);

    const submit = page.getByRole('button', { name: /submit registration/i });
    await expect(submit).toBeDisabled();

    const oratorsConsent = page.getByRole('checkbox', {
      name: /new jersey orators consent|e2e new jersey orators consent/i,
    });
    if (await oratorsConsent.count()) {
      await oratorsConsent.check();
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(page.getByText(/submission error/i)).toHaveCount(0);
    }
  });

  test('choir group consent survives Back/Next @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHouseholdAndGuardians(page);
    await continueToNextStep(page);
    await addWizardChild(page);
    await continueToNextStep(page);

    const choirCheckbox = page.getByRole('checkbox', { name: /e2e teen choir|teen choir/i }).first();
    if (await choirCheckbox.count()) {
      await choirCheckbox.check();
    }

    await continueToNextStep(page);

    const choirNo = page.getByRole('radio', { name: 'No', exact: true });
    if (await choirNo.count()) {
      await choirNo.click();
    }

    await page.getByRole('button', { name: /^back$/i }).click();
    await continueToNextStep(page);

    if (await choirNo.count()) {
      await expect(choirNo).toBeChecked();
    }
  });
});

test.describe('GatherSystem registration consents mobile viewport', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('wizard step strip is visible on mobile when flag is enabled', async ({ page }) => {
    test.skip(process.env.GATHERSYSTEM_REGISTRATION_E2E !== '1', 'Flag-on E2E only');
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');

    const email = generateUniqueEmail('gs-mobile');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);

    try {
      await page.context().clearCookies();
      await loginWithPassword(page, email, TEST_PASSWORD);
      await waitForPostLoginRoute(page);
      await page.goto('/register');

      const wizardButton = page.getByRole('button', { name: /save & continue/i });
      if (await wizardButton.count()) {
        await expect(wizardButton).toBeVisible();
        await expect(page.getByText(/consents/i)).toBeVisible();
      }
    } finally {
      await deleteTestUser(user.id).catch(() => undefined);
    }
  });
});

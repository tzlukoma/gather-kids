import { test, expect, devices, type Page } from '@playwright/test';
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

const E2E_CUSTOM_MINISTRY_ID = 'e2e_custom_questions_ministry';
const E2E_CUSTOM_MINISTRY_CODE = 'e2e-custom-questions';
const CUSTOM_QUESTION_ID = 'experience-notes';
const CUSTOM_ANSWER = 'E2E custom answer for ministry question';

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

async function startWizardRegistration(page: Page) {
  await page.goto('/register');

  const startButton = page.getByRole('button', { name: /start registration|continue/i });
  if (await startButton.count()) {
    await startButton.first().click();
  }

  await expect(page.getByRole('button', { name: /save & continue/i })).toBeVisible({
    timeout: 15000,
  });
}

async function fillWizardThroughChildStep(page: Page) {
  await page.getByRole('textbox', { name: /street address|address line 1/i }).first().fill('100 Custom Data St');
  await page.getByRole('textbox', { name: /^city$/i }).fill('Perth Amboy');
  await page.getByRole('textbox', { name: /^state$/i }).fill('NJ');
  await page.getByRole('textbox', { name: /zip/i }).fill('08861');

  await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
  await page.locator('input[name="guardians.0.last_name"]').fill('Custom');
  await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
  await page.locator('input[name="guardians.0.relationship"]').fill('Parent');

  await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
  await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');

  await page.getByRole('button', { name: /save & continue/i }).click();

  const addChild = page.getByRole('button', { name: /add child/i });
  if (await addChild.count()) {
    await addChild.click();
  }

  await page.locator('input[name="children.0.first_name"]').fill('Jordan');
  await page.locator('input[name="children.0.last_name"]').fill('Custom');
  await page.locator('input[name="children.0.dob"]').fill('2015-05-15');

  const grade = page.getByRole('combobox', { name: /grade/i }).first();
  if (await grade.count()) {
    await grade.click();
    await page.getByRole('option').first().click();
  }

  await page.getByRole('button', { name: /save & continue/i }).click();
}

async function seedCustomQuestionMinistry() {
  const supabase = createE2EAdminClient();

  const { error } = await supabase.from('ministries').upsert(
    {
      ministry_id: E2E_CUSTOM_MINISTRY_ID,
      name: 'E2E Custom Questions Ministry',
      code: E2E_CUSTOM_MINISTRY_CODE,
      enrollment_type: 'enrolled',
      data_profile: 'Basic',
      is_active: true,
      min_age: 0,
      max_age: 18,
      custom_questions: [
        {
          id: CUSTOM_QUESTION_ID,
          text: 'Tell us about prior experience',
          type: 'text',
        },
      ],
    },
    { onConflict: 'ministry_id' },
  );

  expect(error).toBeNull();
}

async function cleanupCustomQuestionMinistry() {
  const supabase = createE2EAdminClient();
  await supabase.from('ministry_enrollments').delete().eq('ministry_id', E2E_CUSTOM_MINISTRY_ID);
  await supabase.from('ministries').delete().eq('ministry_id', E2E_CUSTOM_MINISTRY_ID);
}

gathersystemDescribe('GatherSystem registration custom data @mutating', () => {
  test.use({ ...devices['iPhone 13'] });

  let createdUserId: string | undefined;
  let childId: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    await ensureRegistrationSmokeFixtures();
    await seedCustomQuestionMinistry();
  });

  test.afterAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    await cleanupCustomQuestionMinistry();
  });

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
    childId = undefined;
  });

  test('persists custom question answers after back/next and submit @mobile', async ({
    page,
  }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    const email = generateUniqueEmail('gs-custom-data');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);
    await fillWizardThroughChildStep(page);

    const ministryCard = page.getByText('E2E Custom Questions Ministry');
    await expect(ministryCard).toBeVisible({ timeout: 15000 });

    const ministryCheckbox = page
      .locator('label')
      .filter({ hasText: 'Jordan' })
      .locator('..')
      .getByRole('checkbox')
      .first();
    await ministryCheckbox.check();

    const customField = page.getByLabel('Tell us about prior experience');
    await expect(customField).toBeVisible({ timeout: 15000 });
    await customField.fill(CUSTOM_ANSWER);

    await page.getByRole('button', { name: /save & continue/i }).click();
    await page.getByRole('button', { name: /back/i }).click();

    await expect(customField).toHaveValue(CUSTOM_ANSWER);

    await page.getByRole('button', { name: /save & continue/i }).click();

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();
    await expect(page.getByText(/registration complete|thank you/i)).toBeVisible({
      timeout: 30000,
    });

    const supabase = createE2EAdminClient();
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('child_id')
      .eq('first_name', 'Jordan')
      .eq('last_name', 'Custom')
      .limit(1);

    expect(childError).toBeNull();
    expect(children?.length).toBe(1);
    childId = children![0].child_id;

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('ministry_enrollments')
      .select('custom_fields')
      .eq('child_id', childId)
      .eq('ministry_id', E2E_CUSTOM_MINISTRY_ID)
      .limit(1);

    expect(enrollmentError).toBeNull();
    expect(enrollments?.length).toBe(1);
    expect(enrollments![0].custom_fields).toMatchObject({
      [CUSTOM_QUESTION_ID]: CUSTOM_ANSWER,
    });
  });
});

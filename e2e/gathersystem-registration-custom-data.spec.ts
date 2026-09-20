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
  addFirstChild,
} from './utils/gathersystem-wizard';

const E2E_CUSTOM_MINISTRY_ID = 'e2e_custom_questions_ministry';
const E2E_CUSTOM_MINISTRY_CODE = 'e2e-custom-questions';
const CUSTOM_QUESTION_ID = 'experience-notes';
const CUSTOM_ANSWER = 'E2E custom answer for ministry question';

/**
 * Exact-local hostname only — never trust substring matches.
 * A misconfigured URL must not reach service-role seed/mutation helpers.
 */
/**
 * Flag-on GatherSystem E2E requires:
 * - GATHERSYSTEM_REGISTRATION_E2E=1 (unskip these tests)
 * - GATHERSYSTEM_REGISTRATION_OVERRIDE=true on the Next.js process
 *
 * Prefer `npm run test:e2e:gathersystem`, which sets both and starts Playwright's
 * webServer with the override (remote PostHog flags stay off in local/dev).
 * When only E2E=1 is set, e2e.config.ts still injects OVERRIDE into webServer.env.
 */
/** Advance through household → guardians → children so Step 4 (ministries) is active. */
async function fillWizardThroughChildStep(
  page: Page,
  lastName: string,
  guardianEmail: string,
) {
  await fillWizardHousehold(page, lastName);
  await fillWizardGuardians(page, lastName, guardianEmail);
  await addFirstChild(page, {
    first_name: 'Jordan',
    last_name: 'Custom',
    dob: '2015-05-15',
    grade: '4th',
  });
  await continueToNextStep(page);
  await expect(page.getByText(/ministry programs|expressed interest/i).first()).toBeVisible({
    timeout: 15000,
  });
}

async function seedCustomQuestionMinistry() {
  assertDisposableLocalSupabase();
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
  assertDisposableLocalSupabase();
  const supabase = createE2EAdminClient();
  await supabase.from('ministry_enrollments').delete().eq('ministry_id', E2E_CUSTOM_MINISTRY_ID);
  await supabase.from('ministries').delete().eq('ministry_id', E2E_CUSTOM_MINISTRY_ID);
}

gathersystemDescribe('GatherSystem registration custom data @mutating', () => {
  // Context-safe mobile viewport only — full iPhone 13 device descriptors include
  // defaultBrowserType, which Playwright forbids inside a nested describe.
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  let createdUserId: string | undefined;
  let childId: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    assertDisposableLocalSupabase();
    await ensureRegistrationSmokeFixtures();
    await seedCustomQuestionMinistry();
  });

  test.afterAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    assertDisposableLocalSupabase();
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
    assertDisposableLocalSupabase();

    const email = generateUniqueEmail('gs-custom-data');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);
    await fillWizardThroughChildStep(page, 'CustomData', email);

    // Scope to this ministry's card: the per-child checkboxes are labelled with
    // the child's name, so an unscoped `hasText: 'Jordan'` ticks whichever
    // ministry happens to render first — which is why the custom question below
    // never appeared.
    const ministryCard = page.locator(
      `[data-ministry-code="${E2E_CUSTOM_MINISTRY_CODE}"]`,
    );
    await expect(ministryCard).toBeVisible({ timeout: 15000 });

    const ministryCheckbox = ministryCard.getByRole('checkbox').first();
    await ministryCheckbox.check();

    const customField = page.getByLabel('Tell us about prior experience');
    await expect(customField).toBeVisible({ timeout: 15000 });
    await customField.fill(CUSTOM_ANSWER);

    await continueToNextStep(page);
    await page.getByRole('button', { name: /^back$/i }).click();

    await expect(customField).toHaveValue(CUSTOM_ANSWER);

    await continueToNextStep(page);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({
      timeout: 30000,
    });

    const supabase = createE2EAdminClient();

    // Scoped to *this* run's household, via the guardian address, which is
    // unique per test. Matching on first/last name with `.limit(1)` and no
    // ordering picks an arbitrary "Jordan Custom" from any earlier run against
    // the same database, and then asserts on the wrong child's enrollments.
    const { data: guardianRows, error: guardianError } = await supabase
      .from('guardians')
      .select('household_id')
      .eq('email', email);
    expect(guardianError).toBeNull();
    expect(guardianRows).toHaveLength(1);

    const { data: children, error: childError } = await supabase
      .from('children')
      .select('child_id')
      .eq('household_id', guardianRows![0].household_id)
      .eq('first_name', 'Jordan');

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

    // `custom_fields` is a jsonb column, but the adapter writes it through
    // `serializeIfObject`, which JSON.stringifies first — so it reads back as a
    // JSON *string* rather than an object. See #472; that is a stored-shape bug
    // to fix separately, with a backfill.
    //
    // This asserts the decoded answer and accepts either shape, so it proves the
    // answer persisted without freezing the current encoding in place: it keeps
    // passing once #472 is fixed.
    const raw = enrollments![0].custom_fields as unknown;
    const customFields =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : raw;

    expect(customFields).toMatchObject({
      [CUSTOM_QUESTION_ID]: CUSTOM_ANSWER,
    });
  });
});

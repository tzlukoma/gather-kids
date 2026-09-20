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

const E2E_ORATORS_ID = 'e2e_orators';
const E2E_ORATORS_CODE = 'e2e-orators';
const E2E_TEEN_CHOIR_ID = 'e2e_teen_choir';
/**
 * The wizard asks for this group by code — `getMinistriesByGroupCode('choirs')`
 * is hard-coded in `registration-wizard/index.tsx` — so the choir-consent path
 * can only be exercised through a `ministry_groups` row with code `choirs`.
 * Its id is a `uuid PRIMARY KEY` assigned by the database: never invent it.
 * This fixture used to upsert the string `'e2e_choirs_group'` as the id and
 * failed every run with `invalid input syntax for type uuid`.
 *
 * CI registration-smoke starts a migration-only local Supabase (no
 * `seed:dev`), so the shared `choirs` row from `scripts/seed/dev_seed.js` is
 * often missing. Insert when absent; reuse and restore when `seed:dev` already
 * created it.
 */
const CHOIRS_GROUP_CODE = 'choirs';
const CHOIRS_CONSENT_TEXT =
  'Cathedral International youth choirs communicate using the Planning Center app.';

/**
 * Step 4 shows one checkbox per child per ministry, and each checkbox is
 * labelled with the *child's* name — so `getByRole('checkbox', {name: /orators/i})`
 * matches nothing. `MinistryCard` carries `data-ministry-code`, which is the
 * stable way to reach a particular ministry's controls.
 */
function ministryCard(page: Page, code: string) {
  return page.locator(`[data-ministry-code="${code}"]`);
}

async function acceptBaseConsents(page: Page) {
  const liability = page.getByRole('checkbox', { name: /liability release/i });
  const photo = page.getByRole('checkbox', { name: /photo release/i });
  if (!(await liability.isChecked())) await liability.check();
  if (!(await photo.isChecked())) await photo.check();
}

type ChoirsGroupConsent = {
  id: string;
  custom_consent_required: boolean | null;
  custom_consent_text: string | null;
};

/**
 * When `seed:dev` already inserted `choirs`, capture its consent fields and
 * restore them. When CI has no such row, insert one (database UUID) and delete
 * that row in cleanup — never delete a pre-existing shared group.
 */
let createdChoirsGroup = false;
let priorChoirsConsent: ChoirsGroupConsent | null = null;

async function seedConsentMinistries() {
  const supabase = createE2EAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from('ministry_groups')
    .select('id, custom_consent_required, custom_consent_text')
    .eq('code', CHOIRS_GROUP_CODE)
    .maybeSingle();
  expect(lookupError).toBeNull();

  if (existing) {
    createdChoirsGroup = false;
    priorChoirsConsent = existing;
    const { error: groupError } = await supabase
      .from('ministry_groups')
      .update({
        custom_consent_required: true,
        custom_consent_text: CHOIRS_CONSENT_TEXT,
      })
      .eq('id', existing.id);
    expect(groupError).toBeNull();
  } else {
    createdChoirsGroup = true;
    const { data: inserted, error: insertError } = await supabase
      .from('ministry_groups')
      .insert({
        code: CHOIRS_GROUP_CODE,
        name: 'Choirs',
        description:
          'Youth choir ministries grouped together for shared management and notifications',
        custom_consent_required: true,
        custom_consent_text: CHOIRS_CONSENT_TEXT,
      })
      .select('id, custom_consent_required, custom_consent_text')
      .single();
    expect(insertError, insertError?.message).toBeNull();
    expect(
      inserted,
      'inserting the choirs ministry group should return a database-assigned uuid',
    ).not.toBeNull();
    priorChoirsConsent = inserted;
  }

  const { error: ministriesError } = await supabase.from('ministries').upsert(
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
        code: E2E_ORATORS_CODE,
        enrollment_type: 'expressed_interest',
        data_profile: 'Basic',
        is_active: true,
        optional_consent_text: 'I agree to the E2E New Jersey Orators participation terms.',
      },
    ],
    { onConflict: 'ministry_id' },
  );
  expect(ministriesError).toBeNull();

  const { error: memberError } = await supabase.from('ministry_group_members').upsert(
    {
      group_id: priorChoirsConsent!.id,
      ministry_id: E2E_TEEN_CHOIR_ID,
    },
    { onConflict: 'group_id,ministry_id' },
  );
  expect(memberError).toBeNull();
}

async function cleanupConsentMinistries() {
  const supabase = createE2EAdminClient();
  await supabase.from('ministry_group_members').delete().eq('ministry_id', E2E_TEEN_CHOIR_ID);
  await supabase.from('ministries').delete().eq('ministry_id', E2E_ORATORS_ID);
  await supabase.from('ministries').delete().eq('ministry_id', E2E_TEEN_CHOIR_ID);

  if (priorChoirsConsent) {
    if (createdChoirsGroup) {
      await supabase.from('ministry_groups').delete().eq('id', priorChoirsConsent.id);
    } else {
      await supabase
        .from('ministry_groups')
        .update({
          custom_consent_required: priorChoirsConsent.custom_consent_required,
          custom_consent_text: priorChoirsConsent.custom_consent_text,
        })
        .eq('id', priorChoirsConsent.id);
    }
    priorChoirsConsent = null;
    createdChoirsGroup = false;
  }
}

gathersystemDescribe('GatherSystem registration consents @mutating', () => {
  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    await ensureRegistrationSmokeFixtures();
    await seedConsentMinistries();
  });

  test.afterAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    await cleanupConsentMinistries();
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
    return email;
  }

  test('submits normally without conditional consents @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    const email = await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHousehold(page, 'Consent');
    await fillWizardGuardians(page, 'Consent', email);

    await addFirstChild(page, { first_name: 'Jordan', last_name: 'Consent', dob: '2015-05-15', grade: '4th' });
    await continueToNextStep(page);
    await continueToNextStep(page);

    await acceptBaseConsents(page);
    await page.getByRole('button', { name: /submit registration/i }).click();

    await expect(page.getByText(/submission error/i)).toHaveCount(0);
  });

  test('blocks Orators until consent accepted, then submits @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    const email = await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHousehold(page, 'Consent');
    await fillWizardGuardians(page, 'Consent', email);
    await addFirstChild(page, { first_name: 'Jordan', last_name: 'Consent', dob: '2015-05-15', grade: '4th' });
    await continueToNextStep(page);

    const oratorsCard = ministryCard(page, E2E_ORATORS_CODE);
    await expect(oratorsCard).toBeVisible({ timeout: 15000 });
    const oratorsCheckbox = oratorsCard.getByRole('checkbox').first();
    await expect(oratorsCheckbox).toBeVisible();
    await oratorsCheckbox.check();

    await continueToNextStep(page);
    await acceptBaseConsents(page);

    // #398 replaced the disabled-submit gate with a recoverable one: Submit
    // stays enabled and pressing it holds the step and names what is missing.
    // Asserting `toBeDisabled()` tested a contract the product has dropped.
    const submit = page.getByRole('button', { name: /submit registration/i });

    const oratorsConsent = page.getByRole('checkbox', {
      name: /e2e new jersey orators consent/i,
    });
    await expect(oratorsConsent).toBeVisible();

    // Unanswered, the conditional consent must block the submit.
    //
    // Asserting only `toHaveCount(0)` on the success screen would pass the
    // instant after the click, before a *successful* submit had rendered
    // anything — proving nothing. So assert the positive evidence of blocking
    // first, and only then that we never reached the receipt.
    await submit.click();
    await expect(page.locator('[data-testid="registration-problem-summary"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/you.?re registered!/i)).toHaveCount(0);

    await oratorsConsent.check();
    await submit.click();
    await expect(page.getByText(/submission error/i)).toHaveCount(0);
  });

  test('choir group consent survives Back/Next @desktop', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();

    const email = await loginFreshGuardian(page);
    await startWizardRegistration(page);

    await fillWizardHousehold(page, 'Consent');
    await fillWizardGuardians(page, 'Consent', email);
    await addFirstChild(page, { first_name: 'Jordan', last_name: 'Consent', dob: '2015-05-15', grade: '4th' });
    await continueToNextStep(page);

    const choirCard = ministryCard(page, 'e2e-teen-choir');
    await expect(choirCard).toBeVisible({ timeout: 15000 });
    const choirCheckbox = choirCard.getByRole('checkbox').first();
    await expect(choirCheckbox).toBeVisible();
    await choirCheckbox.check();

    await continueToNextStep(page);

    const choirNo = page.getByRole('radio', { name: 'No', exact: true });
    await expect(choirNo).toBeVisible();
    await choirNo.click();

    await page.getByRole('button', { name: /^back$/i }).click();
    await continueToNextStep(page);

    await expect(choirNo).toBeChecked();
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
      await startWizardRegistration(page);

      await expect(page.getByRole('button', { name: /save & continue/i })).toBeVisible();
      await expect(page.getByText(/consents/i).filter({ visible: true }).first()).toBeVisible();
    } finally {
      await deleteTestUser(user.id).catch(() => undefined);
    }
  });
});

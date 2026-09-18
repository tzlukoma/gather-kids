import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createE2EAdminClient,
  deleteTestUser,
  ensureRegistrationSmokeFixtures,
} from './utils/seed';
import { loginWithPassword, waitForPostLoginRoute } from './utils/r1-helpers';
import {
  assertDisposableLocalSupabase,
  continueToNextStep,
  fillChildAtIndex,
  gathersystemDescribe,
  isLocalSupabaseConfigured,
  startWizardRegistration,
} from './utils/gathersystem-wizard';

/**
 * #398: every step now blocks on its own fields, and says why.
 *
 * The old gate was a hand-written truthiness check over a few named fields —
 * `guardians[0].mobile_phone` and nothing past index 0. Anything it missed
 * travelled to step 5 and met a Submit button gated on whole-form validity,
 * which could not explain itself, because a form only reports problems on a
 * submit it actually runs. Families saw a dead button and no message.
 *
 * Jest covers the path→step mapping and the gate against the real schema. Only
 * a browser shows what a parent experiences: press Continue, read the reason,
 * fix it, move on. These run at 390×844 because that is where the old failure
 * was worst — an invisible error on a step already scrolled past.
 */

const SUMMARY = '[data-testid="registration-problem-summary"]';

/**
 * The summary's own list items. Every message also appears under its input, so
 * a bare `getByText` matches twice and trips strict mode — and matching only
 * the field-level copy would not prove the summary listed it at all.
 */
function problemItems(page: Page) {
  return page.locator(SUMMARY).getByRole('listitem');
}

async function expectProblem(page: Page, text: RegExp) {
  await expect(problemItems(page).filter({ hasText: text })).toHaveCount(1);
}

async function pressContinue(page: Page) {
  await page.getByRole('button', { name: /save & continue/i }).click();
}

/** The wizard renders the current step's title as its only h1. */
async function expectStillOn(page: Page, heading: RegExp) {
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

gathersystemDescribe('GatherSystem registration step validation @mutating', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  let createdUserId: string | undefined;
  let createdLastName: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    assertDisposableLocalSupabase();
    await ensureRegistrationSmokeFixtures();
  });

  test.afterEach(async () => {
    if (createdLastName && isLocalSupabaseConfigured()) {
      const supabase = createE2EAdminClient();
      const { data: children } = await supabase
        .from('children')
        .select('child_id')
        .eq('last_name', createdLastName);
      for (const child of children ?? []) {
        await supabase.from('ministry_enrollments').delete().eq('child_id', child.child_id);
        await supabase.from('registrations').delete().eq('child_id', child.child_id);
        await supabase.from('children').delete().eq('child_id', child.child_id);
      }
      createdLastName = undefined;
    }

    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  async function signInAndOpenWizard(page: Page, slug: string) {
    const email = generateUniqueEmail(slug);
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);
  }

  test('blocks each step until its own fields are valid, then submits @mobile', async ({
    page,
  }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();
    assertDisposableLocalSupabase();

    const lastName = `StepVal${Date.now()}`;
    createdLastName = lastName;
    await signInAndOpenWizard(page, 'gs-step-validation');

    // ---- Step 1: empty address ------------------------------------------
    await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
      timeout: 20000,
    });
    await pressContinue(page);

    // Before #398 the button was simply disabled: nothing happened, and there
    // was no way to learn which field was wanted.
    await expect(page.locator(SUMMARY)).toBeVisible();
    await expectProblem(page, /Household:.*Address is required\./);
    await expectStillOn(page, /confirm your household/i);

    await page.locator('input[name="household.name"]').fill(`${lastName} Household`);
    await page.locator('input[name="household.address_line1"]').fill('100 Validation Way');
    await page.locator('input[name="household.city"]').fill('Perth Amboy');
    await page.locator('input[name="household.state"]').fill('NJ');
    await page.locator('input[name="household.zip"]').fill('08861');
    await continueToNextStep(page);

    // ---- Step 2: the guardian card is empty and collapsed -----------------
    await expectStillOn(page, /who can collect the children/i);
    await pressContinue(page);
    await expect(page.locator(SUMMARY)).toBeVisible();
    await expectProblem(page, /Guardian 1:.*First name is required\./);
    await expectStillOn(page, /who can collect the children/i);

    // The card opens itself: a collapsed guardian has no input to carry the
    // message or take focus, so naming the problem would be useless.
    await expect(page.locator('input[name="guardians.0.first_name"]')).toBeVisible();

    await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
    await page.locator('input[name="guardians.0.last_name"]').fill(lastName);

    // Present but too short. `Boolean('5')` satisfied the old gate, and the
    // schema rejected it three steps later.
    await page.locator('input[name="guardians.0.mobile_phone"]').fill('5');
    await pressContinue(page);
    await expectProblem(page, /Guardian 1:.*A valid phone number is required\./);
    await expectStillOn(page, /who can collect the children/i);

    await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
    await page
      .getByRole('combobox')
      .filter({ hasText: /mother|father|select relationship/i })
      .first()
      .click();
    // Exact — 'Grandmother' contains 'Mother'.
    await page.getByRole('option', { name: 'Mother', exact: true }).click();
    await page.getByRole('button', { name: /^done$/i }).click();

    // The emergency contact belongs to this step too. The old gate did check
    // it, so this confirms the rewrite did not quietly drop it.
    await pressContinue(page);
    await expectProblem(page, /Emergency contact:.*A valid phone number is required\./);

    await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
    await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
    await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
    await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');
    await continueToNextStep(page);

    // ---- Step 3: no child, then an incomplete one ------------------------
    await expectStillOn(page, /tell us about your children/i);
    await pressContinue(page);
    await expectProblem(page, /At least one child is required\./);
    await expectStillOn(page, /tell us about your children/i);

    await page.getByRole('button', { name: /add your first child/i }).click();
    await page.locator('input[name="children.0.first_name"]').fill('Sky');
    await page.locator('input[name="children.0.last_name"]').fill(lastName);
    // Date of birth and grade left empty on purpose: the old gate checked only
    // that the array was non-empty and that allergies had been answered.
    await pressContinue(page);
    await expect(page.locator(SUMMARY)).toBeVisible();
    await expectProblem(page, /Child 1:.*Valid date of birth is required\./);
    await expectProblem(page, /Child 1:.*Grade is required\./);
    await expectStillOn(page, /tell us about your children/i);

    await fillChildAtIndex(page, 0, {
      first_name: 'Sky',
      last_name: lastName,
      dob: '2016-03-02',
      grade: '3rd',
    });
    await continueToNextStep(page);

    // ---- Step 4: nothing is required here ---------------------------------
    await expect(page.getByText(/ministry programs|expressed interest/i).first()).toBeVisible({
      timeout: 15000,
    });
    await continueToNextStep(page);

    // ---- Step 5: submit with the consents unticked ------------------------
    await expectStillOn(page, /review and submit/i);
    const submit = page.getByRole('button', { name: /submit registration/i });

    // No longer disabled. It can be pressed precisely so that pressing it can
    // produce an explanation.
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.locator(SUMMARY)).toBeVisible();
    await expectProblem(page, /Consents:.*Liability consent is required\./);
    await expectProblem(page, /Consents:.*Photo release consent is required\./);
    await expect(page.getByRole('heading', { name: /registered!/i })).toHaveCount(0);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    await liability.scrollIntoViewIfNeeded();
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await submit.scrollIntoViewIfNeeded();
    await submit.click();

    await expect(page.getByRole('heading', { name: /registered!/i })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(`Sky ${lastName}`)).toBeVisible();

    const supabase = createE2EAdminClient();
    const { data: children, error } = await supabase
      .from('children')
      .select('first_name')
      .eq('last_name', lastName);
    expect(error).toBeNull();
    expect(children).toHaveLength(1);
  });

  test('validates a second guardian, not only the first @mobile', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();
    assertDisposableLocalSupabase();

    const lastName = `SecondGuardian${Date.now()}`;
    createdLastName = lastName;
    await signInAndOpenWizard(page, 'gs-second-guardian');

    await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
      timeout: 20000,
    });
    await page.locator('input[name="household.name"]').fill(`${lastName} Household`);
    await page.locator('input[name="household.address_line1"]').fill('100 Validation Way');
    await page.locator('input[name="household.city"]').fill('Perth Amboy');
    await page.locator('input[name="household.state"]').fill('NJ');
    await page.locator('input[name="household.zip"]').fill('08861');
    await continueToNextStep(page);

    // First guardian and emergency contact complete.
    await expectStillOn(page, /who can collect the children/i);
    await page.getByRole('button', { name: /^edit$/i }).first().click();
    await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
    await page.locator('input[name="guardians.0.last_name"]').fill(lastName);
    await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
    await page
      .getByRole('combobox')
      .filter({ hasText: /mother|father|select relationship/i })
      .first()
      .click();
    await page.getByRole('option', { name: 'Mother', exact: true }).click();
    await page.getByRole('button', { name: /^done$/i }).click();

    await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
    await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
    await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
    await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');

    // A grandparent added to the pickup list with a name but no phone. This is
    // the original bug's shape: the old gate read guardians[0] only, so this
    // family sailed through to a dead Submit button on step 5.
    await page.getByRole('button', { name: /add another guardian/i }).click();
    await page.locator('input[name="guardians.1.first_name"]').fill('Rose');
    await page.locator('input[name="guardians.1.last_name"]').fill(lastName);
    await page.getByRole('button', { name: /^done$/i }).click();

    await pressContinue(page);

    await expect(page.locator(SUMMARY)).toBeVisible();
    await expectProblem(page, /Guardian 2:.*A valid phone number is required\./);
    await expectStillOn(page, /who can collect the children/i);

    // And the step reopened guardian 2's card, so the field can be corrected
    // without the user working out which collapsed row is at fault.
    const secondPhone = page.locator('input[name="guardians.1.mobile_phone"]');
    await expect(secondPhone).toBeVisible();

    // An added guardian starts with relationship 'Other', so the phone is the
    // only thing standing between this family and step 3.
    await secondPhone.fill('5550001111');
    await page.getByRole('button', { name: /^done$/i }).click();

    await continueToNextStep(page);
    await expectStillOn(page, /tell us about your children/i);
  });
});

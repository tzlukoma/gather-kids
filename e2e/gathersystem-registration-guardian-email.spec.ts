import { test, expect } from '@playwright/test';
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
  fillWizardGuardians,
  fillWizardHousehold,
  fillWizardSiblings,
  gathersystemDescribe,
  isLocalSupabaseConfigured,
  startWizardRegistration,
} from './utils/gathersystem-wizard';

/**
 * #460: a guardian who left their email blank could not register at all.
 *
 * `z.string().email().optional()` admits `undefined` but not `''`, and `''` is
 * what an untouched input holds. The submit button is gated on whole-form
 * validity and `useForm` runs in the default `onSubmit` mode, so the button
 * simply never enabled and no message rendered on any step — the guardian had
 * no way to discover what was wrong. The same rule sat in `GuardianWriteDto`
 * one layer down, where it threw after submit instead.
 *
 * The schema halves are covered by unit and contract tests. Only a real browser
 * can show the button going from disabled to enabled, which is the part the
 * family actually experiences.
 */

gathersystemDescribe('GatherSystem registration with a blank guardian email @mutating', () => {
  // Context-safe mobile viewport only — full device descriptors include
  // defaultBrowserType, which Playwright forbids inside a nested describe.
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

  test('can still submit, and the registration is stored @mobile', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();
    assertDisposableLocalSupabase();

    const lastName = `NoEmail${Date.now()}`;
    createdLastName = lastName;

    const email = generateUniqueEmail('gs-blank-guardian-email');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);

    await fillWizardHousehold(page, lastName);
    // The point of the test: the guardian email is deliberately left empty.
    await fillWizardGuardians(page, lastName, '');
    await fillWizardSiblings(page, [
      { first_name: 'Sky', last_name: lastName, dob: '2016-03-02', grade: '3rd' },
    ]);

    // Step 4 has nothing required; Sunday School is automatic.
    await continueToNextStep(page);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    const submit = page.getByRole('button', { name: /submit registration/i });

    // This assertion is the regression. Before the fix it stayed disabled
    // forever, with nothing on screen to say which field was at fault.
    await expect(submit).toBeEnabled({ timeout: 15000 });

    await submit.click();
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`Sky ${lastName}`)).toBeVisible();

    // And it reached the database rather than dying in the DTO after submit.
    const supabase = createE2EAdminClient();
    const { data: guardians, error } = await supabase
      .from('guardians')
      .select('email, first_name')
      .eq('last_name', lastName);

    expect(error).toBeNull();
    expect(guardians?.length).toBe(1);
    // Blank stays blank — no invented address.
    expect(guardians![0].email === '' || guardians![0].email === null).toBe(true);
  });
});

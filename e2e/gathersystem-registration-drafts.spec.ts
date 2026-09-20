import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createE2EAdminClient,
  deleteTestUser,
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
 * #392 — the draft/auto-save promise, end to end.
 *
 * Draft persistence is the one registration behaviour that cannot be proven in
 * jsdom: it only means anything across a real page load, against the real
 * `form_drafts` row. So the assertions here are deliberately split —
 *
 *   - what the guardian sees (the restored value, the Saved indicator), and
 *   - what is actually stored (the `form_drafts` row, read back with the admin
 *     client).
 *
 * Asserting only the first would pass against a form that never cleared the
 * draft; asserting only the second would pass against a form that cleared it
 * but showed the guardian stale data.
 *
 * The toggle is a build-time `NEXT_PUBLIC_*` value, so it cannot be flipped
 * between tests in one dev server. The flag-off test is therefore skipped in
 * the normal run and covered by `npm run test:e2e:gathersystem:drafts-off`.
 */

const DRAFT_FORM_NAME = 'registration_v1';

const draftPersistenceEnabled =
  process.env.NEXT_PUBLIC_REGISTRATION_DRAFT_PERSISTENCE_ENABLED !== 'false';

function draftRowId(userId: string) {
  return `${DRAFT_FORM_NAME}::${userId}`;
}

async function readDraftRow(userId: string) {
  const admin = createE2EAdminClient();
  const { data } = await admin
    .from('form_drafts')
    .select('id, payload')
    .eq('id', draftRowId(userId))
    .maybeSingle();
  return data ?? null;
}

async function writeDraftRow(userId: string, payload: unknown) {
  const admin = createE2EAdminClient();
  const { error } = await admin.from('form_drafts').upsert({
    id: draftRowId(userId),
    form_name: DRAFT_FORM_NAME,
    user_id: userId,
    payload,
    version: 1,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function deleteDraftRow(userId: string) {
  const admin = createE2EAdminClient();
  await admin.from('form_drafts').delete().eq('id', draftRowId(userId));
}

/** Mobile-primary, per the signed spec. */
const MOBILE = { width: 402, height: 874 };

gathersystemDescribe('GatherSystem registration drafts @mobile @mutating', () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  let createdUserId: string | undefined;

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteDraftRow(createdUserId).catch(() => undefined);
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  async function signInFreshGuardian(page: Page) {
    const email = generateUniqueEmail('gs-drafts');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    return { email, userId: user.id as string };
  }

  test('restores a draft after reload, then clears it when Cancel is confirmed', async ({
    page,
  }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.skip(
      !draftPersistenceEnabled,
      'Requires NEXT_PUBLIC_REGISTRATION_DRAFT_PERSISTENCE_ENABLED',
    );
    test.slow();
    assertDisposableLocalSupabase();

    const { userId } = await signInFreshGuardian(page);
    await startWizardRegistration(page);

    // --- Enter data -------------------------------------------------------
    const address = '742 Draft Street';
    await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
      timeout: 20000,
    });
    await page.locator('input[name="household.name"]').fill('Draft Household');
    await page.locator('input[name="household.address_line1"]').fill(address);
    await page.locator('input[name="household.city"]').fill('Perth Amboy');
    await page.locator('input[name="household.state"]').fill('NJ');
    await page.locator('input[name="household.zip"]').fill('08861');

    // --- The guardian is told it saved ------------------------------------
    const status = page.getByTestId('registration-draft-status');
    await expect(status).toHaveAttribute('data-draft-state', 'saved', {
      timeout: 20000,
    });
    await expect(status).toContainText(/saved/i);

    // ...and it really is stored, not just announced.
    await expect
      .poll(async () => (await readDraftRow(userId))?.payload?.household?.address_line1, {
        timeout: 20000,
      })
      .toBe(address);

    // --- Reload, and verify restore ---------------------------------------
    await page.reload();
    await startWizardRegistration(page);

    await expect(page.locator('input[name="household.address_line1"]')).toHaveValue(
      address,
      { timeout: 20000 },
    );
    await expect(page.locator('input[name="household.name"]')).toHaveValue(
      'Draft Household',
    );

    // --- Continue ---------------------------------------------------------
    await continueToNextStep(page);
    await expect(
      page.getByRole('heading', { name: /who can collect the children/i }).first(),
    ).toBeVisible({ timeout: 20000 });

    // --- Cancel warns before it destroys anything -------------------------
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByText(/cancel registration\?/i)).toBeVisible();
    expect(await readDraftRow(userId)).not.toBeNull();

    await page.getByRole('button', { name: /yes, cancel/i }).click();

    // --- ...and clears the draft once confirmed ---------------------------
    await page.waitForURL(/\/household/, { timeout: 30000 });
    await expect.poll(async () => readDraftRow(userId), { timeout: 20000 }).toBeNull();
  });

  test('clears the draft after a successful submission', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.skip(
      !draftPersistenceEnabled,
      'Requires NEXT_PUBLIC_REGISTRATION_DRAFT_PERSISTENCE_ENABLED',
    );
    test.slow();
    assertDisposableLocalSupabase();

    const { email, userId } = await signInFreshGuardian(page);
    const lastName = 'Draftsubmit';

    await startWizardRegistration(page);

    // --- Step 1 -----------------------------------------------------------
    await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
      timeout: 20000,
    });
    await page.locator('input[name="household.name"]').fill(`${lastName} Household`);
    await page.locator('input[name="household.address_line1"]').fill('12 Submit Way');
    await page.locator('input[name="household.city"]').fill('Perth Amboy');
    await page.locator('input[name="household.state"]').fill('NJ');
    await page.locator('input[name="household.zip"]').fill('08861');

    // A draft must exist before submit, or "submit cleared it" proves nothing.
    await expect
      .poll(async () => readDraftRow(userId), { timeout: 20000 })
      .not.toBeNull();

    await continueToNextStep(page);

    // --- Step 2 -----------------------------------------------------------
    await expect(
      page.getByRole('heading', { name: /who can collect the children/i }).first(),
    ).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /^edit$/i }).first().click();
    await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
    await page.locator('input[name="guardians.0.last_name"]').fill(lastName);
    await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
    await page.locator('input[name="guardians.0.email"]').fill(email);
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
    await continueToNextStep(page);

    // --- Step 3 -----------------------------------------------------------
    await expect(
      page.getByRole('heading', { name: /tell us about your children/i }).first(),
    ).toBeVisible({ timeout: 20000 });
    const addFirst = page.getByRole('button', { name: /add your first child/i });
    if (await addFirst.count()) {
      await addFirst.click();
    }
    await fillChildAtIndex(page, 0, {
      first_name: 'Robin',
      last_name: lastName,
      dob: '2016-04-02',
      grade: '3rd',
    });
    await continueToNextStep(page);

    // --- Step 4 -----------------------------------------------------------
    await expect(
      page.getByText(/ministry programs|expressed interest/i).first(),
    ).toBeVisible({ timeout: 20000 });
    await continueToNextStep(page);

    // --- Step 5 -----------------------------------------------------------
    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    await expect(liability).toBeVisible({ timeout: 20000 });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({ timeout: 30000 });

    // --- The draft is gone -------------------------------------------------
    await expect.poll(async () => readDraftRow(userId), { timeout: 20000 }).toBeNull();
  });

  /**
   * The flag-off half of the contract. `NEXT_PUBLIC_*` is inlined at build
   * time, so this needs its own dev server:
   *
   *   npm run test:e2e:gathersystem:drafts-off
   */
  test('ignores a stored draft entirely when persistence is off', async ({ page }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.skip(
      draftPersistenceEnabled,
      'Flag-off run only (npm run test:e2e:gathersystem:drafts-off)',
    );
    test.slow();
    assertDisposableLocalSupabase();

    const { userId } = await signInFreshGuardian(page);

    // A draft left behind from when the toggle was on.
    await writeDraftRow(userId, {
      household: {
        name: 'Stale Household',
        address_line1: '999 Stale Road',
        city: 'Oakland',
        state: 'CA',
        zip: '94601',
      },
      children: [{ first_name: 'Stale', last_name: 'Child' }],
    });

    await page.goto('/register');

    // Entry must not list the draft's child, nor claim a draft is waiting.
    //
    // This pair is a guard, not the proof. Un-gating the entry's own hook does
    // not make it fail: against a real browser the entry's draft read resolves
    // before auth settles and the stale child never reaches this screen
    // anyway. The entry's toggle handling is proven in jsdom instead
    // (registration-entry.test.tsx, 'RegistrationEntry draft toggle'), where
    // reverting `enabled` to a hardcoded `true` does fail. What carries this
    // test is the wizard assertions below, which do fail when un-gated.
    const entryDescription = page.getByTestId('registration-entry-description');
    await expect(entryDescription).toBeVisible({ timeout: 30000 });
    await expect(entryDescription).toHaveAttribute('data-prefill-kind', 'first_time');
    await expect(page.getByText(/Stale Child/)).toHaveCount(0);

    await startWizardRegistration(page);

    // No status UI, and none of the stale values.
    await expect(page.getByTestId('registration-draft-status')).toHaveCount(0);
    await expect(page.locator('input[name="household.address_line1"]')).toHaveValue('', {
      timeout: 20000,
    });
    await expect(page.locator('input[name="household.name"]')).toHaveValue('');

    // ...and nothing was written back either.
    const row = await readDraftRow(userId);
    expect(row?.payload?.household?.address_line1).toBe('999 Stale Road');
  });
});

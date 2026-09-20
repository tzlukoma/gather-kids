import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  createConfirmedTestUser,
  createE2EAdminClient,
  deleteTestUser,
  E2E_ACTIVE_CYCLE_ID,
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
 * #394 — the registration success path, end to end.
 *
 * Three claims that only a real submit can settle:
 *
 *   1. Entry, wizard and Done name the *same* season, and none of them shows
 *      the `cycle_id` — which is a UUID in UAT and production.
 *   2. The Done roster is the receipt. It is compared against the enrollment
 *      rows actually written for the active cycle, not against what was ticked.
 *   3. The Bible Bee scripture link follows that same receipt.
 *
 * A UUID-shaped string anywhere in the rendered page fails the run, so a cycle
 * id leaking into any future copy on these screens is caught here rather than
 * by a reviewer.
 */

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Mobile-primary, per the signed spec. */
const MOBILE = { width: 402, height: 874 };

async function persistedEnrollments(householdLastName: string) {
  const admin = createE2EAdminClient();

  const { data: children } = await admin
    .from('children')
    .select('child_id, first_name, last_name')
    .eq('last_name', householdLastName);

  const rows: Array<{ child: string; ministry: string; status: string }> = [];
  for (const child of children ?? []) {
    const { data: enrollments } = await admin
      .from('ministry_enrollments')
      .select('status, ministry_id, ministries(name, code)')
      .eq('child_id', child.child_id)
      .eq('cycle_id', E2E_ACTIVE_CYCLE_ID);

    for (const e of enrollments ?? []) {
      const ministry = (e as { ministries?: { name?: string; code?: string } })
        .ministries;
      rows.push({
        child: `${child.first_name} ${child.last_name}`,
        ministry: ministry?.name ?? '',
        status: e.status as string,
      });
    }
  }
  return rows;
}

gathersystemDescribe('GatherSystem registration completion @mobile @mutating', () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  let createdUserId: string | undefined;

  test.afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId).catch(() => undefined);
      createdUserId = undefined;
    }
  });

  async function signIn(page: Page) {
    const email = generateUniqueEmail('gs-completion');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    return email;
  }

  test('names one cycle across entry, wizard and Done, and confirms only what was stored', async ({
    page,
  }, testInfo) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();
    assertDisposableLocalSupabase();

    const email = await signIn(page);
    const lastName = 'Completion';

    // ---- Entry names the cycle -------------------------------------------
    await page.goto('/register');
    const entryLabel = page.getByTestId('registration-entry-cycle-label');
    await expect(entryLabel).toBeVisible({ timeout: 30000 });

    const cycleName = (await entryLabel.textContent())?.trim() ?? '';
    expect(cycleName).not.toBe('');
    expect(cycleName).not.toMatch(UUID_RE);
    // A cycle really is configured, so this is the name rather than a fallback.
    expect(cycleName).not.toBe('this year');
    expect(await page.textContent('body')).not.toMatch(UUID_RE);

    // ---- Wizard names the same cycle -------------------------------------
    await startWizardRegistration(page);
    await expect(page.getByTestId('registration-wizard-cycle-label')).toHaveText(
      cycleName,
    );

    // ---- Steps 1-5 --------------------------------------------------------
    await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
      timeout: 20000,
    });
    await page.locator('input[name="household.name"]').fill(`${lastName} Household`);
    await page.locator('input[name="household.address_line1"]').fill('9 Confirm Way');
    await page.locator('input[name="household.city"]').fill('Perth Amboy');
    await page.locator('input[name="household.state"]').fill('NJ');
    await page.locator('input[name="household.zip"]').fill('08861');
    await continueToNextStep(page);

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

    await expect(
      page.getByText(/ministry programs|expressed interest/i).first(),
    ).toBeVisible({ timeout: 20000 });
    await continueToNextStep(page);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    await expect(liability).toBeVisible({ timeout: 20000 });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();

    // ---- Done -------------------------------------------------------------
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByTestId('registration-done-subtitle')).toHaveText(
      `Your family is registered for ${cycleName}.`,
    );

    const doneBody = (await page.textContent('body')) ?? '';
    expect(doneBody).not.toMatch(UUID_RE);

    // No invented logistics: no service time, no campus, no room.
    expect(doneBody).not.toMatch(/Family Life Enrichment Center/i);
    expect(doneBody).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    expect(doneBody).not.toMatch(/\broom\b/i);

    // No email is sent for a registration, so none may be promised.
    expect(doneBody).not.toMatch(/check your (inbox|email)/i);
    expect(doneBody).not.toMatch(/confirmation email|email confirmation/i);

    await expect(page.getByTestId('registration-done-service-day')).toHaveText(
      /^(Sunday), \w+ \d{1,2}$/,
    );

    // ---- The roster is the receipt ---------------------------------------
    const stored = await persistedEnrollments(lastName);
    const storedEnrolled = stored
      .filter((r) => r.status === 'enrolled')
      .map((r) => r.ministry)
      .sort();

    // Guard the guard: with no stored enrollment the comparison below would
    // pass over an empty set and prove nothing.
    expect(
      storedEnrolled.length,
      'no enrollment was persisted, so the receipt comparison would be vacuous',
    ).toBeGreaterThan(0);

    const summary = page.getByText('Confirmed Registration').locator('..').locator('..');
    for (const ministryName of storedEnrolled) {
      await expect(summary.getByText(ministryName, { exact: false }).first()).toBeVisible();
    }

    // Nothing is announced that was not stored.
    const storedNames = new Set(stored.map((r) => r.ministry));
    const announced = await summary.locator('span').allTextContents();
    for (const text of announced) {
      const trimmed = text.trim();
      if (!trimmed) continue;
      expect(
        storedNames.has(trimmed),
        `Done announced "${trimmed}", which has no persisted enrollment row`,
      ).toBe(true);
    }

    // ---- Bible Bee link follows the receipt ------------------------------
    const bibleBeeStored = stored.some(
      (r) => /bible bee/i.test(r.ministry) && r.status === 'enrolled',
    );
    if (bibleBeeStored) {
      await expect(page.getByText('Bible Bee Enrollment')).toBeVisible();
    } else {
      await expect(page.getByText('Bible Bee Enrollment')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: /view scripture assignments/i }),
      ).toHaveCount(0);
    }

    // ---- Mobile screenshot, required by the issue -------------------------
    await testInfo.attach('registration-done-mobile', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
});

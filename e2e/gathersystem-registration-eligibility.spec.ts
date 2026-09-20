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
  fillWizardGuardians,
  fillWizardHousehold,
  fillWizardSiblings,
  gathersystemDescribe,
  isLocalSupabaseConfigured,
  startWizardRegistration,
} from './utils/gathersystem-wizard';

/**
 * #400 end to end: two siblings on opposite sides of a ministry's minimum age,
 * at mobile width.
 *
 * The regression this guards is a false success, and it only shows up across
 * the whole stack: the wizard offered every child every ministry, persistence
 * silently dropped the ones that did not qualify, and the Done screen — built
 * from the submitted form rather than from what was stored — reported them as
 * enrollments anyway. Unit and contract tests can each prove their own half;
 * only this can prove the screen and the database agree.
 */

const E2E_AGE_MINISTRY_ID = 'e2e_age_boundary_ministry';
const E2E_AGE_MINISTRY_CODE = 'e2e-age-boundary';
const E2E_AGE_MINISTRY_NAME = 'E2E Age Boundary Ministry';
const MINISTRY_MIN_AGE = 8;

// ---------------------------------------------------------------------------
// Age fixtures
//
// Derived from the church-local service day, the same day the app computes ages
// against. Deriving them from the runner's local day instead would disagree with
// the app for the hours when UTC and America/New_York are on different dates.
// ---------------------------------------------------------------------------

function serviceDayIso(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function shiftIsoDay(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function ageOnIsoDay(dob: string, day: string): number {
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = day.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** A date of birth for a child whose `age`th birthday falls on `day`. */
function dobForBirthdayOn(day: string, age: number): string {
  const [y, m, d] = day.split('-').map(Number);
  // 29 February has no counterpart in a non-leap birth year, and JS would roll
  // it forward to 1 March. Step back a day so the fixture holds every year
  // rather than three years in four.
  if (m === 2 && d === 29) return `${y - age}-02-28`;
  return `${y - age}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Two dates of birth straddling the ministry's minimum: one child who reaches it
 * today (inclusive bound — eligible) and one who reaches it tomorrow (a single
 * day short — not eligible).
 *
 * The result is checked rather than assumed, so a calendar edge fails loudly
 * here instead of as a confusing assertion later in the run.
 */
function ageBoundaryFixtures(today: string) {
  const eligibleDob = dobForBirthdayOn(today, MINISTRY_MIN_AGE);

  let ineligibleDob = '';
  for (let k = 1; k <= 3; k++) {
    const candidate = dobForBirthdayOn(shiftIsoDay(today, k), MINISTRY_MIN_AGE);
    if (ageOnIsoDay(candidate, today) === MINISTRY_MIN_AGE - 1) {
      ineligibleDob = candidate;
      break;
    }
  }

  if (
    ageOnIsoDay(eligibleDob, today) !== MINISTRY_MIN_AGE ||
    !ineligibleDob ||
    ageOnIsoDay(ineligibleDob, today) !== MINISTRY_MIN_AGE - 1
  ) {
    throw new Error(
      `Could not build age-boundary fixtures for ${today}: got eligible=${eligibleDob}, ineligible=${ineligibleDob || '(none)'}`,
    );
  }

  return { eligibleDob, ineligibleDob };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seedAgeBoundaryMinistry() {
  assertDisposableLocalSupabase();
  const supabase = createE2EAdminClient();

  const { error } = await supabase.from('ministries').upsert(
    {
      ministry_id: E2E_AGE_MINISTRY_ID,
      name: E2E_AGE_MINISTRY_NAME,
      code: E2E_AGE_MINISTRY_CODE,
      enrollment_type: 'enrolled',
      data_profile: 'Basic',
      is_active: true,
      min_age: MINISTRY_MIN_AGE,
      max_age: 12,
    },
    { onConflict: 'ministry_id' },
  );

  expect(error).toBeNull();
}

async function cleanupAgeBoundaryMinistry() {
  assertDisposableLocalSupabase();
  const supabase = createE2EAdminClient();
  await supabase.from('ministry_enrollments').delete().eq('ministry_id', E2E_AGE_MINISTRY_ID);
  await supabase.from('ministries').delete().eq('ministry_id', E2E_AGE_MINISTRY_ID);
}

/** Every ministry id this child has an enrollment row for, in this cycle or any. */
async function persistedMinistryIds(childId: string): Promise<string[]> {
  const supabase = createE2EAdminClient();
  const { data, error } = await supabase
    .from('ministry_enrollments')
    .select('ministry_id')
    .eq('child_id', childId);

  expect(error).toBeNull();
  return (data ?? []).map((row) => row.ministry_id as string).sort();
}

async function findChildId(firstName: string, lastName: string): Promise<string> {
  const supabase = createE2EAdminClient();
  const { data, error } = await supabase
    .from('children')
    .select('child_id')
    .eq('first_name', firstName)
    .eq('last_name', lastName);

  expect(error).toBeNull();
  // The last name carries a per-run suffix, so a second row would mean the
  // wizard created a duplicate child — worth failing on, not papering over.
  expect(data?.length).toBe(1);
  return data![0].child_id as string;
}

gathersystemDescribe('GatherSystem registration eligibility @mutating', () => {
  // Context-safe mobile viewport only — full iPhone 13 device descriptors include
  // defaultBrowserType, which Playwright forbids inside a nested describe.
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  let createdUserId: string | undefined;
  let createdLastName: string | undefined;

  test.beforeAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    assertDisposableLocalSupabase();
    await ensureRegistrationSmokeFixtures();
    await seedAgeBoundaryMinistry();
  });

  test.afterAll(async () => {
    if (!isLocalSupabaseConfigured()) return;
    assertDisposableLocalSupabase();
    await cleanupAgeBoundaryMinistry();
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

  test('offers a ministry only to the eligible sibling, and the Done summary matches what was stored @mobile', async ({
    page,
  }) => {
    test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
    test.slow();
    assertDisposableLocalSupabase();

    const today = serviceDayIso();
    const { eligibleDob, ineligibleDob } = ageBoundaryFixtures(today);

    // A per-run surname keeps the child lookups unambiguous across reruns.
    const lastName = `Boundary${Date.now()}`;
    createdLastName = lastName;

    // Grades are set only because the schema requires them; nothing in this test
    // turns on them, and grade bounds are not enforced anywhere today.
    const eligible = {
      first_name: 'Sky',
      last_name: lastName,
      dob: eligibleDob,
      grade: '3rd',
    };
    const ineligible = {
      first_name: 'Robin',
      last_name: lastName,
      dob: ineligibleDob,
      grade: 'Pre-K',
    };

    const email = generateUniqueEmail('gs-eligibility');
    const user = await createConfirmedTestUser(email, TEST_PASSWORD);
    createdUserId = user.id;

    await page.context().clearCookies();
    await loginWithPassword(page, email, TEST_PASSWORD);
    await waitForPostLoginRoute(page);
    await startWizardRegistration(page);

    await fillWizardHousehold(page, lastName);
    await fillWizardGuardians(page, lastName, email);
    await fillWizardSiblings(page, [eligible, ineligible]);

    // --- Step 4: only the eligible sibling is offered the ministry ----------

    const ministryCard = page
      .locator('div.border-2')
      .filter({ hasText: E2E_AGE_MINISTRY_NAME })
      .first();
    await expect(ministryCard).toBeVisible({ timeout: 15000 });

    const offeredChildren = ministryCard.getByRole('checkbox');
    await expect(offeredChildren).toHaveCount(1);

    await expect(ministryCard.getByText('Sky', { exact: false })).toBeVisible();
    // Robin appears only as an explanation, never as something to tick.
    await expect(
      ministryCard.getByText(new RegExp(`Robin\\s*—\\s*Opens at age ${MINISTRY_MIN_AGE}`)),
    ).toBeVisible();
    await expect(
      ministryCard.locator('label').filter({ hasText: 'Robin' }),
    ).toHaveCount(0);

    await offeredChildren.first().check();

    await continueToNextStep(page);

    const liability = page.getByRole('checkbox', { name: /liability release/i });
    const photo = page.getByRole('checkbox', { name: /photo release/i });
    if (!(await liability.isChecked())) await liability.check();
    if (!(await photo.isChecked())) await photo.check();

    await page.getByRole('button', { name: /submit registration/i }).click();
    await expect(page.getByText(/you.?re registered!/i)).toBeVisible({ timeout: 30000 });

    // --- The Done summary ---------------------------------------------------

    const eligibleSummary = page.getByText(`Sky ${lastName}`).locator('..');
    const ineligibleSummary = page.getByText(`Robin ${lastName}`).locator('..');

    await expect(eligibleSummary.getByText(E2E_AGE_MINISTRY_NAME)).toBeVisible();
    await expect(eligibleSummary.getByText('Sunday School')).toBeVisible();

    // The false-success this issue is about: Robin must not be told they are in
    // a ministry that has no enrollment behind it.
    await expect(ineligibleSummary.getByText(E2E_AGE_MINISTRY_NAME)).toHaveCount(0);
    await expect(ineligibleSummary.getByText('Sunday School')).toBeVisible();

    // --- What was actually stored ------------------------------------------

    const eligibleChildId = await findChildId('Sky', lastName);
    const ineligibleChildId = await findChildId('Robin', lastName);

    expect(await persistedMinistryIds(eligibleChildId)).toEqual(
      [E2E_AGE_MINISTRY_ID, 'min_sunday_school'].sort(),
    );
    expect(await persistedMinistryIds(ineligibleChildId)).toEqual(['min_sunday_school']);
  });
});

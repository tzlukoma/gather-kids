import { expect, type Page } from '@playwright/test';
import { test } from '@playwright/test';

/**
 * Shared harness for the flag-on GatherSystem registration wizard.
 *
 * Extracted from `gathersystem-registration-eligibility.spec.ts` so a second
 * spec can drive the same five steps without a second copy of the selectors.
 * The older `gathersystem-registration-*` specs each carry their own copy and
 * have drifted apart (#461) — they should move onto this too.
 *
 * Every wait here is awaited rather than probed with `count()`: counting before
 * a control has rendered silently skips the interaction and surfaces later as an
 * unrelated failure, which is most of what #461 is about.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Exact-local hostname only — never trust substring matches.
 * A misconfigured URL must not reach service-role seed/mutation helpers.
 */
function isDisposableLocalSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const normalized =
      hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname;
    return LOCAL_HOSTNAMES.has(normalized);
  } catch {
    return false;
  }
}

export function assertDisposableLocalSupabase(): void {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  if (!key || !isDisposableLocalSupabaseUrl(url)) {
    throw new Error(
      `GatherSystem registration E2E refuses non-disposable Supabase URL (exact localhost/127.0.0.1/::1 required): ${url || '(missing)'}`,
    );
  }
}

export function isLocalSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE || '';
  return Boolean(key) && isDisposableLocalSupabaseUrl(url);
}

export function gathersystemDescribe(title: string, fn: () => void) {
  test.describe(title, () => {
    test.skip(
      process.env.GATHERSYSTEM_REGISTRATION_E2E !== '1',
      'Set GATHERSYSTEM_REGISTRATION_E2E=1 (prefer: npm run test:e2e:gathersystem)',
    );
    fn();
  });
}
// ---------------------------------------------------------------------------
// Wizard navigation
// ---------------------------------------------------------------------------

export async function continueToNextStep(page: Page) {
  await page.getByRole('button', { name: /save & continue/i }).click();
}

export async function startWizardRegistration(page: Page) {
  await page.goto('/register');

  const startButton = page.getByRole('button', { name: /start registration/i }).first();
  const saveAndContinue = page.getByRole('button', { name: /save & continue/i }).first();

  // `/register` lands on the household prompt for a returning guardian and
  // straight in the wizard otherwise. Wait for whichever arrives rather than
  // counting the start button before the page has hydrated.
  await expect(startButton.or(saveAndContinue)).toBeVisible({ timeout: 30000 });

  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
  }

  await expect(saveAndContinue).toBeVisible({ timeout: 30000 });
}

export async function fillWizardHousehold(page: Page, lastName: string) {
  // Addressed by form field name rather than by label. The sibling GatherSystem
  // specs use accessible names here and no longer match the rendered step, and
  // the field names are the same contract the DAL reads.
  await expect(page.locator('input[name="household.address_line1"]')).toBeVisible({
    timeout: 20000,
  });

  await page.locator('input[name="household.name"]').fill(`${lastName} Household`);
  await page.locator('input[name="household.address_line1"]').fill('100 Eligibility Way');
  await page.locator('input[name="household.city"]').fill('Perth Amboy');
  await page.locator('input[name="household.state"]').fill('NJ');
  await page.locator('input[name="household.zip"]').fill('08861');
  await continueToNextStep(page);
}

export async function fillWizardGuardians(
  page: Page,
  lastName: string,
  guardianEmail: string,
) {
  await expect(
    page.getByRole('heading', { name: /who can collect the children/i }).first(),
  ).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: /^edit$/i }).first().click();

  await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
  await page.locator('input[name="guardians.0.last_name"]').fill(lastName);
  await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');

  // Blank is a legitimate value here, not a gap in the fixture: the schema
  // accepts an unfilled guardian email since #460, and one spec passes '' on
  // purpose to prove the submit button still enables.
  await page.locator('input[name="guardians.0.email"]').fill(guardianEmail);

  await page
    .getByRole('combobox')
    .filter({ hasText: /mother|father|select relationship/i })
    .first()
    .click();
  // Exact — 'Grandmother' contains 'Mother'.
  await page.getByRole('option', { name: 'Mother', exact: true }).click();

  await page.getByRole('button', { name: /^done$/i }).click();

  await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
  await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');

  await continueToNextStep(page);
}

/** Step 3 shows one child at a time, so the fields are always the active index. */
export async function fillChildAtIndex(
  page: Page,
  index: number,
  child: { first_name: string; last_name: string; dob: string; grade: string },
) {
  await expect(page.locator(`input[name="children.${index}.first_name"]`)).toBeVisible({
    timeout: 20000,
  });

  await page.locator(`input[name="children.${index}.first_name"]`).fill(child.first_name);
  await page.locator(`input[name="children.${index}.last_name"]`).fill(child.last_name);
  await page.locator(`input[name="children.${index}.dob"]`).fill(child.dob);

  // Grade is required by the schema, and the submit button is gated on the whole
  // form being valid — so pick a named option and confirm it took, rather than
  // clicking whatever happens to be first.
  const gradeTrigger = page.getByRole('combobox', { name: /grade/i }).first();
  await gradeTrigger.click();
  await page.getByRole('option', { name: child.grade, exact: true }).click();
  await expect(gradeTrigger).toContainText(child.grade);

  // The #411 allergy gate is mandatory — step 3 will not advance until every
  // child has a non-empty `allergies` value — so this is awaited rather than
  // probed with `count()`, which silently no-ops if the radio has not rendered.
  const noKnownAllergies = page
    .getByRole('radio', { name: /no known allergies/i })
    .first();
  await expect(noKnownAllergies).toBeVisible({ timeout: 20000 });
  await noKnownAllergies.click();
  await expect(noKnownAllergies).toBeChecked();
}

export async function fillWizardSiblings(
  page: Page,
  siblings: Array<{ first_name: string; last_name: string; dob: string; grade: string }>,
) {
  await expect(
    page.getByRole('heading', { name: /tell us about your children/i }).first(),
  ).toBeVisible({ timeout: 20000 });

  const addFirst = page.getByRole('button', { name: /add your first child/i });
  if (await addFirst.count()) {
    await addFirst.click();
  }

  await fillChildAtIndex(page, 0, siblings[0]);

  for (let i = 1; i < siblings.length; i++) {
    await page.getByRole('button', { name: /add another child/i }).click();
    await fillChildAtIndex(page, i, siblings[i]);
  }

  await continueToNextStep(page);
  await expect(
    page.getByText(/ministry programs|expressed interest/i).first(),
  ).toBeVisible({ timeout: 15000 });
}


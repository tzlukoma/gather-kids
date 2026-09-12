import { test, expect, type Page } from '@playwright/test';

export const R1_ACCOUNTS = {
  returning: {
    email: process.env.R1_RETURNING_EMAIL || 'parent-with-household@example.com',
    password: process.env.R1_RETURNING_PASSWORD || 'TestPassword123!',
    expectedChildCount: Number(process.env.R1_EXPECTED_CHILD_COUNT || '2'),
  },
  newGuardian: {
    email: process.env.R1_NEW_GUARDIAN_EMAIL || 'brand-new@example.com',
    password: process.env.R1_NEW_GUARDIAN_PASSWORD || 'TestPassword123!',
  },
} as const;

export function r1Describe(title: string, fn: () => void) {
  test.describe(title, () => {
    test.skip(
      !process.env.R1_E2E_ENABLED,
      'Set R1_E2E_ENABLED=1 and point BASE_URL at UAT-backed dev to run',
    );
    fn();
  });
}

export async function loginWithPassword(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

export async function waitForPostLoginRoute(page: Page) {
  await page.waitForURL(/\/(household|register|rosters)/, { timeout: 45000 });
}

export async function waitForRegisterFormReady(page: Page) {
  await expect(page.getByText(/you are signed in as:/i)).toBeVisible({
    timeout: 60000,
  });
  await expect(
    page.getByRole('textbox', { name: /street address/i }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole('button', { name: /submit registration/i }),
  ).toBeVisible({ timeout: 30000 });
}

export async function gotoRegisterAsLoggedInUser(page: Page) {
  await page.goto('/register');
  await waitForRegisterFormReady(page);
}

export async function loginReturningGuardian(page: Page) {
  await loginWithPassword(
    page,
    R1_ACCOUNTS.returning.email,
    R1_ACCOUNTS.returning.password,
  );
  await waitForPostLoginRoute(page);
}

export async function loginNewGuardian(page: Page) {
  await loginWithPassword(
    page,
    R1_ACCOUNTS.newGuardian.email,
    R1_ACCOUNTS.newGuardian.password,
  );
  await waitForPostLoginRoute(page);
}

export async function countChildSections(page: Page): Promise<number> {
  const removeButtons = await page.getByRole('button', { name: /remove child/i }).count();
  if (removeButtons > 0) {
    return removeButtons;
  }
  return page.locator('input[name^="children."][name$=".first_name"]').count();
}

export async function fulfillGroupAndOptionalConsents(page: Page) {
  const choirsHeading = page.getByRole('heading', { name: 'Choirs', exact: true });
  if (await choirsHeading.count()) {
    const choirsSection = choirsHeading.locator('xpath=ancestor::div[contains(@class,"border")]').first();
    const choirNo = choirsSection.getByRole('radio', { name: 'No', exact: true });
    if (await choirNo.count()) {
      await choirNo.click();
    }
  }

  const optionalConsentBoxes = page.getByRole('checkbox', { name: / consent$/i });
  for (let i = 0; i < (await optionalConsentBoxes.count()); i += 1) {
    const box = optionalConsentBoxes.nth(i);
    if (!(await box.isChecked())) {
      await box.check();
    }
  }
}

export async function acceptRequiredConsents(page: Page) {
  const liability = page.getByRole('checkbox', { name: /liability release/i });
  const photo = page.getByRole('checkbox', { name: /photo release/i });
  await liability.scrollIntoViewIfNeeded();
  if (!(await liability.isChecked())) {
    await liability.check();
  }
  if (!(await photo.isChecked())) {
    await photo.check();
  }
  await expect(liability).toBeChecked();
  await expect(photo).toBeChecked();
}

export async function acceptAllRegistrationConsents(page: Page) {
  await acceptRequiredConsents(page);
  await fulfillGroupAndOptionalConsents(page);
}

export async function submitRegistration(page: Page) {
  const submit = page.getByRole('button', { name: /submit registration/i });
  await submit.scrollIntoViewIfNeeded();
  await submit.click();
}

export async function expectStayedOnRegister(page: Page) {
  await expect(page).toHaveURL(/\/register/, { timeout: 5000 });
}

export async function fillMinimumNewHouseholdRegistration(page: Page) {
  await page.getByRole('textbox', { name: /^street address$/i }).fill('100 Test St');
  await page.getByRole('textbox', { name: /^city$/i }).fill('Perth Amboy');
  await page.getByRole('textbox', { name: /^state$/i }).fill('NJ');
  await page.getByRole('textbox', { name: /^zip code$/i }).fill('08861');

  await page.locator('input[name="guardians.0.first_name"]').fill('Alex');
  await page.locator('input[name="guardians.0.last_name"]').fill('Rivera');
  await page.locator('input[name="guardians.0.mobile_phone"]').fill('5551234567');
  await page.locator('input[name="guardians.0.relationship"]').fill('Parent');

  await page.locator('input[name="emergencyContact.first_name"]').fill('Sam');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Lee');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');
  await page.locator('input[name="emergencyContact.mobile_phone"]').fill('5559876543');

  const childTrigger = page.getByRole('button', { name: /child 1/i });
  if (await childTrigger.count()) {
    const expanded = await childTrigger.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await childTrigger.click();
    }
  }

  await page.locator('input[name="children.0.first_name"]').fill('Jordan');
  await page.locator('input[name="children.0.last_name"]').fill('Rivera');
  await page.locator('input[name="children.0.dob"]').fill('2018-06-15');
  await page.getByRole('combobox', { name: /grade/i }).click();
  await page.getByRole('option', { name: /kindergarten/i }).click();
}

export function captureRegistrationSubmitFailures(page: Page): string[] {
  const failures: string[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    const isRegistrationWrite =
      /\/rest\/v1\/(households|guardians|children|emergency_contacts|registrations|ministry_enrollments)/.test(
        url,
      );
    if (!isRegistrationWrite || response.ok()) {
      return;
    }
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '';
    }
    failures.push(`${response.status()} ${url} ${body.slice(0, 500)}`);
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }
    const text = msg.text();
    if (/23503|guardians_household_id_fkey|Submission Error/i.test(text)) {
      failures.push(`console: ${text}`);
    }
  });

  return failures;
}

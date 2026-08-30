import { test, expect } from '@playwright/test';
import {
  R1_ACCOUNTS,
  countChildSections,
  gotoRegisterAsLoggedInUser,
  loginNewGuardian,
  r1Describe,
} from '../utils/r1-helpers';

r1Describe('R1 new guardian registration', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginNewGuardian(page);
  });

  test('routes new guardian without household to register', async ({ page }) => {
    await expect(page).toHaveURL(/\/register/, { timeout: 30000 });
  });

  test('shows empty household with guardian email prefilled', async ({ page }) => {
    await gotoRegisterAsLoggedInUser(page);

    const street = page.getByRole('textbox', { name: /street address/i });
    await expect(street).toHaveValue('');

    const guardianEmailFields = page.locator('input[type="email"]');
    const emails = await guardianEmailFields.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLInputElement).value),
    );
    expect(emails.some((v) => v === R1_ACCOUNTS.newGuardian.email)).toBeTruthy();
  });

  test('starts with at least one child row', async ({ page }) => {
    await gotoRegisterAsLoggedInUser(page);
    await expect
      .poll(async () => countChildSections(page), { timeout: 30000 })
      .toBeGreaterThanOrEqual(1);
  });
});

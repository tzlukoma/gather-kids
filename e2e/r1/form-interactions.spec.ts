import { test, expect } from '@playwright/test';
import {
  countChildSections,
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
} from '../utils/r1-helpers';

r1Describe('R1 form interactions', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);
  });

  test('guardian can edit prefilled street address', async ({ page }) => {
    const street = page.getByRole('textbox', { name: /street address/i });
    const original = await street.inputValue();
    const edited = `${original} (edited)`;
    await street.fill(edited);
    await expect(street).toHaveValue(edited);
  });

  test('add child appends another child section', async ({ page }) => {
    const before = await countChildSections(page);
    await page.getByRole('button', { name: /add child/i }).click();
    await expect
      .poll(async () => countChildSections(page), { timeout: 10000 })
      .toBe(before + 1);
  });

  test('reload preserves authenticated session and reopens registration form', async ({
    page,
  }) => {
    const street = page.getByRole('textbox', { name: /street address/i });
    const valueBeforeReload = await street.inputValue();
    expect(valueBeforeReload.length).toBeGreaterThan(0);

    await page.reload();
    await gotoRegisterAsLoggedInUser(page);

    await expect(page.getByRole('textbox', { name: /street address/i })).not.toHaveValue(
      '',
    );
  });

  test('email lookup step is not shown for authenticated users', async ({ page }) => {
    await expect(page.getByText(/household lookup/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^continue$/i })).not.toBeVisible();
  });
});

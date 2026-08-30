import { test, expect } from '@playwright/test';
import {
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
  submitRegistration,
  expectStayedOnRegister,
} from '../utils/r1-helpers';

r1Describe('R1 registration validation', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);
  });

  test('blocks submit when required consents are unchecked', async ({ page }) => {
    await submitRegistration(page);
    await expectStayedOnRegister(page);
    await expect(
      page.getByText(/liability consent is required|photo release consent is required/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('blocks submit when only liability consent is checked', async ({ page }) => {
    await page.getByRole('checkbox', { name: /liability release/i }).check();
    await submitRegistration(page);
    await expectStayedOnRegister(page);
    await expect(
      page.getByText(/photo release consent is required/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('clears required address shows validation on submit', async ({ page }) => {
    const street = page.getByRole('textbox', { name: /street address/i });
    await street.fill('');
    await page.getByRole('checkbox', { name: /liability release/i }).check();
    await page.getByRole('checkbox', { name: /photo release/i }).check();
    await submitRegistration(page);
    await expectStayedOnRegister(page);
    await expect(page.getByText(/address is required/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

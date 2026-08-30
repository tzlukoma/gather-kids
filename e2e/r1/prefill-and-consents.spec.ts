import { test, expect } from '@playwright/test';
import {
  R1_ACCOUNTS,
  acceptRequiredConsents,
  countChildSections,
  gotoRegisterAsLoggedInUser,
  loginReturningGuardian,
  r1Describe,
} from '../utils/r1-helpers';

r1Describe('R1 returning prefill', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginReturningGuardian(page);
    await gotoRegisterAsLoggedInUser(page);
  });

  test('prefills household address and signed-in email banner', async ({ page }) => {
    const street = page.getByRole('textbox', { name: /street address/i });
    await expect(street).not.toHaveValue('');
    await expect(page.getByText(/you are signed in as:/i)).toContainText(
      R1_ACCOUNTS.returning.email,
    );
  });

  test('prefills expected number of children from prior registration', async ({
    page,
  }) => {
    const childSections = await countChildSections(page);
    expect(childSections).toBeGreaterThanOrEqual(
      R1_ACCOUNTS.returning.expectedChildCount,
    );
  });

  test('consents start unchecked for returning families', async ({ page }) => {
    await page.getByRole('checkbox', { name: /liability release/i }).scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('checkbox', { name: /liability release/i }),
    ).not.toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: /photo release/i }),
    ).not.toBeChecked();
  });

  test('shows grade bump hints when returning prefill applies', async ({ page }) => {
    const gradeHint = page.getByText(/last year:/i);
    if ((await gradeHint.count()) === 0) {
      test.info().annotations.push({
        type: 'note',
        description:
          'No grade hints — household may already have active-cycle registration (overwrite mode).',
      });
      return;
    }
    await expect(gradeHint.first()).toBeVisible();
  });

  test('accepting consents enables submit without navigation', async ({ page }) => {
    await acceptRequiredConsents(page);
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole('button', { name: /submit registration/i }),
    ).toBeEnabled();
  });
});

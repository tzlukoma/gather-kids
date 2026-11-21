import { expect, test } from '@playwright/test';
import {
	ACCOUNTS,
	collectPageErrors,
	ensureGatherSystemWorld,
	expectNoPageErrors,
	screenDescribe,
	signIn,
} from './utils/gathersystem-screens';

/**
 * `gathersystem_account_entry` and `gathersystem_auth`, flag on.
 * UAT counterpart: ACCT-01, ACCT-02 (up to the email) and AUTH-02 in
 * docs/GATHERSYSTEM_UAT.md.
 */
screenDescribe('gathersystem_account_entry', 'GatherSystem create account (flag on)', () => {
	test('asks for an email only and confirms the link was sent', async ({ page }) => {
		const errors = collectPageErrors(page);
		await page.goto('/create-account', { waitUntil: 'networkidle' });

		await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toHaveCount(0);

		await page.getByRole('textbox', { name: 'Email' }).fill(`gs-e2e-new-${Date.now()}@example.com`);
		await page.getByRole('button', { name: 'Email me a secure link' }).click();
		await expect(page.getByText('Check your email').first()).toBeVisible();
		expectNoPageErrors(errors);
	});
});

screenDescribe('gathersystem_auth', 'GatherSystem unauthorized page (flag on)', () => {
	test.beforeAll(async () => {
		await ensureGatherSystemWorld();
	});

	test('a guardian sent to a staff page gets the restyled Access Denied card', async ({ page }) => {
		await signIn(page, ACCOUNTS.guardian);
		await page.goto('/rosters');
		await expect(page).toHaveURL(/\/unauthorized/);
		const title = page.getByText('Access Denied', { exact: true });
		await expect(title).toBeVisible();
		// The GatherSystem type scale; the legacy card uses `text-2xl`.
		await expect(title).toHaveClass(/text-headline-22/);
	});
});

import { expect, test } from '@playwright/test';
import { decodeQuotedPrintable } from '@/lib/mailhog-link';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import { createConfirmedTestUser, deleteTestUser } from './utils/seed';
import { loginWithPassword, waitForPostLoginRoute } from './utils/r1-helpers';

const MAILHOG_API = process.env.MAILHOG_API || 'http://localhost:8025/api/v2';

function isLocalRecoveryTestConfigured() {
	return Boolean(process.env.SUPABASE_SERVICE_ROLE) && /localhost|127\.0\.0\.1/.test(
		process.env.SUPABASE_URL || ''
	);
}

async function getRecoveryLink(email: string): Promise<string> {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		const response = await fetch(
			`${MAILHOG_API}/search?kind=to&query=${encodeURIComponent(email)}&limit=10`
		);
		if (response.ok) {
			const body = (await response.json()) as {
				items?: Array<{ Content?: { Body?: string } }>;
			};
			for (const message of body.items || []) {
				const decoded = decodeQuotedPrintable(message.Content?.Body || '').replace(
					/&amp;/g,
					'&'
				);
				const match = decoded.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/i);
				if (match?.[0]) return match[0].replace(/[.,;]+$/, '');
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`No recovery email received for ${email}`);
}

test.describe('PKCE password recovery @mutating', () => {
	test.skip(
		!isLocalRecoveryTestConfigured(),
		'Requires disposable local Supabase credentials in .env.e2e.local'
	);

	test('exchanges a real recovery link and never updates a pre-authenticated different account', async ({
		browser,
		page,
	}) => {
		test.slow();
		const recoveryEmail = generateUniqueEmail('password-recovery');
		const unrelatedEmail = generateUniqueEmail('password-recovery-other');
		const newPassword = 'RecoveredPassword1!';
		const recoveryUser = await createConfirmedTestUser(recoveryEmail, TEST_PASSWORD);
		const unrelatedUser = await createConfirmedTestUser(unrelatedEmail, TEST_PASSWORD);

		try {
			// Request through the login UI; its response must remain neutral.
			await page.goto('/login');
			await page.getByRole('button', { name: /forgot your password/i }).click();
			await page.getByLabel('Email Address').fill(recoveryEmail);
			await page.getByRole('button', { name: /send reset link/i }).click();
			await expect(page.getByText('Check Your Email')).toBeVisible();
			const recoveryLink = await getRecoveryLink(recoveryEmail);

			// A separate browser starts authenticated as someone else. The recovery
			// exchange must replace that temporary session instead of updating it.
			const unrelatedContext = await browser.newContext();
			const unrelatedPage = await unrelatedContext.newPage();
			await loginWithPassword(unrelatedPage, unrelatedEmail, TEST_PASSWORD);
			await waitForPostLoginRoute(unrelatedPage);
			await unrelatedPage.goto(recoveryLink, { waitUntil: 'domcontentloaded' });
			await expect(unrelatedPage.getByText('Reset Your Password')).toBeVisible();
			await expect(unrelatedPage).toHaveURL(/\/auth\/reset-password$/);
			await unrelatedPage.getByLabel('New Password').fill(newPassword);
			await unrelatedPage.getByLabel('Confirm New Password').fill(newPassword);
			await unrelatedPage.getByRole('button', { name: 'Update Password' }).click();
			await expect(unrelatedPage).toHaveURL(/\/login/);

			// The previous password cannot authenticate the recovery account.
			const oldPasswordContext = await browser.newContext();
			const oldPasswordPage = await oldPasswordContext.newPage();
			await loginWithPassword(oldPasswordPage, recoveryEmail, TEST_PASSWORD);
			await expect(oldPasswordPage).toHaveURL(/\/login/);

			// The new password works, while the unrelated account retains its password.
			const recoveredContext = await browser.newContext();
			const recoveredPage = await recoveredContext.newPage();
			await loginWithPassword(recoveredPage, recoveryEmail, newPassword);
			await waitForPostLoginRoute(recoveredPage);
			await loginWithPassword(unrelatedPage, unrelatedEmail, TEST_PASSWORD);
			await waitForPostLoginRoute(unrelatedPage);

			// Supabase rejects a recovery link after its one-time code is consumed.
			const replayContext = await browser.newContext();
			const replayPage = await replayContext.newPage();
			await replayPage.goto(recoveryLink, { waitUntil: 'domcontentloaded' });
			await expect(replayPage.getByText('Invalid Reset Link')).toBeVisible();

			await Promise.all([
				unrelatedContext.close(),
				oldPasswordContext.close(),
				recoveredContext.close(),
				replayContext.close(),
			]);
		} finally {
			await Promise.all([
				deleteTestUser(recoveryUser.id),
				deleteTestUser(unrelatedUser.id),
			]);
		}
	});
});

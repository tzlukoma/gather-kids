import { expect, test, type Page } from '@playwright/test';
import {
	ACCOUNTS,
	collectPageErrors,
	ensureGatherSystemWorld,
	expectNoPageErrors,
	screenDescribe,
	signIn,
} from './utils/gathersystem-screens';

/**
 * `gathersystem_admin` — staff shell, admin overview and the staff lists it
 * restyles. UAT counterpart: ADM-01 to ADM-08 in docs/GATHERSYSTEM_UAT.md.
 */
screenDescribe('gathersystem_admin', 'GatherSystem staff shell and admin (flag on)', () => {
	test.beforeAll(async () => {
		await ensureGatherSystemWorld();
	});

	test('admin lands on the GatherSystem dashboard and its links work', async ({ page }) => {
		const errors = collectPageErrors(page);
		await signIn(page, ACCOUNTS.admin);
		await page.goto('/admin-overview');

		await expect(page.getByRole('heading', { name: 'Admin Dashboard', level: 1 })).toBeVisible();
		// Dashboard-only shortcuts; the legacy overview has neither.
		await expect(page.getByRole('link', { name: 'Emergency snapshot', exact: true })).toBeVisible();
		await page.getByRole('link', { name: 'Open check-in' }).click();
		await expect(page).toHaveURL(/\/check-in/);

		expectNoPageErrors(errors);
	});

	// Each page's title takes STAFF_PAGE_TITLE (staff-list-styles.ts), the
	// GatherSystem type scale applied only inside the GatherSystem shell. On
	// Rosters it is the event switcher rather than the h1.
	for (const [path, title] of [
		['/rosters', (page: Page) => page.getByRole('button', { name: /^Check-in: / })],
		['/leaders', (page: Page) => page.getByRole('heading', { name: /Leaders/, level: 1 })],
		['/ministries', (page: Page) => page.getByRole('heading', { name: /Ministries/, level: 1 })],
		['/reports', (page: Page) => page.getByRole('heading', { name: /Reports/, level: 1 })],
		['/events', (page: Page) => page.getByRole('heading', { name: /Check-in events/, level: 1 })],
	] as const) {
		test(`${path} renders in the GatherSystem style`, async ({ page }) => {
			const errors = collectPageErrors(page);
			await signIn(page, ACCOUNTS.admin);
			await page.goto(path);
			await expect(title(page)).toBeVisible();
			await expect(title(page)).toHaveClass(/text-display-28/);
			expectNoPageErrors(errors);
		});
	}
});

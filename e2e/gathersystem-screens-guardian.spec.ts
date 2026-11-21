import { expect, test } from '@playwright/test';
import {
	ACCOUNTS,
	collectPageErrors,
	ensureGatherSystemWorld,
	expectNoPageErrors,
	guardianChildren,
	otherHouseholdChildId,
	screenDescribe,
	signIn,
} from './utils/gathersystem-screens';

/**
 * `gathersystem_guardian` — household home and child page, flag on.
 * UAT counterpart: GRD-01, GRD-03, GRD-04, GRD-09 in docs/GATHERSYSTEM_UAT.md.
 */
screenDescribe('gathersystem_guardian', 'GatherSystem guardian home and child (flag on)', () => {
	test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

	let kids: Record<string, string>;

	test.beforeAll(async () => {
		await ensureGatherSystemWorld();
		kids = await guardianChildren();
	});

	test('home lists each child and links to the household record', async ({ page }) => {
		const errors = collectPageErrors(page);
		await signIn(page, ACCOUNTS.guardian);
		await page.goto('/household');

		await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/, level: 1 })).toBeVisible();
		const children = page.getByRole('list').filter({ hasText: 'Sophia Johnson' });
		await expect(children.getByRole('listitem')).toHaveCount(2);
		// Bible Bee children show their scripture progress.
		await expect(children.getByText(/\d+ of \d+/).first()).toBeVisible();

		await page.getByRole('link', { name: 'View full household' }).click();
		await expect(page).toHaveURL(/\/household\/details/);
		expectNoPageErrors(errors);
	});

	test("a child's page shows its four cards", async ({ page }) => {
		const errors = collectPageErrors(page);
		await signIn(page, ACCOUNTS.guardian);
		await page.goto(`/household/children/${kids.Sophia}`);

		await expect(page.getByRole('heading', { name: 'Sophia Johnson', level: 1 })).toBeVisible();
		for (const card of ['Today', 'Medical & care', 'Program enrollments', 'Pickup & safety']) {
			await expect(page.getByRole('region', { name: card })).toBeVisible();
		}
		expectNoPageErrors(errors);
	});

	test("another household's child is not shown", async ({ page }) => {
		const otherId = await otherHouseholdChildId();
		await signIn(page, ACCOUNTS.guardian);
		await page.goto(`/household/children/${otherId}`);
		await expect(page.getByRole('region', { name: 'Medical & care' })).toHaveCount(0);
		await expect(page.getByText(/Smith/)).toHaveCount(0);
	});
});

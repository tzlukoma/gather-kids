import { expect, test, type Page } from '@playwright/test';
import {
	ACCOUNTS,
	collectPageErrors,
	ensureGatherSystemWorld,
	expectNoPageErrors,
	guardianChildren,
	resetScriptures,
	screenDescribe,
	signIn,
} from './utils/gathersystem-screens';

/**
 * `gathersystem_bible_bee_household` — one child's scripture list, flag on.
 * UAT counterpart: BBH-01, BBH-02 in docs/GATHERSYSTEM_UAT.md.
 */
/** The progress bar's percentage: 0, then 33 with one of three memorized. */
async function expectProgress(page: Page, percent: number) {
	await expect(
		page.getByRole('progressbar', { name: /Noah.s scriptures memorized/ }),
	).toHaveAttribute('aria-valuenow', String(percent));
}

screenDescribe(
	'gathersystem_bible_bee_household',
	'GatherSystem child Bible Bee (flag on) @mutating',
	() => {
		test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

		let noahId: string;

		test.beforeAll(async () => {
			await ensureGatherSystemWorld();
			noahId = (await guardianChildren()).Noah;
		});

		test.beforeEach(async () => {
			await resetScriptures(noahId);
		});

		test('marks a scripture memorized and back', async ({ page }) => {
			const errors = collectPageErrors(page);
			await signIn(page, ACCOUNTS.guardian);
			await page.goto(`/household/children/${noahId}/bible-bee`);

			await expect(page.getByRole('heading', { name: /Noah.s scriptures/, level: 1 })).toBeVisible();
			await expectProgress(page, 0);

			await page.getByRole('button', { name: 'Mark John 3:16 memorized' }).click();
			await expectProgress(page, 33);

			// Once something is memorized the To memorize / Memorized tabs appear.
			await expect(page.getByRole('group', { name: 'Which scriptures to show' })).toBeVisible();

			await page.getByRole('group', { name: 'Which scriptures to show' }).getByRole('button', { name: /^Memorized/ }).click();
			await page.getByRole('button', { name: /John 3:16 is memorized/ }).click();
			await expectProgress(page, 0);

			expectNoPageErrors(errors);
		});
	},
);

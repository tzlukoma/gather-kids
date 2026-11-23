import { expect, test } from '@playwright/test';
import {
	ACCOUNTS,
	closeOpenAttendance,
	collectPageErrors,
	ensureGatherSystemWorld,
	expectNoPageErrors,
	guardianChildren,
	screenDescribe,
	signIn,
} from './utils/gathersystem-screens';

/**
 * `gathersystem_door` — the GatherSystem check-in door, flag on.
 * UAT counterpart: DOOR-01, DOOR-04, DOOR-06, DOOR-07, DOOR-11 in
 * docs/GATHERSYSTEM_UAT.md.
 */
screenDescribe('gathersystem_door', 'GatherSystem door (flag on) @mutating', () => {
	let noahId: string;

	test.beforeAll(async () => {
		await ensureGatherSystemWorld();
		noahId = (await guardianChildren()).Noah;
	});

	test.beforeEach(async () => {
		await closeOpenAttendance(noahId);
	});

	test('checks a child in, transfers them, then checks them out', async ({ page }) => {
		const errors = collectPageErrors(page);
		await signIn(page, ACCOUNTS.admin);
		await page.goto('/check-in');

		// The summary region exists only on the GatherSystem door.
		await expect(page.getByRole('region', { name: 'Check-in summary' })).toBeVisible();

		const row = page.getByRole('row', { name: /Noah Johnson/ });
		await row.getByRole('button', { name: 'Check in' }).click();
		await expect(page.getByText('Checked In', { exact: true }).first()).toBeVisible();
		await expect(row.getByRole('button', { name: 'Check out' })).toBeVisible();

		await row.getByRole('button', { name: 'Transfer Noah Johnson to another event' }).click();
		const dialog = page.getByRole('dialog', { name: /Transfer Noah Johnson/ });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('radio').last().click();
		const confirm = dialog.getByRole('button', { name: /^Transfer to / });
		const destination = ((await confirm.textContent()) ?? '').replace(/^\s*Transfer to\s*/, '').trim();
		expect(destination).not.toBe('');
		await confirm.click();
		await expect(dialog).toBeHidden();
		await expect(page.getByText('Transferred', { exact: true }).first()).toBeVisible();

		// On this event's door the child now reads as in the other event, and
		// can't be checked in here twice.
		await expect(row.getByRole('cell', { name: `In ${destination}` })).toBeVisible();
		await expect(row.getByRole('button', { name: 'Check in' })).toBeDisabled();

		// Check out from the destination event's door.
		await page.getByRole('button', { name: 'Change event' }).click();
		const picker = page.getByRole('dialog', { name: 'Change Event' });
		await picker.getByRole('radio', { name: destination }).click();
		await page.keyboard.press('Escape');
		await expect(picker).toBeHidden();
		await row.getByRole('button', { name: 'Check out' }).click();
		// Release needs the last 4 digits of an authorized phone (seed: Bob
		// Johnson, 555-234-5678).
		const checkout = page.getByRole('dialog', { name: 'Checkout: Noah Johnson' });
		await checkout.getByRole('textbox', { name: 'Phone Last 4' }).fill('5678');
		await checkout.getByRole('button', { name: 'Verify & Check Out' }).click();
		await expect(checkout).toBeHidden();
		await expect(page.getByText('Checked Out', { exact: true }).first()).toBeVisible();
		await expect(row.getByRole('button', { name: 'Check in' })).toBeVisible();

		expectNoPageErrors(errors);
	});

	test('opens on the tab a ?filter= link names', async ({ page }) => {
		await signIn(page, ACCOUNTS.admin);
		await page.goto('/check-in?filter=checkedIn');
		await expect(page.getByRole('tab', { name: /^Checked in/ })).toHaveAttribute(
			'aria-selected',
			'true',
		);

		// An unreadable value falls back to the full list rather than an error.
		await page.goto('/check-in?filter=nonsense');
		await expect(page.getByRole('tab', { name: /^All/ })).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});
});

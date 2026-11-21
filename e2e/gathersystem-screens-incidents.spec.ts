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
 * `gathersystem_incidents` — log and acknowledge, flag on.
 * UAT counterpart: INC-01 to INC-03 in docs/GATHERSYSTEM_UAT.md.
 */
screenDescribe('gathersystem_incidents', 'GatherSystem incidents (flag on) @mutating', () => {
	test.beforeAll(async () => {
		await ensureGatherSystemWorld();
	});

	test('logs an incident, then acknowledges it', async ({ page }) => {
		const errors = collectPageErrors(page);
		const description = `E2E incident ${Date.now()}`;

		await signIn(page, ACCOUNTS.admin);
		await page.goto('/incidents');
		await expect(page.getByRole('heading', { name: 'Incidents', level: 1 })).toBeVisible();

		await page.getByRole('combobox', { name: 'Child Involved' }).click();
		await page.getByRole('option').first().click();
		await page.getByRole('combobox', { name: 'Severity' }).click();
		await page.getByRole('option', { name: /low/i }).click();
		await page.getByRole('textbox', { name: 'Description of Incident' }).fill(description);
		await page.getByRole('button', { name: 'Log Incident' }).click();
		await expect(page.getByText('Incident Logged', { exact: true }).first()).toBeVisible();

		await page.getByRole('tab', { name: 'View Incidents' }).click();
		const row = page.getByRole('row', { name: new RegExp(description) });
		await expect(row).toBeVisible();
		await row.getByRole('button', { name: 'Acknowledge' }).click();
		await expect(page.getByText('Incident Acknowledged', { exact: true }).first()).toBeVisible();
		await expect(row.getByRole('button', { name: 'Acknowledge' })).toHaveCount(0);

		expectNoPageErrors(errors);
	});
});

import { expect, type Page } from '@playwright/test';

type AuthRole = 'ADMIN' | 'MINISTRY_LEADER' | 'GUARDIAN' | 'VOLUNTEER' | 'GUEST';

export interface E2EAuthUser {
	uid: string;
	id: string;
	displayName: string;
	email: string;
	is_active: boolean;
	metadata: {
		role: AuthRole;
	};
	assignedMinistryIds: string[];
}

export class UserManagementPage {
	constructor(private page: Page) {}

	async signInAs(user: E2EAuthUser) {
		await this.page.addInitScript((authUser) => {
			window.sessionStorage.setItem(
				'gk-offline-session-user',
				JSON.stringify(authUser)
			);
		}, user);
	}

	async goto() {
		await this.page.goto('/dashboard/users');
	}

	async expectLoaded() {
		await expect(
			this.page.getByRole('heading', { name: 'User Management' })
		).toBeVisible();
		await expect(
			this.page.getByRole('button', { name: /^Create User$/i })
		).toBeVisible();
	}

	async expectAccessDenied() {
		await expect(this.page.getByText(/access denied/i)).toBeVisible();
		await expect(
			this.page.getByRole('button', { name: /^Create User$/i })
		).toHaveCount(0);
		await expect(this.page.getByRole('table')).toHaveCount(0);
	}

	async openCreateUserDialog() {
		await this.page.getByRole('button', { name: /^Create User$/i }).click();
		await expect(this.createUserDialog()).toBeVisible();
	}

	async fillCreateUserForm({
		email,
		password,
		fullName,
		role = 'GUEST',
		emailConfirmed = true,
	}: {
		email: string;
		password: string;
		fullName?: string;
		role?: AuthRole;
		emailConfirmed?: boolean;
	}) {
		const dialog = this.createUserDialog();
		await dialog.getByRole('textbox', { name: /^Email$/i }).fill(email);
		await dialog.getByLabel(/^Password$/i).fill(password);
		if (fullName) {
			await dialog.getByLabel(/full name/i).fill(fullName);
		}
		await dialog.getByRole('combobox', { name: /role/i }).click();
		await this.page.getByRole('option', { name: role, exact: true }).click();
		const checkbox = dialog.getByRole('checkbox', {
			name: /mark email as confirmed/i,
		});
		if ((await checkbox.isChecked()) !== emailConfirmed) {
			await checkbox.click();
		}
	}

	async submitCreateUser() {
		await this.createUserDialog()
			.getByRole('button', { name: /^Create User$/i })
			.click();
	}

	async expectCreateValidation(message: RegExp) {
		const dialog = this.createUserDialog();
		await expect(dialog.getByRole('alert')).toContainText(message);
		await expect(dialog).toBeVisible();
	}

	async openSetPasswordDialogFor(email: string) {
		await this.rowFor(email)
			.getByRole('button', { name: new RegExp(`set password for ${email}`, 'i') })
			.click();
		await expect(this.setPasswordDialog()).toBeVisible();
	}

	async setNewPassword(password: string) {
		const dialog = this.setPasswordDialog();
		await dialog.getByLabel(/new password/i).fill(password);
		const selfConfirm = dialog.getByRole('checkbox', {
			name: /i understand i will be signed out/i,
		});
		if ((await selfConfirm.count()) > 0 && !(await selfConfirm.isChecked())) {
			await selfConfirm.click();
		}
		await dialog.getByRole('button', { name: /^Set Password$/i }).click();
	}

	async confirmEmailFor(email: string) {
		await this.rowFor(email)
			.getByRole('button', { name: /confirm email/i })
			.click();
	}

	async promoteToAdmin(email: string) {
		await this.rowFor(email)
			.getByRole('button', { name: /promote to admin/i })
			.click();
	}

	async expectUserRow(email: string) {
		await expect(this.rowFor(email)).toBeVisible();
	}

	async expectRowContains(email: string, text: string | RegExp) {
		await expect(this.rowFor(email)).toContainText(text);
	}

	async expectRowDoesNotHaveButton(email: string, name: RegExp) {
		await expect(this.rowFor(email).getByRole('button', { name })).toHaveCount(0);
	}

	private rowFor(email: string) {
		return this.page.getByRole('row').filter({ hasText: email });
	}

	private createUserDialog() {
		return this.page.getByRole('dialog', { name: /create user/i });
	}

	private setPasswordDialog() {
		return this.page.getByRole('dialog', { name: /set password/i });
	}
}

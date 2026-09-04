import { expect, test, type Page, type Route } from '@playwright/test';
import {
	type E2EAuthUser,
	UserManagementPage,
} from './page-objects/user-management.page';

type UserRole = 'ADMIN' | 'MINISTRY_LEADER' | 'GUARDIAN' | 'VOLUNTEER' | 'GUEST';

interface AdminUserRecord {
	id: string;
	email: string;
	role: UserRole;
	name: string;
	email_confirmed: boolean;
	last_sign_in: string | null;
	created_at: string;
	user_metadata: Record<string, unknown>;
}

interface CreateUserPayload {
	email: string;
	password: string;
	full_name?: string;
	role: UserRole;
	email_confirm: boolean;
}

interface UpdateUserPayload {
	role?: UserRole;
	email_confirmed?: boolean;
	password?: string;
}

const adminAuthUser: E2EAuthUser = {
	uid: 'e2e-admin-user',
	id: 'e2e-admin-user',
	displayName: 'E2E Admin',
	email: 'admin@example.com',
	is_active: true,
	metadata: {
		role: 'ADMIN',
	},
	assignedMinistryIds: [],
};

const leaderAuthUser: E2EAuthUser = {
	uid: 'e2e-leader-user',
	id: 'e2e-leader-user',
	displayName: 'E2E Ministry Leader',
	email: 'leader.biblebee@example.com',
	is_active: true,
	metadata: {
		role: 'MINISTRY_LEADER',
	},
	assignedMinistryIds: ['bible-bee'],
};

function initialUsers(): AdminUserRecord[] {
	return [
		{
			id: adminAuthUser.id,
			email: adminAuthUser.email,
			role: 'ADMIN',
			name: 'E2E Admin',
			email_confirmed: true,
			last_sign_in: null,
			created_at: '2026-01-01T00:00:00.000Z',
			user_metadata: { role: 'ADMIN', full_name: 'E2E Admin' },
		},
		{
			id: 'e2e-unconfirmed-user',
			email: 'unconfirmed.admin-e2e@example.test',
			role: 'GUEST',
			name: 'Unconfirmed E2E User',
			email_confirmed: false,
			last_sign_in: null,
			created_at: '2026-01-02T00:00:00.000Z',
			user_metadata: { role: 'GUEST', full_name: 'Unconfirmed E2E User' },
		},
		{
			id: 'e2e-member-user',
			email: 'member.admin-e2e@example.test',
			role: 'GUEST',
			name: 'Member E2E User',
			email_confirmed: true,
			last_sign_in: null,
			created_at: '2026-01-03T00:00:00.000Z',
			user_metadata: { role: 'GUEST', full_name: 'Member E2E User' },
		},
	];
}

async function installUsersApiMock(page: Page, users: AdminUserRecord[]) {
	await page.route(/\/api\/users\/create(?:\?.*)?$/, async (route) => {
		const request = route.request();
		if (request.method() !== 'POST') {
			await route.fallback();
			return;
		}

		const payload = request.postDataJSON() as CreateUserPayload;
		const createdUser: AdminUserRecord = {
			id: `e2e-created-${users.length + 1}`,
			email: payload.email,
			role: payload.role,
			name: payload.full_name || payload.email,
			email_confirmed: payload.email_confirm,
			last_sign_in: null,
			created_at: new Date().toISOString(),
			user_metadata: {
				role: payload.role,
				full_name: payload.full_name,
			},
		};
		users.push(createdUser);

		await fulfillJson(route, { user: createdUser });
	});

	await page.route(/\/api\/users\/[^/?]+(?:\?.*)?$/, async (route) => {
		const request = route.request();
		if (request.method() !== 'PATCH') {
			await route.fallback();
			return;
		}

		const userId = new URL(request.url()).pathname.split('/').pop();
		const payload = request.postDataJSON() as UpdateUserPayload;
		const user = users.find((item) => item.id === userId);

		if (!user) {
			await fulfillJson(route, { error: 'User not found' }, 404);
			return;
		}

		if (payload.role) {
			user.role = payload.role;
			user.user_metadata = { ...user.user_metadata, role: payload.role };
		}
		if (payload.email_confirmed !== undefined) {
			user.email_confirmed = payload.email_confirmed;
		}

		await fulfillJson(route, { user });
	});

	await page.route(/\/api\/users(?:\?.*)?$/, async (route) => {
		if (route.request().method() !== 'GET') {
			await route.fallback();
			return;
		}

		await fulfillJson(route, { users });
	});
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
	await route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

test.describe('Admin User Management', () => {
	let users: AdminUserRecord[];
	let userManagement: UserManagementPage;

	test.beforeEach(async ({ page }) => {
		users = initialUsers();
		await installUsersApiMock(page, users);
		userManagement = new UserManagementPage(page);
	});

	test('admin can access User Management from the dashboard route', async ({
		page,
	}) => {
		await userManagement.signInAs(adminAuthUser);

		await userManagement.goto();

		await expect(page).toHaveURL(/\/users$/);
		await userManagement.expectLoaded();
	});

	test('admin can create a user', async ({ page }) => {
		const email = `created-${Date.now()}@admin-e2e.example.test`;
		await userManagement.signInAs(adminAuthUser);
		await userManagement.goto();
		await userManagement.expectLoaded();

		await userManagement.openCreateUserDialog();
		await userManagement.fillCreateUserForm({
			email,
			password: 'StrongPass123!',
			fullName: 'Created E2E User',
			role: 'GUEST',
			emailConfirmed: true,
		});
		await userManagement.submitCreateUser();

		await expect(page.getByText('User created successfully').first()).toBeVisible();
		await userManagement.expectUserRow(email);
		await userManagement.expectRowContains(email, 'GUEST');
		await userManagement.expectRowContains(email, 'Confirmed');
	});

	test('create user validation keeps the dialog open for invalid input', async () => {
		await userManagement.signInAs(adminAuthUser);
		await userManagement.goto();
		await userManagement.expectLoaded();

		await userManagement.openCreateUserDialog();
		await userManagement.fillCreateUserForm({
			email: 'short-password@example.test',
			password: 'short',
		});
		await userManagement.submitCreateUser();

		await userManagement.expectCreateValidation(/password must be at least 8 characters/i);
	});

	test('admin can set a password for another user', async ({ page }) => {
		await userManagement.signInAs(adminAuthUser);
		await userManagement.goto();
		await userManagement.expectLoaded();

		await userManagement.openSetPasswordDialogFor('member.admin-e2e@example.test');
		await userManagement.setNewPassword('UpdatedPass123!');

		await expect(
			page.getByText('Password updated successfully').first()
		).toBeVisible();
		await expect(page.getByRole('dialog', { name: /set password/i })).toHaveCount(0);
	});

	test('admin can confirm an unconfirmed email address', async ({ page }) => {
		await userManagement.signInAs(adminAuthUser);
		await userManagement.goto();
		await userManagement.expectLoaded();

		await userManagement.confirmEmailFor('unconfirmed.admin-e2e@example.test');

		await expect(
			page
				.getByText('Email confirmed for unconfirmed.admin-e2e@example.test')
				.first()
		).toBeVisible();
		await userManagement.expectRowContains(
			'unconfirmed.admin-e2e@example.test',
			'Confirmed'
		);
		await userManagement.expectRowDoesNotHaveButton(
			'unconfirmed.admin-e2e@example.test',
			/confirm email/i
		);
	});

	test('admin can promote a non-admin user to admin', async ({ page }) => {
		await userManagement.signInAs(adminAuthUser);
		await userManagement.goto();
		await userManagement.expectLoaded();

		await userManagement.promoteToAdmin('member.admin-e2e@example.test');

		await expect(
			page
				.getByText('Successfully promoted member.admin-e2e@example.test to ADMIN')
				.first()
		).toBeVisible();
		await userManagement.expectRowContains('member.admin-e2e@example.test', 'ADMIN');
		await userManagement.expectRowDoesNotHaveButton(
			'member.admin-e2e@example.test',
			/promote to admin/i
		);
	});

	test('non-admin users see access denied for User Management', async ({ page }) => {
		await userManagement.signInAs(leaderAuthUser);

		await userManagement.goto();

		await expect(page).toHaveURL(/\/users$/);
		await userManagement.expectAccessDenied();
	});
});

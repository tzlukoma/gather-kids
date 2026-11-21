import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertDisposableLocalSupabase } from './gathersystem-wizard';

/**
 * Shared harness for the flag-on GatherSystem screen specs
 * (`e2e/gathersystem-screens-*.spec.ts`).
 *
 * Registration has its own suite (`gathersystem-registration-*`). These cover
 * the other seven flagged surfaces, one short main-path test each, so a change
 * cannot quietly break a screen that is only ever rendered with its flag on.
 *
 * The flags are forced on for the dev server through `GATHERSYSTEM_LOCAL_FLAGS`
 * (`src/lib/flags/local-flag-overrides.ts`), which refuses UAT and production
 * by name. The data is `npm run seed:dev` plus the help-screenshot fixtures,
 * on a disposable local Supabase only.
 */

/** Every key the screen specs need on. CI passes exactly this list. */
export const SCREEN_FLAGS = [
	'gathersystem_door',
	'gathersystem_admin',
	'gathersystem_incidents',
	'gathersystem_guardian',
	'gathersystem_bible_bee_household',
	'gathersystem_auth',
	'gathersystem_account_entry',
] as const;

export type ScreenFlag = (typeof SCREEN_FLAGS)[number];

export const PASSWORD = 'TestPassword123!';

export const ACCOUNTS = {
	admin: { email: 'gs-e2e-admin@example.com', role: 'ADMIN', name: 'GS Admin' },
	/** Linked to the dev-seed Johnson household (two children, Bible Bee). */
	guardian: {
		email: 'gs-e2e-guardian@example.com',
		role: 'GUARDIAN',
		name: 'Jordan Johnson',
	},
} as const;

function enabledFlags(): Set<string> {
	return new Set(
		(process.env.GATHERSYSTEM_LOCAL_FLAGS || '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

/**
 * `test.describe` that runs only when the flag is forced on and local Supabase
 * is configured, so a plain `npx playwright test` does not run these against
 * legacy screens and report misleading failures.
 */
export function screenDescribe(flag: ScreenFlag, title: string, fn: () => void) {
	test.describe(title, () => {
		test.skip(
			!enabledFlags().has(flag),
			`Set GATHERSYSTEM_LOCAL_FLAGS to include ${flag} (prefer: npm run test:e2e:gathersystem-screens)`,
		);
		test.skip(
			!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE,
			'Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE for a local Supabase',
		);
		fn();
	});
}

function adminClient(): SupabaseClient {
	assertDisposableLocalSupabase();
	return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

/**
 * Role in `app_metadata` as well as `user_metadata`: the database reads the
 * role from the JWT's `app_metadata` (#495), so a role only in user_metadata
 * resolves as GUEST and every staff screen renders empty.
 */
async function upsertUser(
	supabase: SupabaseClient,
	{ email, role, name }: { email: string; role: string; name: string },
	extraUserMetadata: Record<string, unknown> = {},
): Promise<string> {
	const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
		perPage: 1000,
	});
	if (listError) throw listError;
	const existing = listed.users.find((u) => u.email === email);
	const attrs = {
		password: PASSWORD,
		email_confirm: true,
		user_metadata: { role, full_name: name, ...extraUserMetadata },
		app_metadata: { role },
	};
	let id: string;
	if (existing) {
		const { error } = await supabase.auth.admin.updateUserById(existing.id, attrs);
		if (error) throw error;
		id = existing.id;
	} else {
		const { data, error } = await supabase.auth.admin.createUser({ email, ...attrs });
		if (error || !data.user) throw error ?? new Error(`createUser ${email}`);
		id = data.user.id;
	}
	const { error: usersError } = await supabase.from('users').upsert({
		user_id: id,
		name,
		email,
		role,
		is_active: true,
		updated_at: new Date().toISOString(),
	});
	if (usersError) throw usersError;
	return id;
}

let worldReady: Promise<void> | undefined;

/**
 * Accounts and data for the screen specs. Idempotent, so every spec can call it
 * in `beforeAll`. Requires `npm run seed:dev` to have run first (CI does it).
 */
export function ensureGatherSystemWorld(): Promise<void> {
	worldReady ??= (async () => {
		const supabase = adminClient();

		const { data: johnson, error: householdError } = await supabase
			.from('households')
			.select('household_id')
			.eq('email', 'johnson@example.com')
			.maybeSingle();
		if (householdError) throw householdError;
		if (!johnson?.household_id) {
			throw new Error('Johnson household missing: run `npm run seed:dev` first');
		}

		await upsertUser(supabase, ACCOUNTS.admin);
		const guardianId = await upsertUser(supabase, ACCOUNTS.guardian, {
			household_id: johnson.household_id,
		});
		const { error: linkError } = await supabase
			.from('user_households')
			.upsert(
				{ auth_user_id: guardianId, household_id: johnson.household_id },
				{ onConflict: 'auth_user_id' },
			);
		if (linkError) throw linkError;

		// Prior cycle, Bible Bee cycle/division/scriptures and enrollments.
		const { ensureHelpScreenshotFixtures } = await import(
			'../../scripts/help-screenshot-fixtures.mjs'
		);
		await ensureHelpScreenshotFixtures(supabase);
	})();
	return worldReady;
}

/** Child ids for the guardian's household, first name → id. */
export async function guardianChildren(): Promise<Record<string, string>> {
	const supabase = adminClient();
	const { data: household } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'johnson@example.com')
		.single();
	const { data: children, error } = await supabase
		.from('children')
		.select('child_id, first_name')
		.eq('household_id', household!.household_id);
	if (error) throw error;
	return Object.fromEntries((children ?? []).map((c) => [c.first_name, c.child_id]));
}

/** Close a child's open check-ins so a door test starts from a known state. */
export async function closeOpenAttendance(childId: string): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase
		.from('attendance')
		.update({ check_out_at: new Date().toISOString() })
		.eq('child_id', childId)
		.is('check_out_at', null);
	if (error) throw error;
}

/** Mark every scripture not memorized for a child, so toggling starts clean. */
export async function resetScriptures(childId: string): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase
		.from('student_scriptures')
		.update({ is_completed: false, completed_at: null })
		.eq('child_id', childId);
	if (error) throw error;
}

/** A child id from a household the test guardian is not linked to. */
export async function otherHouseholdChildId(): Promise<string> {
	const supabase = adminClient();
	const { data: household } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'smith@example.com')
		.single();
	const { data: child, error } = await supabase
		.from('children')
		.select('child_id')
		.eq('household_id', household!.household_id)
		.limit(1)
		.single();
	if (error) throw error;
	return child.child_id;
}

export async function signIn(page: Page, account: { email: string }) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	const email = page.locator('#email');
	const password = page.locator('#password');
	// Filling before React hydrates loses the value, so re-fill until it sticks.
	await expect(async () => {
		await email.fill(account.email);
		await password.fill(PASSWORD);
		await expect(email).toHaveValue(account.email, { timeout: 1_000 });
		await expect(password).toHaveValue(PASSWORD, { timeout: 1_000 });
	}).toPass({ timeout: 30_000 });
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
		timeout: 45_000,
		waitUntil: 'commit',
	});
}

/** Fail the test on any uncaught page error, the cheapest regression signal. */
export function collectPageErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));
	return errors;
}

export function expectNoPageErrors(errors: string[]) {
	expect(errors, `Uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
}

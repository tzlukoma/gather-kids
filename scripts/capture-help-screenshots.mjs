#!/usr/bin/env node
/**
 * Capture baseline PNGs for /help screenshots from local seeded gatherKids.
 *
 * Default: http://localhost:9002 + local Supabase only.
 * Refuses production. Refuses UAT unless HELP_SCREENSHOT_ALLOW_UAT=1.
 *
 * Usage:
 *   npm run help:capture-screenshots
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ensureHelpScreenshotFixtures } from './help-screenshot-fixtures.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: join(root, '.env.e2e.local') });
loadEnv({ path: join(root, '.env.local') });

const appEnv = {};
loadEnv({ path: join(root, '.env.local'), processEnv: appEnv });

const VIEWPORT = { width: 1280, height: 800 };
const OUT_DIR = join(root, 'public', 'help', 'screenshots');

const PROD_HOSTS = new Set([
	'gatherkidslive.com',
	'www.gatherkidslive.com',
]);

const ALLOWED_EMAIL_DOMAINS = new Set([
	'example.com',
	'example.test',
	// Seed ministry group contact in scripts/seed/dev_seed.js (not prod PII)
	'morethanahut.com',
]);

const BASE_URL = (process.env.BASE_URL || 'http://localhost:9002').replace(
	/\/$/,
	''
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const ADMIN_EMAIL = process.env.HELP_SCREENSHOT_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD =
	process.env.HELP_SCREENSHOT_ADMIN_PASSWORD || 'TestPassword123!';
const GUARDIAN_EMAIL =
	process.env.HELP_SCREENSHOT_GUARDIAN_EMAIL ||
	'parent-with-household@example.com';
const GUARDIAN_PASSWORD =
	process.env.HELP_SCREENSHOT_GUARDIAN_PASSWORD || 'TestPassword123!';
const HOUSEHOLD_EMAIL =
	process.env.HELP_SCREENSHOT_HOUSEHOLD_EMAIL ||
	'household-complete@example.com';
const HOUSEHOLD_PASSWORD =
	process.env.HELP_SCREENSHOT_HOUSEHOLD_PASSWORD || 'TestPassword123!';
const NEW_FAMILY_EMAIL =
	process.env.HELP_SCREENSHOT_NEW_FAMILY_EMAIL || 'new-family@example.com';
const NEW_FAMILY_PASSWORD =
	process.env.HELP_SCREENSHOT_NEW_FAMILY_PASSWORD || 'TestPassword123!';

function isLocalHost(hostname) {
	return hostname === 'localhost' || hostname === '127.0.0.1';
}

function assertSafeCaptureTarget() {
	let parsed;
	try {
		parsed = new URL(BASE_URL);
	} catch {
		throw new Error(`Invalid BASE_URL: ${BASE_URL}`);
	}

	const host = parsed.hostname.toLowerCase();
	if (PROD_HOSTS.has(host) || host.endsWith('.gatherkidslive.com')) {
		throw new Error(`Refusing production host: ${host}`);
	}
	if (
		process.env.NEXT_PUBLIC_DEPLOY_ENV === 'production' ||
		process.env.VERCEL_ENV === 'production'
	) {
		throw new Error('Refusing capture while deploy env is production');
	}

	const allowUat = process.env.HELP_SCREENSHOT_ALLOW_UAT === '1';
	if (!isLocalHost(host) && !allowUat) {
		throw new Error(
			`Refusing non-local BASE_URL (${BASE_URL}). Use local seeded dev, or set HELP_SCREENSHOT_ALLOW_UAT=1 after a synthetic UAT reset. See docs/HELP_DOCS.md.`
		);
	}

	if (SUPABASE_URL) {
		const supabaseHost = new URL(SUPABASE_URL).hostname.toLowerCase();
		const supabaseLocal =
			isLocalHost(supabaseHost) || supabaseHost.endsWith('.supabase.internal');
		if (!supabaseLocal && !allowUat) {
			throw new Error(
				`Refusing non-local Supabase URL (${supabaseHost}). Capture against local Supabase only unless HELP_SCREENSHOT_ALLOW_UAT=1.`
			);
		}
		if (supabaseHost.includes('supabase.co') && !allowUat) {
			throw new Error(`Refusing hosted Supabase project: ${supabaseHost}`);
		}
	}

	console.log(`Capture target: ${BASE_URL} (host=${host})`);
}

function auditPageText(text, label) {
	const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
	for (const email of emails) {
		const domain = email.split('@')[1]?.toLowerCase();
		if (domain && !ALLOWED_EMAIL_DOMAINS.has(domain)) {
			throw new Error(
				`${label}: blocked email domain @${domain} (only synthetic @example.com captures are allowed)`
			);
		}
	}

	const phones =
		text.match(
			/\b(?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[-.\s]\d{3}[-.\s]\d{4}\b/g
		) || [];
	for (const phone of phones) {
		const digits = phone.replace(/\D/g, '').replace(/^1/, '');
		if (digits.startsWith('555')) continue;
		throw new Error(`${label}: blocked phone-like text ${phone}`);
	}
}

async function ensureScreenshotUsers() {
	const supabaseUrl =
		appEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey =
		appEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceKey) {
		console.warn(
			'Skipping auth user ensure: missing local NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
		);
		return;
	}
	if (!isLocalHost(new URL(supabaseUrl).hostname)) {
		console.warn('Skipping auth user ensure: Supabase is not local');
		return;
	}

	const supabase = createClient(supabaseUrl, serviceKey, {
		auth: { persistSession: false },
	});

	async function upsertAuthUser({ email, password, role, fullName }) {
		const { data: listed, error: listError } =
			await supabase.auth.admin.listUsers();
		if (listError) throw listError;
		const existing = listed.users.find((user) => user.email === email);
		if (existing) {
			const { error } = await supabase.auth.admin.updateUserById(existing.id, {
				password,
				email_confirm: true,
				user_metadata: { role, full_name: fullName },
			});
			if (error) throw error;
			return existing.id;
		}
		const { data, error } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { role, full_name: fullName },
		});
		if (error) throw error;
		return data.user.id;
	}

	const adminId = await upsertAuthUser({
		email: ADMIN_EMAIL,
		password: ADMIN_PASSWORD,
		role: 'ADMIN',
		fullName: 'Administrator',
	});
	await supabase.from('users').upsert({
		user_id: adminId,
		name: 'Administrator',
		email: ADMIN_EMAIL,
		role: 'ADMIN',
		is_active: true,
		updated_at: new Date().toISOString(),
	});

	const guardianId = await upsertAuthUser({
		email: GUARDIAN_EMAIL,
		password: GUARDIAN_PASSWORD,
		role: 'GUARDIAN',
		fullName: 'Pat Parent',
	});
	const { data: household } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'smith@example.com')
		.maybeSingle();
	if (household?.household_id) {
		await supabase.from('user_households').upsert(
			{
				auth_user_id: guardianId,
				household_id: household.household_id,
			},
			{ onConflict: 'auth_user_id' }
		);
	}

	const householdUserId = await upsertAuthUser({
		email: HOUSEHOLD_EMAIL,
		password: HOUSEHOLD_PASSWORD,
		role: 'GUARDIAN',
		fullName: 'Jordan Johnson',
	});
	await supabase.from('users').upsert({
		user_id: householdUserId,
		name: 'Jordan Johnson',
		email: HOUSEHOLD_EMAIL,
		role: 'GUARDIAN',
		is_active: true,
		updated_at: new Date().toISOString(),
	});
	const { data: johnsonHousehold } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'johnson@example.com')
		.maybeSingle();
	if (johnsonHousehold?.household_id) {
		await supabase.from('user_households').upsert(
			{
				auth_user_id: householdUserId,
				household_id: johnsonHousehold.household_id,
			},
			{ onConflict: 'auth_user_id' }
		);
		await supabase.auth.admin.updateUserById(householdUserId, {
			user_metadata: {
				role: 'GUARDIAN',
				full_name: 'Jordan Johnson',
				household_id: johnsonHousehold.household_id,
			},
		});
	}

	const newFamilyId = await upsertAuthUser({
		email: NEW_FAMILY_EMAIL,
		password: NEW_FAMILY_PASSWORD,
		role: 'GUARDIAN',
		fullName: 'New Family',
	});
	await supabase.from('users').upsert({
		user_id: newFamilyId,
		name: 'New Family',
		email: NEW_FAMILY_EMAIL,
		role: 'GUARDIAN',
		is_active: true,
		updated_at: new Date().toISOString(),
	});
	await supabase.from('user_households').delete().eq('auth_user_id', newFamilyId);

	await supabase.from('form_drafts').delete().in('user_id', [
		guardianId,
		householdUserId,
		newFamilyId,
	]);

	await ensureHelpScreenshotFixtures(supabase);
	console.log(
		'Ensured local screenshot auth users (admin, new family, returning guardian, household guardian)'
	);
}

async function hideDevChrome(page) {
	await page.addStyleTag({
		content: `
      nextjs-portal { display: none !important; }
      #nc-portal { display: none !important; }
      [data-radix-toast-viewport],
      [data-radix-toast-root],
      .tsqd-parent-container,
      .tsqd-open-btn-container {
        display: none !important;
      }
    `,
	});
	await page.evaluate(() => {
		for (const button of document.querySelectorAll('button')) {
			if ((button.textContent || '').includes('Auth Debug')) {
				button.style.display = 'none';
			}
		}
		for (const el of document.querySelectorAll('li, ol, [role="status"]')) {
			const text = el.textContent || '';
			if (
				text.includes('Household Found') ||
				text.includes('Complete Your Registration')
			) {
				el.style.display = 'none';
			}
		}
	});
}

async function waitVisible(page, locator, label, timeout = 30000) {
	try {
		await locator.waitFor({ state: 'visible', timeout });
	} catch (error) {
		const body = await page.locator('body').innerText();
		throw new Error(
			`${label}: ${error.message}. Page text: ${body.slice(0, 600)}`
		);
	}
}

async function screenshot(page, file, label) {
	await hideDevChrome(page);
	const text = await page.locator('body').innerText();
	auditPageText(text, label);
	const dest = join(OUT_DIR, file);
	await page.screenshot({ path: dest, fullPage: false });
	console.log(`  saved ${file}`);
}

async function login(page, email, password) {
	await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
	await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 });
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(password);
	await page.getByRole('button', { name: /^sign in$/i }).click();
	await page.evaluate(() => {
		try {
			localStorage.removeItem('bb_progress_filters_v1');
		} catch {
			// ignore
		}
	});
	try {
		await page.waitForURL(/\/(admin-overview|check-in|household|register|rosters)/, {
			timeout: 30000,
			waitUntil: 'domcontentloaded',
		});
	} catch (error) {
		const body = await page.locator('body').innerText();
		throw new Error(
			`Login did not leave /login for ${email}. Page text: ${body.slice(0, 400)}`
		);
	}
}

async function logout(page) {
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			sessionStorage.clear();
		} catch {
			// ignore
		}
	});
	await page.context().clearCookies();
	await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
}

async function safe(label, fn) {
	try {
		await fn();
		return true;
	} catch (error) {
		if (
			/expected UI missing|redirected to|bible-bee-overview|bible-bee-progress|registration-returning|registration-child|registration-household|household-profile|household-edit-child|household-bible-bee/.test(
				String(error.message || '')
			)
		) {
			throw error;
		}
		console.warn(`  skip ${label}: ${error.message}`);
		return false;
	}
}

async function main() {
	assertSafeCaptureTarget();
	await ensureScreenshotUsers();

	const health = await fetch(BASE_URL).catch(() => null);
	if (!health?.ok && health?.status !== 404) {
		throw new Error(
			`Nothing listening at ${BASE_URL}. Start local seeded app: npm run seed:dev && npm run dev`
		);
	}

	mkdirSync(OUT_DIR, { recursive: true });

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: VIEWPORT,
		baseURL: BASE_URL,
	});
	const page = await context.newPage();
	let captured = 0;

	const shot = async (file, label) => {
		await screenshot(page, file, label);
		captured += 1;
	};

	await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	await shot('registration-landing.png', 'registration-landing');

	await safe('admin staff screens', async () => {
		await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
		await page.goto(`${BASE_URL}/admin-overview`, {
			waitUntil: 'networkidle',
		});
		await page.waitForTimeout(800);
		await shot('leader-dashboard.png', 'leader-dashboard');

		await page.goto(`${BASE_URL}/check-in`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await shot('check-in-list.png', 'check-in-list');

		const checkIn = page.getByRole('button', { name: 'Check In' }).first();
		if (await checkIn.count()) {
			await checkIn.click();
			await page.waitForTimeout(1200);
			await shot('check-in-success.png', 'check-in-success');
			const checkOut = page.getByRole('button', { name: 'Check Out' }).first();
			if (await checkOut.count()) {
				await checkOut.click();
				await page.waitForTimeout(500);
				await shot('check-out.png', 'check-out');
				await page.keyboard.press('Escape');
			}
		}

		await page.goto(`${BASE_URL}/rosters`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await shot('leader-roster.png', 'leader-roster');

		await page.goto(`${BASE_URL}/incidents`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await shot('leader-incidents.png', 'leader-incidents');

		await page.goto(`${BASE_URL}/ministries`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		await shot('ministry-list.png', 'ministry-list');

		const addProgram = page.getByRole('button', { name: /add new program/i });
		if (await addProgram.count()) {
			await addProgram.click();
			await page.waitForTimeout(600);
		}
		await shot('ministry-enrollment-config.png', 'ministry-enrollment-config');
		await page.keyboard.press('Escape');

		await page.goto(`${BASE_URL}/bible-bee`, { waitUntil: 'networkidle' });
		await waitVisible(
			page,
			page.getByText('Emma Smith').first(),
			'bible-bee-overview populated students'
		);
		await shot('bible-bee-overview.png', 'bible-bee-overview');

		const scripturesTab = page.getByRole('tab', { name: /scriptures/i });
		await waitVisible(page, scripturesTab, 'bible-bee scriptures tab');
		await scripturesTab.click();
		await waitVisible(
			page,
			page.getByText('John 3:16').first(),
			'bible-bee-progress scriptures list'
		);
		await shot('bible-bee-progress.png', 'bible-bee-progress');

		await logout(page);
	});

	await safe('new-family registration', async () => {
		await login(page, NEW_FAMILY_EMAIL, NEW_FAMILY_PASSWORD);
		await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
		if (await page.getByRole('heading', { name: 'Welcome Back' }).count()) {
			throw new Error(
				'registration-household-form: showed Welcome Back instead of the new-family form'
			);
		}
		await waitVisible(
			page,
			page.getByRole('heading', { name: 'Family Registration Form' }),
			'registration-household-form'
		);
		await shot(
			'registration-household-form.png',
			'registration-household-form'
		);

		const childrenHeading = page.getByText('Children Information', {
			exact: true,
		});
		await waitVisible(
			page,
			childrenHeading,
			'registration-child-profile heading'
		);
		await childrenHeading.evaluate((el) => {
			el.scrollIntoView({ block: 'start', inline: 'nearest' });
		});
		const childTrigger = page.getByRole('button', { name: /child 1/i }).first();
		if (await childTrigger.count()) {
			const state = await childTrigger.getAttribute('data-state');
			if (state !== 'open') {
				await childTrigger.click();
			}
		}
		await waitVisible(
			page,
			page.getByText('First Name').first(),
			'registration-child-profile first name'
		);
		await shot(
			'registration-child-profile.png',
			'registration-child-profile'
		);
		await logout(page);
	});

	await safe('returning-family registration', async () => {
		await login(page, GUARDIAN_EMAIL, GUARDIAN_PASSWORD);
		await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
		await waitVisible(
			page,
			page.getByRole('heading', { name: 'Welcome Back' }),
			'registration-returning-welcome'
		);
		await shot(
			'registration-returning-welcome.png',
			'registration-returning-welcome'
		);
		await logout(page);
	});

	await safe('household profile accordion', async () => {
		await login(page, HOUSEHOLD_EMAIL, HOUSEHOLD_PASSWORD);
		await page.goto(`${BASE_URL}/household`, { waitUntil: 'networkidle' });
		if (!/\/household/.test(page.url())) {
			throw new Error(
				`household-profile-accordion: redirected to ${page.url()} instead of /household`
			);
		}
		await waitVisible(
			page,
			page.getByText(/Registration Year/).first(),
			'household-profile-accordion'
		);
		const enrollmentsHeading = page
			.getByText('Program Enrollments & Interests')
			.first();
		if (await enrollmentsHeading.count()) {
			await enrollmentsHeading.scrollIntoViewIfNeeded();
		}
		await shot(
			'household-profile-accordion.png',
			'household-profile-accordion'
		);

		const sophiaCard = page.getByText('Sophia Johnson').first();
		await sophiaCard.scrollIntoViewIfNeeded();
		const editChild = page.getByRole('button', { name: 'Edit' }).first();
		await waitVisible(page, editChild, 'household-edit-child-dialog button');
		await editChild.click();
		await waitVisible(
			page,
			page.getByRole('heading', { name: 'Edit Child' }),
			'household-edit-child-dialog'
		);
		await shot(
			'household-edit-child-dialog.png',
			'household-edit-child-dialog'
		);
		const cancel = page.getByRole('button', { name: 'Cancel' });
		if (await cancel.count()) {
			await cancel.click();
		} else {
			await page.keyboard.press('Escape');
		}

		await page.goto(`${BASE_URL}/household/bible-bee`, {
			waitUntil: 'networkidle',
		});
		await waitVisible(
			page,
			page.getByRole('heading', { name: 'Bible Bee Progress' }).first(),
			'household-bible-bee-progress'
		);
		await waitVisible(
			page,
			page.getByText(/Sophia Johnson|Noah Johnson/).first(),
			'household-bible-bee-progress child'
		);
		await shot(
			'household-bible-bee-progress.png',
			'household-bible-bee-progress'
		);
		await logout(page);
	});

	await browser.close();

	const manifest = {
		capturedAt: new Date().toISOString(),
		baseUrlHost: new URL(BASE_URL).hostname,
		count: captured,
		synthetic: true,
	};
	writeFileSync(
		join(OUT_DIR, 'CAPTURE_META.json'),
		`${JSON.stringify(manifest, null, 2)}\n`
	);

	if (captured < 8) {
		throw new Error(
			`Only captured ${captured} screenshots; expected a fuller baseline. Is local seed + admin login working?`
		);
	}

	console.log(`Captured ${captured} screenshots into public/help/screenshots/`);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});

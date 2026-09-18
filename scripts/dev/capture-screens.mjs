#!/usr/bin/env node
/**
 * Capture screenshots of flag-gated screens from local seeded gatherKids, so a
 * PR can carry visual evidence and an agent can do an initial validation pass.
 *
 * Local only. Refuses production and UAT outright — unlike
 * `capture-help-screenshots.mjs`, there is no opt-in, because this script exists
 * to look at unreleased UI and has no reason to touch a real environment.
 *
 * ## Usage
 *
 * The flag override is read by the **server**, so the dev server has to be
 * booted with it; this script cannot set it per request. Two steps:
 *
 *   GATHERSYSTEM_LOCAL_FLAGS=gathersystem_door \
 *   NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true npm run dev
 *
 *   node scripts/dev/capture-screens.mjs \
 *     --routes /check-in --role admin --widths 375,1280 \
 *     --expect-text "Not checked in" --label door
 *
 * ## Why --expect-text matters
 *
 * The failure that costs you a review cycle is a capture of the LEGACY screen
 * filed as evidence for the flag-gated one — which is exactly what happens when
 * the dev server was started without `GATHERSYSTEM_LOCAL_FLAGS`. Passing
 * `--expect-text` makes the script assert a marker unique to the new UI and fail
 * loudly instead of saving a misleading PNG.
 *
 * Output goes to a scratch directory and is gitignored. Captured PNGs are never
 * committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
loadEnv({ path: join(root, '.env.e2e.local') });
loadEnv({ path: join(root, '.env.local') });

const PROD_HOSTS = new Set(['gatherkidslive.com', 'www.gatherkidslive.com']);

const DEFAULT_OUT = join(root, '.screenshots');

/** The widths #389 requires, plus desktop. */
const DEFAULT_WIDTHS = [375, 1280];

const ROLES = {
	admin: {
		email: 'admin@example.com',
		password: 'TestPassword123!',
		role: 'ADMIN',
		fullName: 'Administrator',
	},
	guardian: {
		email: 'household-complete@example.com',
		password: 'TestPassword123!',
		role: 'GUARDIAN',
		fullName: 'Casey Household',
	},
};

function parseArgs(argv) {
	const args = {
		routes: [],
		role: 'admin',
		widths: DEFAULT_WIDTHS,
		out: DEFAULT_OUT,
		label: 'screen',
		expectText: null,
		fullPage: false,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const flag = argv[i];
		const value = argv[i + 1];
		switch (flag) {
			case '--routes':
				args.routes = value.split(',').map((r) => r.trim()).filter(Boolean);
				i += 1;
				break;
			case '--role':
				args.role = value;
				i += 1;
				break;
			case '--widths':
				args.widths = value
					.split(',')
					.map((w) => Number.parseInt(w.trim(), 10))
					.filter((w) => Number.isFinite(w) && w > 0);
				i += 1;
				break;
			case '--out':
				args.out = resolve(value);
				i += 1;
				break;
			case '--label':
				args.label = value;
				i += 1;
				break;
			case '--expect-text':
				args.expectText = value;
				i += 1;
				break;
			case '--full-page':
				args.fullPage = true;
				break;
			default:
				if (flag.startsWith('--')) {
					throw new Error(`Unknown option: ${flag}`);
				}
		}
	}
	if (args.routes.length === 0) {
		throw new Error('At least one --routes value is required, e.g. --routes /check-in');
	}
	if (!ROLES[args.role]) {
		throw new Error(
			`Unknown --role ${args.role}. Known roles: ${Object.keys(ROLES).join(', ')}`
		);
	}
	if (args.widths.length === 0) {
		throw new Error('--widths produced no usable values');
	}
	return args;
}

const BASE_URL = (process.env.BASE_URL || 'http://localhost:9002').replace(/\/$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

function isLocalHost(hostname) {
	return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Refuse anything that is not unambiguously a local target, on every signal
 * available: the app host, the deploy env, and the Supabase project.
 */
function assertLocalOnly() {
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
	if (!isLocalHost(host)) {
		throw new Error(
			`Refusing non-local BASE_URL (${BASE_URL}). This script captures unreleased UI and runs against local seeded dev only.`
		);
	}

	const deployEnv = (
		process.env.NEXT_PUBLIC_DEPLOY_ENV ||
		process.env.VERCEL_ENV ||
		''
	)
		.trim()
		.toLowerCase();
	if (deployEnv === 'production' || deployEnv === 'uat') {
		throw new Error(`Refusing capture while deploy env is ${deployEnv}`);
	}

	if (!SUPABASE_URL) {
		throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set; cannot verify the database is local');
	}
	const supabaseHost = new URL(SUPABASE_URL).hostname.toLowerCase();
	if (!isLocalHost(supabaseHost)) {
		throw new Error(`Refusing non-local Supabase URL (${supabaseHost}).`);
	}
	if (supabaseHost.includes('supabase.co')) {
		throw new Error(`Refusing hosted Supabase project: ${supabaseHost}`);
	}

	console.log(`Capture target: ${BASE_URL} (Supabase ${supabaseHost})`);
}

/**
 * Ensure a signin-able local user for the requested role.
 *
 * Sets the role in BOTH `user_metadata` and `app_metadata`. `app_metadata` is
 * the one that matters for authorization since #434 moved `resolveTrustedRole`
 * onto it; `user_metadata` is still what flag targeting reads (#184). A user
 * with only one of the two signs in but then fails API authorization, which
 * looks like a broken screen rather than a broken fixture.
 */
async function ensureUser(spec) {
	if (!SERVICE_KEY) {
		throw new Error(
			'SUPABASE_SERVICE_ROLE_KEY is not set. Run `supabase status` and add it to .env.e2e.local.'
		);
	}
	const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
		auth: { persistSession: false },
	});

	const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
	if (listError) throw listError;

	const payload = {
		password: spec.password,
		email_confirm: true,
		user_metadata: { role: spec.role, full_name: spec.fullName },
		app_metadata: { role: spec.role },
	};

	const existing = listed.users.find((user) => user.email === spec.email);
	let userId;
	if (existing) {
		const { error } = await supabase.auth.admin.updateUserById(existing.id, payload);
		if (error) throw error;
		userId = existing.id;
	} else {
		const { data, error } = await supabase.auth.admin.createUser({
			email: spec.email,
			...payload,
		});
		if (error) throw error;
		userId = data.user.id;
	}

	await supabase.from('users').upsert({
		user_id: userId,
		name: spec.fullName,
		email: spec.email,
		role: spec.role,
		is_active: true,
		updated_at: new Date().toISOString(),
	});

	console.log(`Ensured local ${spec.role} user ${spec.email}`);
	return userId;
}

async function login(page, spec) {
	await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
	const email = page.locator('#email');
	try {
		await email.waitFor({ state: 'visible', timeout: 15000 });
	} catch {
		throw new Error(
			'No password field on /login. Start the dev server with NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true.'
		);
	}
	await email.fill(spec.email);
	await page.locator('#password').fill(spec.password);
	await page.getByRole('button', { name: /^sign in$/i }).click();
	try {
		await page.waitForURL(
			/\/(admin-overview|check-in|household|register|rosters|dashboard)/,
			{ timeout: 30000, waitUntil: 'domcontentloaded' }
		);
	} catch {
		const body = await page.locator('body').innerText();
		throw new Error(
			`Login did not leave /login for ${spec.email}. Page text: ${body.slice(0, 400)}`
		);
	}
	console.log(`Signed in as ${spec.email}`);
}

/** Hide dev-only chrome that would otherwise appear in every capture. */
async function hideDevChrome(page) {
	await page.addStyleTag({
		content: `
			[data-debug-footer], [data-testid="debug-footer"] { display: none !important; }
			.fixed.bottom-0.right-0 { display: none !important; }
		`,
	});
	await page.evaluate(() => {
		for (const button of document.querySelectorAll('button')) {
			if ((button.textContent || '').includes('Auth Debug')) {
				button.style.display = 'none';
			}
		}
	});
}

function slug(value) {
	return value.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	assertLocalOnly();

	const spec = ROLES[args.role];
	await ensureUser(spec);

	mkdirSync(args.out, { recursive: true });

	const browser = await chromium.launch();
	const saved = [];
	const problems = [];

	try {
		for (const width of args.widths) {
			const context = await browser.newContext({
				viewport: { width, height: width < 768 ? 812 : 900 },
				deviceScaleFactor: 2,
			});
			const page = await context.newPage();
			try {
				await login(page, spec);

				for (const route of args.routes) {
					await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
					await page.waitForTimeout(1200);
					await hideDevChrome(page);

					// Check rendered text AND markup, so a stable marker can be a
					// placeholder or aria-label rather than conditional body copy.
					const text = await page.locator('body').innerText();
					const html = await page.content();
					const found = args.expectText
						? text.includes(args.expectText) || html.includes(args.expectText)
						: true;

					if (!found) {
						problems.push(
							`${route} @ ${width}px: expected text ${JSON.stringify(
								args.expectText
							)} was not on the page. The dev server was probably started without the right GATHERSYSTEM_LOCAL_FLAGS, so this is the LEGACY screen. Not saved.`
						);
						continue;
					}

					const file = `${args.label}-${slug(route)}-${width}w.png`;
					await page.screenshot({
						path: join(args.out, file),
						fullPage: args.fullPage,
					});
					saved.push(file);
					console.log(`  saved ${file}`);
				}
			} finally {
				await context.close();
			}
		}
	} finally {
		await browser.close();
	}

	const manifest = {
		capturedAt: new Date().toISOString(),
		baseUrl: BASE_URL,
		role: args.role,
		routes: args.routes,
		widths: args.widths,
		expectText: args.expectText,
		localFlags: process.env.GATHERSYSTEM_LOCAL_FLAGS || null,
		saved,
		problems,
	};
	writeFileSync(
		join(args.out, `${args.label}-manifest.json`),
		`${JSON.stringify(manifest, null, 2)}\n`
	);

	console.log(`\n${saved.length} screenshot(s) in ${args.out}`);
	if (problems.length > 0) {
		console.error('\nFailures:');
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(`\nCapture failed: ${error.message}`);
	process.exitCode = 1;
});

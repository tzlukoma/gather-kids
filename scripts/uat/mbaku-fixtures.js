#!/usr/bin/env node
/**
 * M'Baku UAT Fixtures Script for gatherKids
 *
 * Lightweight seed script for creating repeatable UAT test scenarios on Pattern A Previews.
 * This script creates three specific fixture types for M'Baku (admin bot) testing:
 *
 * 1. Bot-guardian household with child(ren) enrolled in Bible Bee
 * 2. Dual-cycle + essays fixture (for product investigation)
 * 3. Resettable dedicated test household
 *
 * PRODUCTION SAFETY:
 * - Hard-gated off production
 * - Requires a Supabase URL containing uat, staging, or localhost, OR an allowlisted UAT project ref
 * - The --uat flag is NOT sufficient on its own and cannot authorize a non-UAT remote URL
 * - Will refuse to run against production project refs/URLs (production blocklist takes precedence)
 *
 * Usage:
 *   # Using UAT environment variables (URL must contain uat/staging/localhost)
 *   DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
 *
 *   # Reset mode (delete and re-seed)
 *   RESET=true DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
 *
 *   # Dry run mode (validate without executing)
 *   DRY_RUN=true DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configuration
const RESET_MODE = process.env.RESET === 'true';
const DRY_RUN = process.env.DRY_RUN === 'true';
const UAT_FLAG = process.argv.includes('--uat');
const FIXTURE_PREFIX = 'mbaku_';

// Fixed namespace UUID for deterministic UUIDv5 generation (DNS namespace)
const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate deterministic UUIDv5 from a name string
 * This ensures idempotent re-runs produce the same UUIDs
 */
function generateDeterministicUUID(name) {
	// UUIDv5 = SHA-1 hash of namespace + name
	const hash = crypto
		.createHash('sha1')
		.update(NAMESPACE_UUID + name)
		.digest('hex');

	// Format as UUID v5: xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx
	return [
		hash.substring(0, 8),
		hash.substring(8, 12),
		'5' + hash.substring(13, 16), // version 5
		((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) +
			hash.substring(18, 20), // variant bits
		hash.substring(20, 32),
	].join('-');
}

/**
 * Generate all fixture UUIDs upfront for consistent use throughout the script
 */
const FIXTURE_IDS = {
	// Fixture 1: Bot household
	bot: {
		household: generateDeterministicUUID('mbaku_bot_household'),
		guardian: generateDeterministicUUID('mbaku_bot_guardian'),
		emergency_contact: generateDeterministicUUID('mbaku_bot_emergency'),
		auth_user: `${FIXTURE_PREFIX}bot_auth_user`, // text - Supabase auth user ID
		user_household: generateDeterministicUUID('mbaku_bot_user_household'),
		children: {
			child_1: {
				child_id: generateDeterministicUUID('mbaku_bot_child_1'),
				enrollment_id: `${FIXTURE_PREFIX}bot_child_1_bible_bee`, // text
				bee_enrollment_id: generateDeterministicUUID('mbaku_bee_bot_child_1'),
			},
			child_2: {
				child_id: generateDeterministicUUID('mbaku_bot_child_2'),
				enrollment_id: `${FIXTURE_PREFIX}bot_child_2_bible_bee`, // text
				bee_enrollment_id: generateDeterministicUUID('mbaku_bee_bot_child_2'),
			},
		},
	},
	// Fixture 2: Dual-cycle household
	dual: {
		household: generateDeterministicUUID('mbaku_dual_household'),
		guardian: generateDeterministicUUID('mbaku_dual_guardian'),
		auth_user: `${FIXTURE_PREFIX}dual_auth_user`, // text - Supabase auth user ID
		user_household: generateDeterministicUUID('mbaku_dual_user_household'),
		child: {
			child_id: generateDeterministicUUID('mbaku_dual_child_senior'),
			enrollment_id: `${FIXTURE_PREFIX}dual_child_senior_bible_bee`, // text
			bee_enrollment_id_1: generateDeterministicUUID(
				'mbaku_bee_dual_child_senior_cycle1'
			),
			bee_enrollment_id_2: generateDeterministicUUID(
				'mbaku_bee_dual_child_senior_cycle2'
			),
			essay_prompt_id_1: generateDeterministicUUID('mbaku_essay_prompt_1'),
			essay_prompt_id_2: generateDeterministicUUID('mbaku_essay_prompt_2'),
			student_essay_id_1: generateDeterministicUUID('mbaku_student_essay_1'),
			student_essay_id_2: generateDeterministicUUID('mbaku_student_essay_2'),
		},
	},
	// Fixture 3: Reset household
	reset: {
		household: generateDeterministicUUID('mbaku_reset_household'),
		guardian: generateDeterministicUUID('mbaku_reset_guardian'),
		auth_user: `${FIXTURE_PREFIX}reset_auth_user`, // text - Supabase auth user ID
		user_household: generateDeterministicUUID('mbaku_reset_user_household'),
		child: {
			child_id: generateDeterministicUUID('mbaku_reset_child'),
			enrollment_id: `${FIXTURE_PREFIX}reset_child_bible_bee`, // text
			bee_enrollment_id: generateDeterministicUUID('mbaku_bee_reset_child'),
		},
	},
};

// Known UAT project references (explicitly allowed, bypasses URL hostname check)
const UAT_PROJECT_ALLOWLIST = [
	'gekouvbeujfkiaorshim', // UAT Preview project ref
	// Add more UAT project refs here as needed
];

// Known production project references (hard-blocked, refuse to run)
const PRODUCTION_BLOCKLIST = [
	'loekqsjtvvuuigxwavyq', // Production project ref (NEVER run against this)
	'qjjvfxwcyipdifzqpnsy.supabase.co', // Production Supabase project
	'gather-kids-production',
	'prod.supabase',
];

// Global supabase client (initialized after validation)
let supabase = null;

// Supabase configuration (validated before use)
let supabaseUrl = null;
let serviceRoleKey = null;

// Global counters
const counters = {
	households: 0,
	guardians: 0,
	children: 0,
	emergency_contacts: 0,
	ministry_enrollments: 0,
	bible_bee_enrollments: 0,
	student_essays: 0,
	user_households: 0,
};

/**
 * Production safety gate
 */
function validateEnvironment() {
	console.log('🔒 Validating environment for production safety...');

	// Get environment variables
	supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
	serviceRoleKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		console.error('❌ Missing required environment variables:');
		console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_UAT_URL');
		console.error('   - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_UAT_SERVICE_ROLE_KEY');
		console.error('');
		console.error('To run this script, either:');
		console.error('   1. Use: DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js');
		console.error('   2. Export UAT environment variables manually');
		process.exit(1);
	}

	// Check for production blocklist (hard block - takes precedence over allowlist)
	const isProduction = PRODUCTION_BLOCKLIST.some((pattern) =>
		supabaseUrl.includes(pattern)
	);

	if (isProduction) {
		console.error('❌ PRODUCTION ENVIRONMENT DETECTED');
		console.error(`   Supabase URL: ${supabaseUrl}`);
		console.error('');
		console.error('This script is UAT-only and will NOT run against production.');
		console.error('Please check your environment variables.');
		process.exit(1);
	}

	// Check if URL is in the UAT project allowlist
	const isAllowlistedUatProject = UAT_PROJECT_ALLOWLIST.some((ref) =>
		supabaseUrl.includes(ref)
	);

	// Require explicit UAT confirmation via allowlist OR URL pattern
	const hasUatIndicator =
		isAllowlistedUatProject ||
		supabaseUrl.includes('uat') ||
		supabaseUrl.includes('staging') ||
		supabaseUrl.includes('127.0.0.1') ||
		supabaseUrl.includes('localhost');

	if (!hasUatIndicator && !UAT_FLAG) {
		console.error('❌ UAT environment not confirmed');
		console.error(`   Supabase URL: ${supabaseUrl}`);
		console.error('');
		console.error('This script requires a UAT/staging/localhost Supabase URL or allowlisted project ref.');
		console.error('The --uat flag alone is not sufficient for remote URLs.');
		console.error('Use a Supabase URL containing "uat", "staging", "localhost", or an allowlisted project ref.');
		process.exit(1);
	}

	if (!hasUatIndicator && UAT_FLAG) {
		console.error('❌ Invalid use of --uat flag');
		console.error(`   Supabase URL: ${supabaseUrl}`);
		console.error('');
		console.error('The --uat flag cannot authorize a remote URL without uat/staging/localhost or allowlisted project ref.');
		console.error('This is a production safety gate.');
		console.error('Use a proper UAT Supabase URL instead.');
		process.exit(1);
	}

	console.log('✅ Environment validated as UAT');
	console.log(`   Supabase URL: ${supabaseUrl}`);
	if (isAllowlistedUatProject) {
		console.log('   ✓ Allowlisted UAT project ref detected');
	}
	if (DRY_RUN) {
		console.log('   Mode: DRY RUN (no changes will be made)');
	}
	if (RESET_MODE) {
		console.log('   Mode: RESET (will delete existing M\'Baku fixtures)');
	}
	console.log('');
}

/**
 * Create dry run proxy for testing
 */
function createDryRunProxy(realClient) {
	if (!DRY_RUN) return realClient;

	return new Proxy(realClient, {
		get(target, prop) {
			if (prop === 'from') {
				return (table) => {
					console.log(`[DRY RUN] Accessing table: ${table}`);
					return {
						select: () => ({
							eq: () => ({
								single: () =>
									Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
								limit: () => Promise.resolve({ data: [], error: null }),
							}),
							in: () => ({
								limit: () => Promise.resolve({ data: [], error: null }),
							}),
							like: () =>
								Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
							limit: () => Promise.resolve({ data: [], error: null }),
							single: () =>
								Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
						}),
						insert: (data) => {
							console.log(
								`[DRY RUN] INSERT INTO ${table}:`,
								JSON.stringify(data, null, 2)
							);
							return {
								select: () => ({
									single: () =>
										Promise.resolve({
											data: { id: 'mock-id', ...data },
											error: null,
										}),
								}),
							};
						},
						update: (data) => {
							console.log(
								`[DRY RUN] UPDATE ${table}:`,
								JSON.stringify(data, null, 2)
							);
							return {
								eq: () => Promise.resolve({ data: null, error: null }),
							};
						},
						delete: () => {
							console.log(`[DRY RUN] DELETE FROM ${table}`);
							return {
								like: () => Promise.resolve({ data: null, error: null }),
								eq: () => Promise.resolve({ data: null, error: null }),
							};
						},
					};
				};
			}
			return target[prop];
		},
	});
}

/**
 * Initialize Supabase client (called after validation)
 */
function initializeClient() {
	const rawClient = createClient(supabaseUrl, serviceRoleKey);
	supabase = createDryRunProxy(rawClient);
	console.log('✅ Supabase client initialized');
	console.log('');
}

/**
 * Reset M'Baku fixtures when RESET mode is enabled
 */
async function resetMbakuFixtures() {
	if (!RESET_MODE) return;

	console.log("🗑️  Resetting M'Baku fixtures...");

	try {
		// Collect all UUIDs and text IDs to delete
		const studentEssayIds = [
			FIXTURE_IDS.dual.child.student_essay_id_1,
			FIXTURE_IDS.dual.child.student_essay_id_2,
		];

		const essayPromptIds = [
			FIXTURE_IDS.dual.child.essay_prompt_id_1,
			FIXTURE_IDS.dual.child.essay_prompt_id_2,
		];

		const bibleBeeEnrollmentIds = [
			FIXTURE_IDS.bot.children.child_1.bee_enrollment_id,
			FIXTURE_IDS.bot.children.child_2.bee_enrollment_id,
			FIXTURE_IDS.dual.child.bee_enrollment_id_1,
			FIXTURE_IDS.dual.child.bee_enrollment_id_2,
			FIXTURE_IDS.reset.child.bee_enrollment_id,
		];

		const ministryEnrollmentIds = [
			FIXTURE_IDS.bot.children.child_1.enrollment_id,
			FIXTURE_IDS.bot.children.child_2.enrollment_id,
			FIXTURE_IDS.dual.child.enrollment_id,
			FIXTURE_IDS.reset.child.enrollment_id,
		];

		const childIds = [
			FIXTURE_IDS.bot.children.child_1.child_id,
			FIXTURE_IDS.bot.children.child_2.child_id,
			FIXTURE_IDS.dual.child.child_id,
			FIXTURE_IDS.reset.child.child_id,
		];

		const guardianIds = [
			FIXTURE_IDS.bot.guardian,
			FIXTURE_IDS.dual.guardian,
			FIXTURE_IDS.reset.guardian,
		];

		const emergencyContactIds = [FIXTURE_IDS.bot.emergency_contact];

		const userHouseholdIds = [
			FIXTURE_IDS.bot.user_household,
			FIXTURE_IDS.dual.user_household,
			FIXTURE_IDS.reset.user_household,
		];

		const householdIds = [
			FIXTURE_IDS.bot.household,
			FIXTURE_IDS.dual.household,
			FIXTURE_IDS.reset.household,
		];

		// Delete in proper foreign key dependency order
		// Level 1: Child tables (UUID-based)
		if (studentEssayIds.length > 0) {
			await supabase.from('student_essays').delete().in('id', studentEssayIds);
			console.log('✅ Cleared student_essays');
		}

		if (essayPromptIds.length > 0) {
			await supabase.from('essay_prompts').delete().in('id', essayPromptIds);
			console.log('✅ Cleared essay_prompts');
		}

		if (bibleBeeEnrollmentIds.length > 0) {
			await supabase
				.from('bible_bee_enrollments')
				.delete()
				.in('id', bibleBeeEnrollmentIds);
			console.log('✅ Cleared bible_bee_enrollments');
		}

		// Text-based enrollment IDs (ministry_enrollments uses text, not UUID)
		if (ministryEnrollmentIds.length > 0) {
			await supabase
				.from('ministry_enrollments')
				.delete()
				.in('enrollment_id', ministryEnrollmentIds);
			console.log('✅ Cleared ministry_enrollments');
		}

		// Registrations (text-based, use LIKE pattern as fallback)
		await supabase
			.from('registrations')
			.delete()
			.like('registration_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared registrations');

		// Level 2: Children and contacts (UUID-based)
		if (childIds.length > 0) {
			await supabase.from('children').delete().in('child_id', childIds);
			console.log('✅ Cleared children');
		}

		if (guardianIds.length > 0) {
			await supabase.from('guardians').delete().in('guardian_id', guardianIds);
			console.log('✅ Cleared guardians');
		}

		if (emergencyContactIds.length > 0) {
			await supabase
				.from('emergency_contacts')
				.delete()
				.in('contact_id', emergencyContactIds);
			console.log('✅ Cleared emergency_contacts');
		}

		// Level 3: User households junction (UUID-based for user_household_id)
		if (userHouseholdIds.length > 0) {
			await supabase
				.from('user_households')
				.delete()
				.in('user_household_id', userHouseholdIds);
			console.log('✅ Cleared user_households');
		}

		// Level 4: Households (UUID-based)
		if (householdIds.length > 0) {
			await supabase
				.from('households')
				.delete()
				.in('household_id', householdIds);
			console.log('✅ Cleared households');
		}

		console.log("✅ Reset complete - all M'Baku fixtures removed");
	} catch (error) {
		console.error('❌ Error during reset:', error.message);
		throw error;
	}
}

/**
 * Get active registration cycle
 */
async function getActiveCycle() {
	console.log('📅 Finding active registration cycle...');

	const { data, error } = await supabase
		.from('registration_cycles')
		.select('cycle_id, name')
		.eq('is_active', true)
		.single();

	if (error || !data) {
		console.error('❌ No active registration cycle found');
		console.error('   Please ensure a registration cycle exists and is active.');
		process.exit(1);
	}

	console.log(`✅ Found active cycle: ${data.name} (${data.cycle_id})`);
	return data.cycle_id;
}

/**
 * Get Bible Bee ministry ID
 */
async function getBibleBeeMinistry() {
	console.log('📖 Finding Bible Bee ministry...');

	// Try multiple strategies to find Bible Bee
	const strategies = [
		{ field: 'ministry_id', value: 'uat_bible_bee' },
		{ field: 'name', value: 'Bible Bee' },
		{ field: 'code', value: 'bible-bee' },
	];

	for (const { field, value } of strategies) {
		const { data, error } = await supabase
			.from('ministries')
			.select('ministry_id, name')
			.eq(field, value)
			.limit(1);

		if (!error && data && data.length > 0) {
			console.log(
				`✅ Found Bible Bee ministry: ${data[0].name} (${data[0].ministry_id})`
			);
			return data[0].ministry_id;
		}
	}

	console.error('❌ Bible Bee ministry not found');
	console.error('   Please ensure Bible Bee ministry exists (run uat_seed.js first)');
	process.exit(1);
}

/**
 * Get active Bible Bee cycle
 */
async function getActiveBibleBeeCycle() {
	console.log('📖 Finding active Bible Bee cycle...');

	const { data, error } = await supabase
		.from('bible_bee_cycles')
		.select('id, name')
		.eq('is_active', true)
		.limit(1);

	if (error || !data || data.length === 0) {
		console.error('❌ No active Bible Bee cycle found');
		console.error('   Please ensure Bible Bee cycle exists (run seed:uat:bible-bee)');
		process.exit(1);
	}

	console.log(`✅ Found Bible Bee cycle: ${data[0].name} (${data[0].id})`);
	return data[0].id;
}

/**
 * Get multiple active Bible Bee cycles for dual-cycle testing
 * Returns active cycles + newest prior cycles to reach the limit
 */
async function getActiveBibleBeeCycles(limit = 2) {
	console.log(`📖 Finding up to ${limit} Bible Bee cycles (active + newest prior)...`);

	// Get active cycles
	const { data: activeCycles, error: activeError } = await supabase
		.from('bible_bee_cycles')
		.select('id, name, created_at')
		.eq('is_active', true)
		.order('name', { ascending: false });

	if (activeError) {
		console.error('❌ Error fetching active Bible Bee cycles:', activeError.message);
		process.exit(1);
	}

	const cycles = activeCycles || [];
	console.log(`✅ Found ${cycles.length} active Bible Bee cycle(s)`);

	// If we need more cycles to reach the limit, get newest prior (inactive) cycles
	if (cycles.length < limit) {
		const needed = limit - cycles.length;
		console.log(`📖 Fetching ${needed} newest prior (inactive) cycle(s)...`);

		const { data: priorCycles, error: priorError } = await supabase
			.from('bible_bee_cycles')
			.select('id, name, created_at')
			.eq('is_active', false)
			.order('created_at', { ascending: false })
			.limit(needed);

		if (!priorError && priorCycles && priorCycles.length > 0) {
			cycles.push(...priorCycles);
			console.log(`✅ Found ${priorCycles.length} prior cycle(s)`);
		}
	}

	// Warn if we have fewer than 2 cycles total
	if (cycles.length < 2) {
		console.warn(`⚠️  WARNING: Only ${cycles.length} Bible Bee cycle(s) found (expected at least 2)`);
		console.warn('   Fixture 2 (dual-cycle) may not function as expected.');
		console.warn('   Consider running seed:uat:bible-bee to create more cycles.');
	}

	if (cycles.length === 0) {
		console.error('❌ No Bible Bee cycles found');
		console.error('   Please ensure Bible Bee cycles exist (run seed:uat:bible-bee)');
		process.exit(1);
	}

	// Limit to requested amount
	const result = cycles.slice(0, limit);
	console.log(`✅ Returning ${result.length} Bible Bee cycle(s):`);
	result.forEach(cycle => console.log(`   - ${cycle.name} (${cycle.id})`));
	return result;
}

/**
 * Get division by name (e.g., "Senior" or "Junior")
 */
async function getDivisionByName(divisionName) {
	console.log(`📖 Finding division: ${divisionName}...`);

	const { data, error } = await supabase
		.from('divisions')
		.select('id, name')
		.eq('name', divisionName)
		.limit(1);

	if (error || !data || data.length === 0) {
		console.error(`❌ Division "${divisionName}" not found`);
		console.error('   Please ensure divisions exist (run seed:uat:bible-bee)');
		process.exit(1);
	}

	console.log(`✅ Found division: ${data[0].name} (${data[0].id})`);
	return data[0].id;
}

/**
 * Create user_household for guardian login path
 */
async function createUserHousehold(
	householdId,
	authUserId,
	userHouseholdId
) {
	console.log(`🔗 Creating user_household for ${authUserId}...`);

	const userHouseholdData = {
		user_household_id: userHouseholdId,
		auth_user_id: authUserId,
		household_id: householdId,
	};

	const { data: existing, error: checkError } = await supabase
		.from('user_households')
		.select('user_household_id')
		.eq('auth_user_id', authUserId)
		.single();

	if (checkError && checkError.code !== 'PGRST116') {
		console.error(
			`❌ Error checking user_household: ${checkError.message}`
		);
		// Non-fatal - continue
		return;
	}

	if (existing) {
		console.log(`✅ User household already exists for ${authUserId}`);
	} else {
		const { error: insertError } = await supabase
			.from('user_households')
			.insert(userHouseholdData);

		if (insertError) {
			console.error(
				`❌ Failed to create user_household: ${insertError.message}`
			);
			// Non-fatal - continue
		} else {
			console.log(`✅ Created user_household for ${authUserId}`);
			counters.user_households++;
		}
	}
}

/**
 * Create Fixture 1: Bot-guardian household with Bible Bee children
 */
async function createBotGuardianFixture(
	cycleId,
	ministryId,
	bibleBeeCycleId,
	divisionIds
) {
	console.log('🤖 Creating Fixture 1: Bot-guardian household...');

	// Create household (UUID)
	const householdId = FIXTURE_IDS.bot.household;
	const householdData = {
		household_id: householdId,
		name: "M'Baku Bot Family",
		address_line1: '1 Wakanda Way',
		city: 'Golden City',
		state: 'DC',
		zip: '20001',
		primary_phone: '555-000-0001',
		email: 'mbaku+bot@gatherkids.test',
		created_at: new Date().toISOString(),
	};

	const { data: existingHousehold } = await supabase
		.from('households')
		.select('household_id')
		.eq('household_id', householdId)
		.single();

	if (existingHousehold) {
		console.log('✅ Bot household already exists');
	} else {
		const { error } = await supabase
			.from('households')
			.insert(householdData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create bot household:', error.message);
			throw error;
		}

		console.log('✅ Created bot household');
		counters.households++;
	}

	// Create user_household for guardian login
	await createUserHousehold(
		householdId,
		FIXTURE_IDS.bot.auth_user,
		FIXTURE_IDS.bot.user_household
	);

	// Create bot guardian (UUID)
	const guardianId = FIXTURE_IDS.bot.guardian;
	const guardianData = {
		guardian_id: guardianId,
		household_id: householdId,
		first_name: "M'Baku",
		last_name: 'Bot',
		email: 'mbaku+bot@gatherkids.test',
		mobile_phone: '555-000-0001',
		relationship: 'Parent',
		is_primary: true,
		created_at: new Date().toISOString(),
	};

	const { data: existingGuardian } = await supabase
		.from('guardians')
		.select('guardian_id')
		.eq('guardian_id', guardianId)
		.single();

	if (existingGuardian) {
		console.log('✅ Bot guardian already exists');
	} else {
		const { error } = await supabase
			.from('guardians')
			.insert(guardianData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create bot guardian:', error.message);
			throw error;
		}

		console.log('✅ Created bot guardian');
		counters.guardians++;
	}

	// Create emergency contact (UUID)
	const contactId = FIXTURE_IDS.bot.emergency_contact;
	const contactData = {
		contact_id: contactId,
		household_id: householdId,
		first_name: 'Okoye',
		last_name: 'Emergency',
		mobile_phone: '555-000-0002',
		relationship: 'Friend',
		created_at: new Date().toISOString(),
	};

	const { data: existingContact } = await supabase
		.from('emergency_contacts')
		.select('contact_id')
		.eq('contact_id', contactId)
		.single();

	if (existingContact) {
		console.log('✅ Bot emergency contact already exists');
	} else {
		const { error } = await supabase
			.from('emergency_contacts')
			.insert(contactData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create emergency contact:', error.message);
			throw error;
		}

		console.log('✅ Created bot emergency contact');
		counters.emergency_contacts++;
	}

	// Create two children for bot household (UUIDs)
	const children = [
		{
			child_id: FIXTURE_IDS.bot.children.child_1.child_id,
			enrollment_id: FIXTURE_IDS.bot.children.child_1.enrollment_id,
			bee_enrollment_id: FIXTURE_IDS.bot.children.child_1.bee_enrollment_id,
			first_name: 'Shuri',
			last_name: 'Bot',
			dob: '2015-03-15',
			grade: '4',
			gender: 'F',
		},
		{
			child_id: FIXTURE_IDS.bot.children.child_2.child_id,
			enrollment_id: FIXTURE_IDS.bot.children.child_2.enrollment_id,
			bee_enrollment_id: FIXTURE_IDS.bot.children.child_2.bee_enrollment_id,
			first_name: "T'Challa",
			last_name: 'Bot',
			dob: '2012-08-20',
			grade: '7',
			gender: 'M',
		},
	];

	for (const childData of children) {
		// Extract only valid children table columns (no enrollment IDs)
		const fullChildData = {
			child_id: childData.child_id,
			household_id: householdId,
			first_name: childData.first_name,
			last_name: childData.last_name,
			dob: childData.dob,
			grade: childData.grade,
			gender: childData.gender,
			allergies: null,
			medical_notes: 'Bot-generated test data',
			special_needs: false,
			special_needs_notes: null,
			is_active: true,
			created_at: new Date().toISOString(),
		};

		const { data: existingChild } = await supabase
			.from('children')
			.select('child_id')
			.eq('child_id', childData.child_id)
			.single();

		if (existingChild) {
			console.log(`✅ Child ${childData.first_name} already exists`);
		} else {
			const { error } = await supabase
				.from('children')
				.insert(fullChildData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create child ${childData.first_name}:`,
					error.message
				);
				throw error;
			}

			console.log(`✅ Created child: ${childData.first_name}`);
			counters.children++;
		}

		// Enroll in Bible Bee ministry (text ID for ministry_enrollments)
		const enrollmentId = childData.enrollment_id;
		const enrollmentData = {
			enrollment_id: enrollmentId,
			child_id: childData.child_id,
			ministry_id: ministryId,
			cycle_id: cycleId,
			status: 'enrolled',
			created_at: new Date().toISOString(),
		};

		const { data: existingEnrollment } = await supabase
			.from('ministry_enrollments')
			.select('enrollment_id')
			.eq('enrollment_id', enrollmentId)
			.single();

		if (existingEnrollment) {
			console.log(
				`✅ Bible Bee enrollment for ${childData.first_name} already exists`
			);
		} else {
			const { error } = await supabase
				.from('ministry_enrollments')
				.insert(enrollmentData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create Bible Bee enrollment for ${childData.first_name}:`,
					error.message
				);
				throw error;
			}

			console.log(`✅ Enrolled ${childData.first_name} in Bible Bee`);
			counters.ministry_enrollments++;
		}

		// Create Bible Bee enrollment record (UUID)
		const beeEnrollmentId = childData.bee_enrollment_id;
		const divisionId =
			childData.grade <= '5' ? divisionIds.junior : divisionIds.senior;
		const beeEnrollmentData = {
			id: beeEnrollmentId,
			child_id: childData.child_id,
			bible_bee_cycle_id: bibleBeeCycleId,
			division_id: divisionId,
			enrolled_at: new Date().toISOString(),
		};

		const { data: existingBeeEnrollment } = await supabase
			.from('bible_bee_enrollments')
			.select('id')
			.eq('id', beeEnrollmentId)
			.single();

		if (existingBeeEnrollment) {
			console.log(
				`✅ Bible Bee enrollment record for ${childData.first_name} already exists`
			);
		} else {
			const { error } = await supabase
				.from('bible_bee_enrollments')
				.insert(beeEnrollmentData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create Bible Bee enrollment record for ${childData.first_name}:`,
					error.message
				);
				// Non-fatal - continue
			} else {
				console.log(
					`✅ Created Bible Bee enrollment record for ${childData.first_name}`
				);
				counters.bible_bee_enrollments++;
			}
		}
	}

	console.log('✅ Fixture 1 complete: Bot-guardian household with Bible Bee children');
}

/**
 * Create Fixture 2: Dual-cycle + essays fixture
 */
async function createDualCycleFixture(
	cycleId,
	ministryId,
	bibleBeeCycles,
	divisionIds
) {
	console.log('📝 Creating Fixture 2: Dual-cycle + essays fixture...');

	// Create household (UUID)
	const householdId = FIXTURE_IDS.dual.household;
	const householdData = {
		household_id: householdId,
		name: 'Dual-Cycle Test Family',
		address_line1: '2 Essay Lane',
		city: 'Test City',
		state: 'NJ',
		zip: '12345',
		primary_phone: '555-000-0003',
		email: 'mbaku+dual@gatherkids.test',
		created_at: new Date().toISOString(),
	};

	const { data: existingHousehold } = await supabase
		.from('households')
		.select('household_id')
		.eq('household_id', householdId)
		.single();

	if (existingHousehold) {
		console.log('✅ Dual-cycle household already exists');
	} else {
		const { error } = await supabase
			.from('households')
			.insert(householdData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create dual-cycle household:', error.message);
			throw error;
		}

		console.log('✅ Created dual-cycle household');
		counters.households++;
	}

	// Create user_household for guardian login
	await createUserHousehold(
		householdId,
		FIXTURE_IDS.dual.auth_user,
		FIXTURE_IDS.dual.user_household
	);

	// Create guardian (UUID)
	const guardianId = FIXTURE_IDS.dual.guardian;
	const guardianData = {
		guardian_id: guardianId,
		household_id: householdId,
		first_name: 'Nakia',
		last_name: 'Test',
		email: 'mbaku+dual@gatherkids.test',
		mobile_phone: '555-000-0003',
		relationship: 'Parent',
		is_primary: true,
		created_at: new Date().toISOString(),
	};

	const { data: existingGuardian } = await supabase
		.from('guardians')
		.select('guardian_id')
		.eq('guardian_id', guardianId)
		.single();

	if (existingGuardian) {
		console.log('✅ Dual-cycle guardian already exists');
	} else {
		const { error } = await supabase
			.from('guardians')
			.insert(guardianData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create dual-cycle guardian:', error.message);
			throw error;
		}

		console.log('✅ Created dual-cycle guardian');
		counters.guardians++;
	}

	// Create senior-division child (requires essay) (UUID)
	const childId = FIXTURE_IDS.dual.child.child_id;
	const childData = {
		child_id: childId,
		household_id: householdId,
		first_name: 'Ramonda',
		last_name: 'Test',
		dob: '2009-01-15',
		grade: '10',
		gender: 'F',
		allergies: null,
		medical_notes: 'Dual-cycle test student with essays',
		special_needs: false,
		special_needs_notes: null,
		is_active: true,
		created_at: new Date().toISOString(),
	};

	const { data: existingChild } = await supabase
		.from('children')
		.select('child_id')
		.eq('child_id', childId)
		.single();

	if (existingChild) {
		console.log('✅ Dual-cycle senior child already exists');
	} else {
		const { error } = await supabase
			.from('children')
			.insert(childData)
			.select()
			.single();

		if (error) {
			console.error(
				'❌ Failed to create dual-cycle senior child:',
				error.message
			);
			throw error;
		}

		console.log('✅ Created dual-cycle senior child');
		counters.children++;
	}

	// Enroll in Bible Bee (text ID for ministry_enrollments)
	const enrollmentId = FIXTURE_IDS.dual.child.enrollment_id;
	const enrollmentData = {
		enrollment_id: enrollmentId,
		child_id: childId,
		ministry_id: ministryId,
		cycle_id: cycleId,
		status: 'enrolled',
		created_at: new Date().toISOString(),
	};

	const { data: existingEnrollment } = await supabase
		.from('ministry_enrollments')
		.select('enrollment_id')
		.eq('enrollment_id', enrollmentId)
		.single();

	if (existingEnrollment) {
		console.log('✅ Bible Bee enrollment for senior child already exists');
	} else {
		const { error } = await supabase
			.from('ministry_enrollments')
			.insert(enrollmentData)
			.select()
			.single();

		if (error) {
			console.error(
				'❌ Failed to create Bible Bee enrollment for senior child:',
				error.message
			);
			throw error;
		}

		console.log('✅ Enrolled senior child in Bible Bee');
		counters.ministry_enrollments++;
	}

	// Enroll in MULTIPLE Bible Bee cycles (dual-cycle fixture) (UUIDs)
	const seniorDivisionId = divisionIds.senior;

	for (let i = 0; i < bibleBeeCycles.length; i++) {
		const cycle = bibleBeeCycles[i];
		// Use pre-generated UUIDs for the first 2 cycles
		const beeEnrollmentId =
			i === 0
				? FIXTURE_IDS.dual.child.bee_enrollment_id_1
				: i === 1
					? FIXTURE_IDS.dual.child.bee_enrollment_id_2
					: generateDeterministicUUID(
							`mbaku_bee_dual_child_senior_cycle${i + 1}`
						);
		const beeEnrollmentData = {
			id: beeEnrollmentId,
			child_id: childId,
			bible_bee_cycle_id: cycle.id,
			division_id: seniorDivisionId,
			enrolled_at: new Date().toISOString(),
		};

		const { data: existingBeeEnrollment } = await supabase
			.from('bible_bee_enrollments')
			.select('id')
			.eq('id', beeEnrollmentId)
			.single();

		if (existingBeeEnrollment) {
			console.log(`✅ Bible Bee enrollment for cycle ${i + 1} already exists`);
		} else {
			const { error } = await supabase
				.from('bible_bee_enrollments')
				.insert(beeEnrollmentData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create Bible Bee enrollment for cycle ${i + 1}:`,
					error.message
				);
				// Non-fatal - continue
			} else {
				console.log(`✅ Created Bible Bee enrollment for cycle ${i + 1}: ${cycle.name}`);
				counters.bible_bee_enrollments++;
			}
		}

		// Create essay prompt for this cycle (UUID)
		const essayPromptId =
			i === 0
				? FIXTURE_IDS.dual.child.essay_prompt_id_1
				: i === 1
					? FIXTURE_IDS.dual.child.essay_prompt_id_2
					: generateDeterministicUUID(`mbaku_essay_prompt_${i + 1}`);
		const essayPromptData = {
			id: essayPromptId,
			bible_bee_cycle_id: cycle.id,
			division_id: seniorDivisionId,
			title: `Senior Essay ${i + 1} - ${cycle.name}`,
			prompt: `This is the essay prompt for ${cycle.name}. Students should reflect on their Bible Bee journey and demonstrate their understanding of scripture.`,
			instructions:
				'Write a thoughtful essay of 500-750 words. Use specific scripture references.',
			due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
		};

		const { data: existingPrompt } = await supabase
			.from('essay_prompts')
			.select('id')
			.eq('id', essayPromptId)
			.single();

		if (existingPrompt) {
			console.log(`✅ Essay prompt for cycle ${i + 1} already exists`);
		} else {
			const { error } = await supabase
				.from('essay_prompts')
				.insert(essayPromptData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create essay prompt for cycle ${i + 1}:`,
					error.message
				);
				// Non-fatal - continue
			} else {
				console.log(`✅ Created essay prompt for cycle ${i + 1}`);
			}
		}

		// Create student essay for this child + prompt (UUID)
		const studentEssayId =
			i === 0
				? FIXTURE_IDS.dual.child.student_essay_id_1
				: i === 1
					? FIXTURE_IDS.dual.child.student_essay_id_2
					: generateDeterministicUUID(`mbaku_student_essay_${i + 1}`);
		const studentEssayData = {
			id: studentEssayId,
			child_id: childId,
			bible_bee_cycle_id: cycle.id,
			essay_prompt_id: essayPromptId,
			status: 'assigned',
		};

		const { data: existingEssay } = await supabase
			.from('student_essays')
			.select('id')
			.eq('id', studentEssayId)
			.single();

		if (existingEssay) {
			console.log(`✅ Student essay for cycle ${i + 1} already exists`);
		} else {
			const { error } = await supabase
				.from('student_essays')
				.insert(studentEssayData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Failed to create student essay for cycle ${i + 1}:`,
					error.message
				);
				// Non-fatal - continue
			} else {
				console.log(`✅ Created student essay for cycle ${i + 1}`);
				counters.student_essays++;
			}
		}
	}

	console.log(
		`✅ Fixture 2 complete: Dual-cycle fixture with ${bibleBeeCycles.length} cycles + essays`
	);
}

/**
 * Create Fixture 3: Resettable test household
 */
async function createResettableTestFixture(
	cycleId,
	ministryId,
	bibleBeeCycleId,
	divisionIds
) {
	console.log('🔄 Creating Fixture 3: Resettable test household...');

	// Create household (UUID)
	const householdId = FIXTURE_IDS.reset.household;
	const householdData = {
		household_id: householdId,
		name: 'Reset Test Family',
		address_line1: '3 Reset Road',
		city: 'Test Town',
		state: 'PA',
		zip: '19101',
		primary_phone: '555-000-0004',
		email: 'mbaku+reset@gatherkids.test',
		created_at: new Date().toISOString(),
	};

	const { data: existingHousehold } = await supabase
		.from('households')
		.select('household_id')
		.eq('household_id', householdId)
		.single();

	if (existingHousehold) {
		console.log('✅ Reset test household already exists');
	} else {
		const { error } = await supabase
			.from('households')
			.insert(householdData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create reset test household:', error.message);
			throw error;
		}

		console.log('✅ Created reset test household');
		counters.households++;
	}

	// Create user_household for guardian login
	await createUserHousehold(
		householdId,
		FIXTURE_IDS.reset.auth_user,
		FIXTURE_IDS.reset.user_household
	);

	// Create guardian (UUID)
	const guardianId = FIXTURE_IDS.reset.guardian;
	const guardianData = {
		guardian_id: guardianId,
		household_id: householdId,
		first_name: 'Ayo',
		last_name: 'Reset',
		email: 'mbaku+reset@gatherkids.test',
		mobile_phone: '555-000-0004',
		relationship: 'Parent',
		is_primary: true,
		created_at: new Date().toISOString(),
	};

	const { data: existingGuardian } = await supabase
		.from('guardians')
		.select('guardian_id')
		.eq('guardian_id', guardianId)
		.single();

	if (existingGuardian) {
		console.log('✅ Reset test guardian already exists');
	} else {
		const { error } = await supabase
			.from('guardians')
			.insert(guardianData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create reset test guardian:', error.message);
			throw error;
		}

		console.log('✅ Created reset test guardian');
		counters.guardians++;
	}

	// Create one child (UUID)
	const childId = FIXTURE_IDS.reset.child.child_id;
	const childData = {
		child_id: childId,
		household_id: householdId,
		first_name: 'Erik',
		last_name: 'Reset',
		dob: '2016-05-10',
		grade: '3',
		gender: 'M',
		allergies: null,
		medical_notes: 'Resettable test data',
		special_needs: false,
		special_needs_notes: null,
		is_active: true,
		created_at: new Date().toISOString(),
	};

	const { data: existingChild } = await supabase
		.from('children')
		.select('child_id')
		.eq('child_id', childId)
		.single();

	if (existingChild) {
		console.log('✅ Reset test child already exists');
	} else {
		const { error } = await supabase
			.from('children')
			.insert(childData)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create reset test child:', error.message);
			throw error;
		}

		console.log('✅ Created reset test child');
		counters.children++;
	}

	// Enroll in Bible Bee (text ID for ministry_enrollments)
	const enrollmentId = FIXTURE_IDS.reset.child.enrollment_id;
	const enrollmentData = {
		enrollment_id: enrollmentId,
		child_id: childId,
		ministry_id: ministryId,
		cycle_id: cycleId,
		status: 'enrolled',
		created_at: new Date().toISOString(),
	};

	const { data: existingEnrollment } = await supabase
		.from('ministry_enrollments')
		.select('enrollment_id')
		.eq('enrollment_id', enrollmentId)
		.single();

	if (existingEnrollment) {
		console.log('✅ Bible Bee enrollment for reset child already exists');
	} else {
		const { error } = await supabase
			.from('ministry_enrollments')
			.insert(enrollmentData)
			.select()
			.single();

		if (error) {
			console.error(
				'❌ Failed to create Bible Bee enrollment for reset child:',
				error.message
			);
			throw error;
		}

		console.log('✅ Enrolled reset child in Bible Bee');
		counters.ministry_enrollments++;
	}

	// Create Bible Bee enrollment record (like fixtures 1 and 2) (UUID)
	const beeEnrollmentId = FIXTURE_IDS.reset.child.bee_enrollment_id;
	const juniorDivisionId = divisionIds.junior; // Grade 3 = Junior
	const beeEnrollmentData = {
		id: beeEnrollmentId,
		child_id: childId,
		bible_bee_cycle_id: bibleBeeCycleId,
		division_id: juniorDivisionId,
		enrolled_at: new Date().toISOString(),
	};

	const { data: existingBeeEnrollment } = await supabase
		.from('bible_bee_enrollments')
		.select('id')
		.eq('id', beeEnrollmentId)
		.single();

	if (existingBeeEnrollment) {
		console.log('✅ Bible Bee enrollment record for reset child already exists');
	} else {
		const { error } = await supabase
			.from('bible_bee_enrollments')
			.insert(beeEnrollmentData)
			.select()
			.single();

		if (error) {
			console.error(
				'❌ Failed to create Bible Bee enrollment record for reset child:',
				error.message
			);
			// Non-fatal - continue
		} else {
			console.log('✅ Created Bible Bee enrollment record for reset child');
			counters.bible_bee_enrollments++;
		}
	}

	console.log('✅ Fixture 3 complete: Resettable test household');
}

/**
 * Main function
 */
async function main() {
	try {
		// Validate environment
		validateEnvironment();

		// Initialize Supabase client (after validation passes)
		initializeClient();

		console.log('🚀 M\'Baku UAT Fixtures Script Starting...');
		console.log('');

		// Reset if requested
		await resetMbakuFixtures();

		// Get required references
		const cycleId = await getActiveCycle();
		const ministryId = await getBibleBeeMinistry();
		const bibleBeeCycleId = await getActiveBibleBeeCycle();
		const bibleBeeCycles = await getActiveBibleBeeCycles(2); // Get 2 cycles for dual-cycle fixture
		const juniorDivisionId = await getDivisionByName('Junior');
		const seniorDivisionId = await getDivisionByName('Senior');
		const divisionIds = {
			junior: juniorDivisionId,
			senior: seniorDivisionId,
		};

		console.log('');

		// Create fixtures
		await createBotGuardianFixture(cycleId, ministryId, bibleBeeCycleId, divisionIds);
		console.log('');

		await createDualCycleFixture(cycleId, ministryId, bibleBeeCycles, divisionIds);
		console.log('');

		await createResettableTestFixture(cycleId, ministryId, bibleBeeCycleId, divisionIds);
		console.log('');

		// Summary
		console.log('✨ M\'Baku fixtures seeding completed successfully!');
		console.log('');
		console.log('📊 Summary:');
		console.log(`   - ${counters.households} households created`);
		console.log(`   - ${counters.guardians} guardians created`);
		console.log(`   - ${counters.children} children created`);
		console.log(`   - ${counters.emergency_contacts} emergency contacts created`);
		console.log(
			`   - ${counters.ministry_enrollments} ministry enrollments created`
		);
		console.log(
			`   - ${counters.bible_bee_enrollments} Bible Bee enrollments created`
		);
		console.log(`   - ${counters.student_essays} student essays created`);
		console.log(`   - ${counters.user_households} user households created`);
		console.log('');
		console.log('🎯 Fixtures Created:');
		console.log('   1. Bot-guardian household (M\'Baku Bot Family)');
		console.log('      - 2 children enrolled in Bible Bee');
		console.log('      - Email: mbaku+bot@gatherkids.test');
		console.log('      - Auth User ID: mbaku_bot_auth_user');
		console.log('');
		console.log('   2. Dual-cycle + essays household (Dual-Cycle Test Family)');
		console.log(`      - 1 senior division student enrolled in ${bibleBeeCycles.length} cycles`);
		console.log(`      - ${bibleBeeCycles.length} essay prompts + ${bibleBeeCycles.length} student essays created`);
		console.log('      - Email: mbaku+dual@gatherkids.test');
		console.log('      - Auth User ID: mbaku_dual_auth_user');
		console.log('');
		console.log('   3. Resettable test household (Reset Test Family)');
		console.log('      - 1 child enrolled in Bible Bee');
		console.log('      - Email: mbaku+reset@gatherkids.test');
		console.log('      - Auth User ID: mbaku_reset_auth_user');
		console.log('      - Prefix: mbaku_ for easy reset');
		console.log('');
		console.log('🔄 To reset these fixtures, run:');
		console.log(
			'   RESET=true DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js'
		);
	} catch (error) {
		console.error('');
		console.error('❌ Seeding failed:', error.message);
		if (error.stack) {
			console.error('Stack trace:', error.stack);
		}
		process.exit(1);
	}
}

// Run the script
if (DRY_RUN) {
	console.log('🔍 DRY RUN MODE: No changes will be made to the database');
	console.log('');
}

main();

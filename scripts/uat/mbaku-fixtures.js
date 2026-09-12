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
 * - Requires UAT environment variables or explicit --uat flag
 * - Will refuse to run against production project refs/URLs
 *
 * Usage:
 *   # Using UAT environment variables
 *   DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
 *   
 *   # With explicit --uat flag
 *   node scripts/uat/mbaku-fixtures.js --uat
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

// Known production project references (refuse to run against these)
const PRODUCTION_BLOCKLIST = [
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

	// Check for production blocklist
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

	// Require explicit UAT confirmation via URL only (--uat flag alone is NOT sufficient)
	const hasUatIndicator =
		supabaseUrl.includes('uat') ||
		supabaseUrl.includes('staging') ||
		supabaseUrl.includes('127.0.0.1') ||
		supabaseUrl.includes('localhost');

	if (!hasUatIndicator && !UAT_FLAG) {
		console.error('❌ UAT environment not confirmed');
		console.error(`   Supabase URL: ${supabaseUrl}`);
		console.error('');
		console.error('This script requires a UAT/staging/localhost Supabase URL.');
		console.error('The --uat flag alone is not sufficient for remote URLs.');
		console.error('Use a Supabase URL containing "uat", "staging", or "localhost"');
		process.exit(1);
	}

	if (!hasUatIndicator && UAT_FLAG) {
		console.error('❌ Invalid use of --uat flag');
		console.error(`   Supabase URL: ${supabaseUrl}`);
		console.error('');
		console.error('The --uat flag cannot authorize a remote URL without uat/staging/localhost.');
		console.error('This is a production safety gate.');
		console.error('Use a proper UAT Supabase URL instead.');
		process.exit(1);
	}

	console.log('✅ Environment validated as UAT');
	console.log(`   Supabase URL: ${supabaseUrl}`);
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

	console.log('🗑️  Resetting M\'Baku fixtures...');

	try {
		// Delete in proper foreign key dependency order
		// Level 1: Child tables
		await supabase
			.from('student_essays')
			.delete()
			.like('child_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared student_essays');

		await supabase
			.from('bible_bee_enrollments')
			.delete()
			.like('id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared bible_bee_enrollments');

		await supabase
			.from('ministry_enrollments')
			.delete()
			.like('enrollment_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared ministry_enrollments');

		await supabase
			.from('registrations')
			.delete()
			.like('registration_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared registrations');

		// Level 2: Children and contacts
		await supabase
			.from('children')
			.delete()
			.like('child_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared children');

		await supabase
			.from('guardians')
			.delete()
			.like('guardian_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared guardians');

		await supabase
			.from('emergency_contacts')
			.delete()
			.like('contact_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared emergency_contacts');

		// Level 3: Households
		await supabase
			.from('households')
			.delete()
			.like('household_id', `${FIXTURE_PREFIX}%`);
		console.log('✅ Cleared households');

		console.log('✅ Reset complete - all M\'Baku fixtures removed');
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
 */
async function getActiveBibleBeeCycles(limit = 2) {
	console.log(`📖 Finding up to ${limit} active Bible Bee cycles...`);

	const { data, error } = await supabase
		.from('bible_bee_cycles')
		.select('id, name')
		.eq('is_active', true)
		.limit(limit);

	if (error || !data || data.length === 0) {
		console.error('❌ No active Bible Bee cycles found');
		console.error('   Please ensure Bible Bee cycles exist (run seed:uat:bible-bee)');
		process.exit(1);
	}

	console.log(`✅ Found ${data.length} Bible Bee cycle(s):`);
	data.forEach(cycle => console.log(`   - ${cycle.name} (${cycle.id})`));
	return data;
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
 * Create Fixture 1: Bot-guardian household with Bible Bee children
 */
async function createBotGuardianFixture(cycleId, ministryId, bibleBeeCycleId, divisionIds) {
	console.log('🤖 Creating Fixture 1: Bot-guardian household...');

	// Create household
	const householdId = `${FIXTURE_PREFIX}bot_household`;
	const householdData = {
		household_id: householdId,
		name: 'M\'Baku Bot Family',
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

	// Create bot guardian
	const guardianId = `${FIXTURE_PREFIX}bot_guardian`;
	const guardianData = {
		guardian_id: guardianId,
		household_id: householdId,
		first_name: 'M\'Baku',
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

	// Create emergency contact
	const contactId = `${FIXTURE_PREFIX}bot_emergency`;
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

	// Create two children for bot household
	const children = [
		{
			child_id: `${FIXTURE_PREFIX}bot_child_1`,
			first_name: 'Shuri',
			last_name: 'Bot',
			dob: '2015-03-15',
			grade: '4',
			gender: 'F',
		},
		{
			child_id: `${FIXTURE_PREFIX}bot_child_2`,
			first_name: 'T\'Challa',
			last_name: 'Bot',
			dob: '2012-08-20',
			grade: '7',
			gender: 'M',
		},
	];

	for (const childData of children) {
		const fullChildData = {
			...childData,
			household_id: householdId,
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

		// Enroll in Bible Bee ministry
		const enrollmentId = `${FIXTURE_PREFIX}${childData.child_id}_bible_bee`;
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

		// Create Bible Bee enrollment record
		const beeEnrollmentId = `${FIXTURE_PREFIX}bee_${childData.child_id}`;
		const divisionId = childData.grade <= '5' ? divisionIds.junior : divisionIds.senior;
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
async function createDualCycleFixture(cycleId, ministryId, bibleBeeCycles, divisionIds) {
	console.log('📝 Creating Fixture 2: Dual-cycle + essays fixture...');

	// Create household
	const householdId = `${FIXTURE_PREFIX}dual_household`;
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

	// Create guardian
	const guardianId = `${FIXTURE_PREFIX}dual_guardian`;
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

	// Create senior-division child (requires essay)
	const childId = `${FIXTURE_PREFIX}dual_child_senior`;
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

	// Enroll in Bible Bee
	const enrollmentId = `${FIXTURE_PREFIX}${childId}_bible_bee`;
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

	// Enroll in MULTIPLE Bible Bee cycles (dual-cycle fixture)
	const seniorDivisionId = divisionIds.senior;
	
	for (let i = 0; i < bibleBeeCycles.length; i++) {
		const cycle = bibleBeeCycles[i];
		const beeEnrollmentId = `${FIXTURE_PREFIX}bee_${childId}_cycle${i + 1}`;
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

		// Create essay prompt for this cycle
		const essayPromptId = `${FIXTURE_PREFIX}essay_prompt_${i + 1}`;
		const essayPromptData = {
			id: essayPromptId,
			bible_bee_cycle_id: cycle.id,
			division_id: seniorDivisionId,
			title: `Senior Essay ${i + 1} - ${cycle.name}`,
			prompt: `This is the essay prompt for ${cycle.name}. Students should reflect on their Bible Bee journey and demonstrate their understanding of scripture.`,
			instructions: 'Write a thoughtful essay of 500-750 words. Use specific scripture references.',
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

		// Create student essay for this child + prompt
		const studentEssayId = `${FIXTURE_PREFIX}student_essay_${i + 1}`;
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
async function createResettableTestFixture(cycleId, ministryId, bibleBeeCycleId, divisionIds) {
	console.log('🔄 Creating Fixture 3: Resettable test household...');

	// Create household
	const householdId = `${FIXTURE_PREFIX}reset_household`;
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

	// Create guardian
	const guardianId = `${FIXTURE_PREFIX}reset_guardian`;
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

	// Create one child
	const childId = `${FIXTURE_PREFIX}reset_child`;
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

	// Enroll in Bible Bee
	const enrollmentId = `${FIXTURE_PREFIX}${childId}_bible_bee`;
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

	// Create Bible Bee enrollment record (like fixtures 1 and 2)
	const beeEnrollmentId = `${FIXTURE_PREFIX}bee_${childId}`;
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
		console.log('');
		console.log('🎯 Fixtures Created:');
		console.log('   1. Bot-guardian household (M\'Baku Bot Family)');
		console.log('      - 2 children enrolled in Bible Bee');
		console.log('      - Email: mbaku+bot@gatherkids.test');
		console.log('');
		console.log('   2. Dual-cycle + essays household (Dual-Cycle Test Family)');
		console.log(`      - 1 senior division student enrolled in ${bibleBeeCycles.length} cycles`);
		console.log(`      - ${bibleBeeCycles.length} essay prompts + ${bibleBeeCycles.length} student essays created`);
		console.log('      - Email: mbaku+dual@gatherkids.test');
		console.log('');
		console.log('   3. Resettable test household (Reset Test Family)');
		console.log('      - 1 child enrolled in Bible Bee');
		console.log('      - Email: mbaku+reset@gatherkids.test');
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

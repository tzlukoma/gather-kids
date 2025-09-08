#!/usr/bin/env node
/**
 * Dev Seed Script for gatherKids
 *
 * Seeds the development database with comprehensive test data including:
 * - Registration cycles (matching UAT script)
 * - Ministries with proper setup
 * - Bible Bee 2025-2026 year with divisions and scriptures
 * - 2 households with 2 children each
 * - Ministry enrollments for Bible Bee, Sunday School, and 1 other ministry per child
 * - Ministry accounts for all ministries
 *
 * Usage:
 *   npm run seed:dev
 *   DRY_RUN=true npm run seed:dev
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment setup
const projectRoot = path.resolve(__dirname, '../..');
const DRY_RUN = process.env.DRY_RUN === 'true';
const EXTERNAL_ID_PREFIX = 'dev_';

// Global counters for tracking what was actually created
const counters = {
	ministries: 0,
	ministry_accounts: 0,
	bible_bee_years: 0,
	competition_years: 0,
	registration_cycles: 0,
	divisions: 0,
	grade_rules: 0,
	scriptures: 0,
	essay_prompts: 0,
	households: 0,
	emergency_contacts: 0,
	guardians: 0,
	children: 0,
	ministry_enrollments: 0,
	events: 0,
};

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('❌ Missing Supabase configuration');
	console.error('Required environment variables:');
	console.error('- NEXT_PUBLIC_SUPABASE_URL');
	console.error('- SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

let supabase;

// Create dry run proxy for testing
function createDryRunProxy(realClient) {
	if (!DRY_RUN) return realClient;

	return new Proxy(realClient, {
		get(target, prop) {
			if (prop === 'from') {
				return (table) => ({
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
						}),
						like: () => ({
							single: () =>
								Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
						}),
						order: () => Promise.resolve({ data: [], error: null }),
						toArray: () => Promise.resolve({ data: [], error: null }),
					}),
					insert: () =>
						Promise.resolve({ data: { id: 'mock-id' }, error: null }),
					update: () => Promise.resolve({ data: null, error: null }),
					delete: () => Promise.resolve({ data: null, error: null }),
				});
			}
			return target[prop];
		},
	});
}

// Initialize Supabase client
async function initSupabase() {
	const client = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});
	supabase = createDryRunProxy(client);
	console.log('🔗 Supabase client initialized');
}

// Helper function to convert ministry name to email
function ministryNameToEmail(ministryName) {
	return (
		ministryName
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.replace(/\s+/g, '.')
			.replace(/\.+/g, '.')
			.replace(/^\.|\.$/g, '') + '@morethanahut.com'
	);
}

/**
 * Create registration cycle (matching UAT script)
 */
async function createRegistrationCycle() {
	try {
		console.log('🔄 Creating registration cycle...');

		// Check if registration_cycles table exists
		const { data: tableExists, error: tableError } = await supabase
			.from('registration_cycles')
			.select('cycle_id')
			.limit(1);

		if (tableError && tableError.code === 'PGRST116') {
			console.log('⚠️ registration_cycles table does not exist, skipping...');
			return null;
		}

		const currentDate = new Date();
		const startDate = new Date(currentDate);
		const endDate = new Date(currentDate);
		endDate.setMonth(endDate.getMonth() + 6); // 6 months from now

		const startDateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
		const endDateString = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

		const month = currentDate.getMonth();
		let season;
		if (month >= 8 && month <= 11) {
			season = 'Fall';
		} // Sep-Dec
		else if (month >= 0 && month <= 2) {
			season = 'Winter';
		} // Jan-Mar
		else if (month >= 3 && month <= 5) {
			season = 'Spring';
		} // Apr-Jun
		else {
			season = 'Summer';
		} // Jul-Aug

		const year = currentDate.getFullYear();
		const cycleName = `${season} ${year}`;
		const cycleId = `${EXTERNAL_ID_PREFIX}cycle_${year}_${season.toLowerCase()}`;

		const cycleData = {
			cycle_id: cycleId,
			name: cycleName, // Required by database schema
			start_date: startDateString,
			end_date: endDateString,
			is_active: true, // This is the active cycle
		};

		// Force create a new cycle with a unique ID by appending a timestamp
		const timestamp = new Date()
			.toISOString()
			.replace(/[^0-9]/g, '')
			.substring(0, 14);
		const uniqueCycleId = `${cycleId}_${timestamp}`;
		const uniqueCycleName = `${cycleName} (${timestamp})`;

		console.log(
			`🔄 Creating a new unique registration cycle: ${uniqueCycleName}`
		);

		// Update the cycle data with the unique ID and name
		cycleData.cycle_id = uniqueCycleId;
		cycleData.name = uniqueCycleName;

		// Deactivate all other cycles first
		const { error: deactivateError } = await supabase
			.from('registration_cycles')
			.update({ is_active: false })
			.neq('cycle_id', uniqueCycleId);

		if (deactivateError) {
			console.log(
				`⚠️ Warning: Could not deactivate other cycles: ${deactivateError.message}`
			);
		}

		const { data: newCycle, error: insertError } = await supabase
			.from('registration_cycles')
			.insert(cycleData)
			.select()
			.single();

		if (insertError) {
			throw new Error(
				`Failed to create registration cycle: ${insertError.message}`
			);
		}

		console.log(
			`✅ Created registration cycle: ${uniqueCycleName} (${startDateString} to ${endDateString})`
		);
		counters.registration_cycles++;
		return newCycle.cycle_id;
	} catch (error) {
		console.error('❌ Failed to create registration cycle:', error.message);
		throw error;
	}
}

/**
 * Create ministries
 */
async function createMinistries() {
	try {
		console.log('🏛️ Creating ministries...');

		const ministriesData = [
			// Core ministries
			{
				ministry_id: 'min_sunday_school',
				name: 'Sunday School',
				code: 'min_sunday_school',
				enrollment_type: 'enrolled',
				data_profile: 'SafetyAware',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
				name: 'Bible Bee',
				code: 'bible-bee',
				enrollment_type: 'enrolled',
				description: 'Registration open until Oct. 8, 2025',
				open_at: '2025-01-01',
				close_at: '2025-10-08',
				details:
					'Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}acolyte`,
				name: 'Acolyte Ministry',
				code: 'acolyte',
				enrollment_type: 'enrolled',
				details:
					"Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}dance`,
				name: 'Dance Ministry',
				code: 'dance',
				enrollment_type: 'enrolled',
				details:
					"Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
				data_profile: 'Basic',
				is_active: true,
			},
		];

		for (const ministryData of ministriesData) {
			// Check if ministry already exists
			const { data: existing, error: checkError } = await supabase
				.from('ministries')
				.select('ministry_id')
				.eq('ministry_id', ministryData.ministry_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking ministry ${ministryData.name}: ${checkError.message}`
				);
				continue;
			}

			if (existing) {
				console.log(`✅ Ministry already exists: ${ministryData.name}`);
			} else {
				const { error: insertError } = await supabase
					.from('ministries')
					.insert(ministryData);

				if (insertError) {
					console.log(
						`⚠️ Failed to create ministry ${ministryData.name}: ${insertError.message}`
					);
				} else {
					console.log(`✅ Created ministry: ${ministryData.name}`);
					counters.ministries++;
				}
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministries:', error.message);
		throw error;
	}
}

/**
 * Create ministry accounts for all ministries
 */
async function createMinistryAccounts() {
	try {
		console.log('🔑 Creating ministry accounts for all ministries...');

		// Get all ministries
		let ministries;
		if (DRY_RUN) {
			ministries = [
				{ ministry_id: 'min_sunday_school', name: 'Sunday School' },
				{ ministry_id: 'dev_bible_bee', name: 'Bible Bee' },
				{ ministry_id: 'dev_acolyte', name: 'Acolyte Ministry' },
				{ ministry_id: 'dev_dance', name: 'Dance Ministry' },
			];
			console.log('[DRY RUN] Using mock ministry data for ministry accounts');
		} else {
			const { data, error: ministryError } = await supabase
				.from('ministries')
				.select('ministry_id, name');

			if (ministryError) {
				throw new Error(`Error fetching ministries: ${ministryError.message}`);
			}

			ministries = data;
		}

		// Create accounts for all ministries
		const accountsData = ministries.map((ministry) => ({
			ministry_id: ministry.ministry_id,
			email: ministryNameToEmail(ministry.name),
			display_name: ministry.name,
			is_active: true,
		}));

		for (const accountData of accountsData) {
			if (!accountData.ministry_id) {
				console.log(
					`⚠️ Skipping invalid ministry account: missing ministry ID`
				);
				continue;
			}

			// Check if account already exists
			const { data: existing, error: checkError } = await supabase
				.from('ministry_accounts')
				.select('id')
				.eq('ministry_id', accountData.ministry_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking ministry account: ${checkError.message}`
				);
				continue;
			}

			if (existing) {
				console.log(
					`✅ Ministry account already exists for ${accountData.display_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('ministry_accounts')
					.insert(accountData);

				if (insertError) {
					console.log(
						`⚠️ Failed to create ministry account for ${accountData.display_name}: ${insertError.message}`
					);
				} else {
					console.log(
						`✅ Created ministry account for ${accountData.display_name}`
					);
					counters.ministry_accounts++;
				}
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministry accounts:', error.message);
		throw error;
	}
}

/**
 * Create Bible Bee year and setup (matching UAT script)
 */
async function createBibleBeeYear() {
	try {
		console.log('🏆 Creating Bible Bee year and setup...');

		const yearId = `${EXTERNAL_ID_PREFIX}bible_bee_year_2025`;
		const yearData = {
			id: yearId,
			name: '2025-2026 Bible Bee Year',
			description: 'Bible Bee competition year 2025-2026',
			start_date: '2025-01-01',
			end_date: '2025-12-31',
			is_active: true,
		};

		// Check if Bible Bee year already exists
		const { data: existing, error: checkError } = await supabase
			.from('bible_bee_years')
			.select('id')
			.eq('id', yearId)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			console.log(`⚠️ Error checking Bible Bee year: ${checkError.message}`);
			return yearId;
		}

		if (existing) {
			console.log(`✅ Bible Bee year already exists: ${yearData.name}`);
		} else {
			const { error: insertError } = await supabase
				.from('bible_bee_years')
				.insert(yearData);

			if (insertError) {
				console.log(
					`⚠️ Failed to create Bible Bee year: ${insertError.message}`
				);
			} else {
				console.log(`✅ Created Bible Bee year: ${yearData.name}`);
				counters.bible_bee_years++;
			}
		}

		// Create competition year
		const competitionYearData = {
			id: `${EXTERNAL_ID_PREFIX}competition_year_2025`,
			bible_bee_year_id: yearId,
			name: '2025 Competition',
			description: '2025 Bible Bee Competition',
			competition_date: '2025-10-15',
			is_active: true,
		};

		const { data: existingComp, error: compCheckError } = await supabase
			.from('competition_years')
			.select('id')
			.eq('id', competitionYearData.id)
			.single();

		if (compCheckError && compCheckError.code !== 'PGRST116') {
			console.log(
				`⚠️ Error checking competition year: ${compCheckError.message}`
			);
		} else if (!existingComp) {
			const { error: compInsertError } = await supabase
				.from('competition_years')
				.insert(competitionYearData);

			if (compInsertError) {
				console.log(
					`⚠️ Failed to create competition year: ${compInsertError.message}`
				);
			} else {
				console.log(`✅ Created competition year: ${competitionYearData.name}`);
				counters.competition_years++;
			}
		}

		// Create divisions
		await createDivisions(yearId);

		// Create grade rules
		await createGradeRules(yearId);

		return yearId;
	} catch (error) {
		console.error('❌ Error creating Bible Bee year:', error.message);
		throw error;
	}
}

/**
 * Create Bible Bee divisions
 */
async function createDivisions(yearId) {
	try {
		console.log(`🏆 Creating Bible Bee divisions for year ${yearId}...`);

		const divisionsData = [
			{
				id: crypto.randomUUID(),
				name: 'Primary',
				description: 'Primary Division (Kindergarten - 2nd Grade)',
				min_age: 5,
				max_age: 8,
				min_grade: 0,
				max_grade: 2,
				created_at: new Date().toISOString(),
			},
			{
				id: crypto.randomUUID(),
				name: 'Junior',
				description: 'Junior Division (3rd - 7th Grade)',
				min_age: 8,
				max_age: 13,
				min_grade: 3,
				max_grade: 7,
				created_at: new Date().toISOString(),
			},
			{
				id: crypto.randomUUID(),
				name: 'Senior',
				description: 'Senior Division (8th - 12th Grade)',
				min_age: 13,
				max_age: 18,
				min_grade: 8,
				max_grade: 12,
				created_at: new Date().toISOString(),
			},
		];

		for (const divisionData of divisionsData) {
			const { data: existingDivision, error: checkError } = await supabase
				.from('divisions')
				.select('id, name')
				.eq('name', divisionData.name)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking division ${divisionData.name}: ${checkError.message}`
				);
				continue;
			}

			if (existingDivision) {
				console.log(`✅ Division already exists: ${divisionData.name}`);
			} else {
				const insertData = {
					id: divisionData.id,
					name: divisionData.name,
					bible_bee_year_id: yearId,
					min_grade: divisionData.min_grade,
					max_grade: divisionData.max_grade,
					min_scriptures: 0,
				};

				const { data: newDivision, error: insertError } = await supabase
					.from('divisions')
					.insert(insertData)
					.select('id')
					.single();

				if (insertError) {
					console.log(
						`⚠️ Failed to create division ${divisionData.name}: ${insertError.message}`
					);
					continue;
				}

				console.log(`✅ Created division: ${divisionData.name}`);
				counters.divisions++;
			}
		}
	} catch (error) {
		console.error('❌ Error creating divisions:', error.message);
		throw error;
	}
}

/**
 * Create grade rules for scriptures
 */
async function createGradeRules(yearId) {
	try {
		console.log(`📏 Creating Bible Bee grade rules for year ${yearId}...`);

		const gradeRulesData = [
			{
				id: `${EXTERNAL_ID_PREFIX}primary_grade_rule`,
				competition_year_id: yearId,
				min_grade: 0,
				max_grade: 2,
				type: 'scripture',
				target_count: 10,
				created_at: new Date().toISOString(),
			},
			{
				id: `${EXTERNAL_ID_PREFIX}junior_grade_rule`,
				competition_year_id: yearId,
				min_grade: 3,
				max_grade: 7,
				type: 'scripture',
				target_count: 15,
				created_at: new Date().toISOString(),
			},
			{
				id: `${EXTERNAL_ID_PREFIX}senior_grade_rule`,
				competition_year_id: yearId,
				min_grade: 8,
				max_grade: 12,
				type: 'scripture',
				target_count: 20,
				created_at: new Date().toISOString(),
			},
		];

		for (const ruleData of gradeRulesData) {
			const { data: existing, error: checkError } = await supabase
				.from('grade_rules')
				.select('id')
				.eq('id', ruleData.id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(`⚠️ Error checking grade rule: ${checkError.message}`);
				continue;
			}

			if (existing) {
				console.log(`✅ Grade rule already exists: ${ruleData.id}`);
			} else {
				const { error: insertError } = await supabase
					.from('grade_rules')
					.insert(ruleData);

				if (insertError) {
					console.log(`⚠️ Failed to create grade rule: ${insertError.message}`);
				} else {
					console.log(`✅ Created grade rule: ${ruleData.id}`);
					counters.grade_rules++;
				}
			}
		}
	} catch (error) {
		console.error('❌ Error creating grade rules:', error.message);
		throw error;
	}
}

/**
 * Create events for check-in functionality
 */
async function createEvents() {
	try {
		console.log('🎪 Creating events for check-in functionality...');

		const events = [
			{
				event_id: 'evt_sunday_school',
				name: 'Sunday School',
				description: 'Sunday School check-in event',
			},
			{
				event_id: 'evt_childrens_church',
				name: "Children's Church",
				description: "Children's Church check-in event",
			},
			{
				event_id: 'evt_teen_church',
				name: 'Teen Church',
				description: 'Teen Church check-in event',
			},
		];

		for (const event of events) {
			const { data: existing, error: checkError } = await supabase
				.from('events')
				.select('event_id')
				.eq('event_id', event.event_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking event ${event.event_id}: ${checkError.message}`
				);
				continue;
			}

			if (existing) {
				console.log(`✅ Event already exists: ${event.event_id}`);
			} else {
				const { error: insertError } = await supabase
					.from('events')
					.insert(event);

				if (insertError) {
					console.log(
						`⚠️ Failed to create event ${event.event_id}: ${insertError.message}`
					);
				} else {
					console.log(`✅ Created event: ${event.event_id} - ${event.name}`);
					counters.events++;
				}
			}
		}

		console.log(
			`✅ Created ${counters.events} events for check-in functionality`
		);
	} catch (error) {
		console.error('❌ Failed to create events:', error.message);
		throw error;
	}
}

/**
 * Create households and families (2 households, 2 children each)
 */
async function createHouseholdsAndFamilies() {
	try {
		console.log('🏠 Creating households and families...');

		// Create households
		const householdsData = [
			{
				household_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}household_1`,
				name: 'Smith Family',
				address: '123 Main St',
				city: 'Anytown',
				state: 'CA',
				zip: '12345',
				phone: '555-123-4567',
				is_active: true,
			},
			{
				household_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}household_2`,
				name: 'Johnson Family',
				address: '456 Oak Ave',
				city: 'Anytown',
				state: 'CA',
				zip: '12345',
				phone: '555-234-5678',
				is_active: true,
			},
		];

		const householdIds = [];

		for (const householdData of householdsData) {
			const { data: existing, error: checkError } = await supabase
				.from('households')
				.select('household_id')
				.eq('external_id', householdData.external_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking household ${householdData.name}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(`✅ Household already exists: ${householdData.name}`);
				householdIds.push(existing.household_id);
			} else {
				const { data: newHousehold, error: insertError } = await supabase
					.from('households')
					.insert(householdData)
					.select('household_id')
					.single();

				if (insertError) {
					throw new Error(
						`Failed to create household ${householdData.name}: ${insertError.message}`
					);
				}

				console.log(`✅ Created household: ${householdData.name}`);
				householdIds.push(newHousehold.household_id);
				counters.households++;
			}
		}

		// Create emergency contacts
		const emergencyContactsData = [
			{
				emergency_contact_id: crypto.randomUUID(),
				household_id: householdIds[0],
				first_name: 'Emergency',
				last_name: 'Contact1',
				phone: '555-111-1111',
				relationship: 'Grandmother',
			},
			{
				emergency_contact_id: crypto.randomUUID(),
				household_id: householdIds[1],
				first_name: 'Emergency',
				last_name: 'Contact2',
				phone: '555-222-2222',
				relationship: 'Aunt',
			},
		];

		for (const contactData of emergencyContactsData) {
			const { data: existing, error: checkError } = await supabase
				.from('emergency_contacts')
				.select('emergency_contact_id')
				.eq('household_id', contactData.household_id)
				.eq('first_name', contactData.first_name)
				.eq('last_name', contactData.last_name)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking emergency contact ${contactData.first_name} ${contactData.last_name}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(
					`✅ Emergency contact already exists: ${contactData.first_name} ${contactData.last_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('emergency_contacts')
					.insert(contactData);

				if (insertError) {
					throw new Error(
						`Failed to create emergency contact ${contactData.first_name} ${contactData.last_name}: ${insertError.message}`
					);
				}

				console.log(
					`✅ Created emergency contact: ${contactData.first_name} ${contactData.last_name}`
				);
				counters.emergency_contacts++;
			}
		}

		// Create guardians
		const guardiansData = [
			{
				guardian_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}guardian_1`,
				household_id: householdIds[0],
				first_name: 'John',
				last_name: 'Smith',
				email: 'john.smith@example.com',
				mobile_phone: '555-123-4567',
				relationship: 'Father',
				is_primary: true,
			},
			{
				guardian_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}guardian_2`,
				household_id: householdIds[0],
				first_name: 'Jane',
				last_name: 'Smith',
				email: 'jane.smith@example.com',
				mobile_phone: '555-987-6543',
				relationship: 'Mother',
				is_primary: false,
			},
			{
				guardian_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}guardian_3`,
				household_id: householdIds[1],
				first_name: 'Bob',
				last_name: 'Johnson',
				email: 'bob.johnson@example.com',
				mobile_phone: '555-234-5678',
				relationship: 'Father',
				is_primary: true,
			},
			{
				guardian_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}guardian_4`,
				household_id: householdIds[1],
				first_name: 'Mary',
				last_name: 'Johnson',
				email: 'mary.johnson@example.com',
				mobile_phone: '555-876-5432',
				relationship: 'Mother',
				is_primary: false,
			},
		];

		for (const guardianData of guardiansData) {
			const { data: existing, error: checkError } = await supabase
				.from('guardians')
				.select('guardian_id')
				.eq('external_id', guardianData.external_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking guardian ${guardianData.first_name} ${guardianData.last_name}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(
					`✅ Guardian already exists: ${guardianData.first_name} ${guardianData.last_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('guardians')
					.insert(guardianData);

				if (insertError) {
					throw new Error(
						`Failed to create guardian ${guardianData.first_name} ${guardianData.last_name}: ${insertError.message}`
					);
				}

				console.log(
					`✅ Created guardian: ${guardianData.first_name} ${guardianData.last_name}`
				);
				counters.guardians++;
			}
		}

		// Create children (2 per household)
		const childrenData = [
			// Smith family children
			{
				child_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}child_1`,
				household_id: householdIds[0],
				first_name: 'Emma',
				last_name: 'Smith',
				dob: '2015-06-15', // 9 years old, 4th grade
				grade: '4',
				gender: 'F',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				is_active: true,
			},
			{
				child_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}child_2`,
				household_id: householdIds[0],
				first_name: 'Liam',
				last_name: 'Smith',
				dob: '2017-03-20', // 7 years old, 2nd grade
				grade: '2',
				gender: 'M',
				allergies: 'Peanuts',
				medical_notes: 'Regular checkups',
				special_needs: false,
				special_needs_notes: null,
				is_active: true,
			},
			// Johnson family children
			{
				child_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}child_3`,
				household_id: householdIds[1],
				first_name: 'Sophia',
				last_name: 'Johnson',
				dob: '2012-09-10', // 12 years old, 7th grade
				grade: '7',
				gender: 'F',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				is_active: true,
			},
			{
				child_id: crypto.randomUUID(),
				external_id: `${EXTERNAL_ID_PREFIX}child_4`,
				household_id: householdIds[1],
				first_name: 'Noah',
				last_name: 'Johnson',
				dob: '2019-12-05', // 5 years old, Kindergarten
				grade: '0',
				gender: 'M',
				allergies: null,
				medical_notes: null,
				special_needs: true,
				special_needs_notes: 'Requires additional support',
				is_active: true,
			},
		];

		for (const childData of childrenData) {
			const { data: existing, error: checkError } = await supabase
				.from('children')
				.select('child_id')
				.eq('external_id', childData.external_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking child ${childData.first_name} ${childData.last_name}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(
					`✅ Child already exists: ${childData.first_name} ${childData.last_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('children')
					.insert(childData);

				if (insertError) {
					throw new Error(
						`Failed to create child ${childData.first_name} ${childData.last_name}: ${insertError.message}`
					);
				}

				console.log(
					`✅ Created child: ${childData.first_name} ${childData.last_name}`
				);
				counters.children++;
			}
		}

		return householdIds;
	} catch (error) {
		console.error('❌ Error creating households and families:', error.message);
		throw error;
	}
}

/**
 * Create ministry enrollments
 */
async function createMinistryEnrollments(activeCycleId) {
	try {
		console.log('📚 Creating ministry enrollments...');

		// Get children
		const { data: children, error: childrenError } = await supabase
			.from('children')
			.select('child_id, external_id, first_name, last_name, grade')
			.like('external_id', `${EXTERNAL_ID_PREFIX}%`);

		if (childrenError) {
			throw new Error(`Failed to fetch children: ${childrenError.message}`);
		}

		// Get ministries
		const { data: ministries, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id, name')
			.in('ministry_id', [
				'min_sunday_school',
				`${EXTERNAL_ID_PREFIX}bible_bee`,
				`${EXTERNAL_ID_PREFIX}acolyte`,
				`${EXTERNAL_ID_PREFIX}dance`,
			]);

		if (ministryError) {
			console.log(
				`⚠️ Skipping ministry enrollments - ${ministryError.message}`
			);
			return;
		}

		if (!ministries || ministries.length === 0) {
			console.log('⚠️ Skipping ministry enrollments - no ministries found');
			return;
		}

		if (!activeCycleId) {
			console.log(
				'⚠️ Skipping ministry enrollments - no active cycle ID provided'
			);
			return;
		}

		// Create ministry mapping
		const ministryMap = {};
		ministries.forEach((ministry) => {
			ministryMap[ministry.ministry_id] = ministry.ministry_id;
		});

		console.log(`✅ Found ${ministries.length} ministries for enrollments`);

		// Create enrollments: all children in Sunday School, Bible Bee, and one additional ministry
		// Acolyte ministry only in Smith household for filtering test
		const enrollments = [];

		for (const child of children) {
			const grade = parseInt(child.grade);

			// All children in Sunday School
			enrollments.push({
				external_id: `${EXTERNAL_ID_PREFIX}enrollment_${
					child.external_id.split('_')[2]
				}_ss`,
				child_id: child.child_id,
				ministry_id: 'min_sunday_school',
				cycle_id: activeCycleId,
				enrollment_date: '2025-01-01',
				is_active: true,
			});

			// All children in Bible Bee
			enrollments.push({
				external_id: `${EXTERNAL_ID_PREFIX}enrollment_${
					child.external_id.split('_')[2]
				}_bb`,
				child_id: child.child_id,
				ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
				cycle_id: activeCycleId,
				enrollment_date: '2025-01-01',
				is_active: true,
			});

			// Each child in one additional ministry based on their characteristics
			// Acolyte ministry only in Smith household (Emma and Liam) for filtering test
			let additionalMinistry;
			if (child.first_name === 'Emma') {
				// Emma (4th grade, Smith household) - Acolyte Ministry
				additionalMinistry = `${EXTERNAL_ID_PREFIX}acolyte`;
			} else if (child.first_name === 'Liam') {
				// Liam (2nd grade, Smith household) - Acolyte Ministry
				additionalMinistry = `${EXTERNAL_ID_PREFIX}acolyte`;
			} else if (child.first_name === 'Sophia') {
				// Sophia (7th grade, Johnson household) - Dance Ministry
				additionalMinistry = `${EXTERNAL_ID_PREFIX}dance`;
			} else if (child.first_name === 'Noah') {
				// Noah (Kindergarten, Johnson household) - Dance Ministry
				additionalMinistry = `${EXTERNAL_ID_PREFIX}dance`;
			}

			if (additionalMinistry && ministryMap[additionalMinistry]) {
				enrollments.push({
					external_id: `${EXTERNAL_ID_PREFIX}enrollment_${
						child.external_id.split('_')[2]
					}_extra`,
					child_id: child.child_id,
					ministry_id: additionalMinistry,
					cycle_id: activeCycleId,
					enrollment_date: '2025-01-01',
					is_active: true,
				});
			}
		}

		// Insert enrollments
		for (const enrollment of enrollments) {
			if (!enrollment.child_id || !enrollment.ministry_id) {
				console.log(
					`⚠️ Skipping invalid enrollment: missing child_id or ministry_id`
				);
				continue;
			}

			const { data: existing, error: checkError } = await supabase
				.from('ministry_enrollments')
				.select('enrollment_id')
				.eq('external_id', enrollment.external_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(`⚠️ Error checking enrollment: ${checkError.message}`);
				continue;
			}

			if (existing) {
				console.log(`✅ Enrollment already exists: ${enrollment.external_id}`);
			} else {
				const { error: insertError } = await supabase
					.from('ministry_enrollments')
					.insert(enrollment);

				if (insertError) {
					console.log(
						`⚠️ Failed to create enrollment ${enrollment.external_id}: ${insertError.message}`
					);
				} else {
					console.log(`✅ Created enrollment: ${enrollment.external_id}`);
					counters.ministry_enrollments++;
				}
			}
		}

		console.log(
			`✅ Created ${counters.ministry_enrollments} ministry enrollments`
		);
	} catch (error) {
		console.error('❌ Error creating ministry enrollments:', error.message);
		throw error;
	}
}

/**
 * Main seeding function
 */
async function seedDevData() {
	try {
		console.log('🌱 Starting dev seed script...');

		// Initialize Supabase
		await initSupabase();

		// Create registration cycle first
		const activeCycleId = await createRegistrationCycle();

		// Create ministries
		await createMinistries();

		// Create ministry accounts
		await createMinistryAccounts();

		// Create Bible Bee setup
		await createBibleBeeYear();

		// Create events for check-in
		await createEvents();

		// Create households and families
		const householdIds = await createHouseholdsAndFamilies();

		// Create ministry enrollments
		await createMinistryEnrollments(activeCycleId);

		console.log('✨ Dev seeding completed successfully!');
		console.log('📊 Summary:');
		console.log(`- ${counters.ministries} ministries created`);
		console.log(`- ${counters.ministry_accounts} ministry accounts created`);
		console.log(
			`- ${counters.registration_cycles} registration cycles created`
		);
		console.log(`- ${counters.bible_bee_years} Bible Bee years created`);
		console.log(`- ${counters.competition_years} competition years created`);
		console.log(`- ${counters.divisions} divisions created`);
		console.log(`- ${counters.grade_rules} grade rules created`);
		console.log(`- ${counters.households} households created`);
		console.log(`- ${counters.guardians} guardians created`);
		console.log(`- ${counters.children} children created`);
		console.log(
			`- ${counters.ministry_enrollments} ministry enrollments created`
		);
		console.log(`- ${counters.events} events created`);
		console.log('');
		console.log('🎯 Test Data Summary:');
		console.log('- 2 households with 2 children each');
		console.log('- All children enrolled in Sunday School and Bible Bee');
		console.log(
			'- Smith household children (Emma, Liam) enrolled in Acolyte Ministry'
		);
		console.log(
			'- Johnson household children (Sophia, Noah) enrolled in Dance Ministry'
		);
		console.log(
			'- Acolyte ministry only in Smith household for filtering test'
		);
		console.log('- Ministry accounts created for all ministries');
		console.log('- Registration cycle set up properly');
		console.log('- Bible Bee divisions and grade rules configured');
	} catch (error) {
		console.error('❌ Seeding failed:', error.message);
		process.exit(1);
	}
}

// Run the seeding process
if (DRY_RUN) {
	console.log('🔍 DRY RUN MODE: No changes will be made to the database');
}

seedDevData();

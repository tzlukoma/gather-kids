#!/usr/bin/env node
/**
 * Dev Seed Script for gatherKids
 *
 * Seeds the development database with comprehensive test data using direct Supabase calls.
 * Follows the same pattern as the UAT seed script.
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
import { devSeedUuid } from '../lib/dev-seed-ids.mjs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment setup
const projectRoot = path.resolve(__dirname, '../..');
const DRY_RUN = process.env.DRY_RUN === 'true';
const EXTERNAL_ID_PREFIX = 'dev_';

// The two seeded households, named once so every row that belongs to one can
// derive a stable id from the same string.
const SMITH_HOUSEHOLD = 'Smith Family';
const JOHNSON_HOUSEHOLD = 'Johnson Family';

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('❌ Missing Supabase environment variables');
	console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
	console.error(
		'NEXT_PUBLIC_SUPABASE_ANON_KEY:',
		supabaseKey ? 'SET' : 'NOT SET'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create dry run proxy for testing
function createDryRunProxy(realClient) {
	if (!DRY_RUN) return realClient;

	return new Proxy(realClient, {
		get(target, prop) {
			if (prop === 'from') {
				return (table) => ({
					select: () => {
						const queryChain = {
							eq: () => queryChain,
							like: () => queryChain,
							limit: () => queryChain,
							in: () => queryChain,
							order: () => Promise.resolve({ data: [], error: null }),
							toArray: () => Promise.resolve({ data: [], error: null }),
							single: () =>
								Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
						};
						return queryChain;
					},
					insert: () => ({
						select: () => ({
							single: () =>
								Promise.resolve({
									data: { cycle_id: 'mock-cycle-id' },
									error: null,
								}),
						}),
					}),
					update: () => ({
						neq: () => Promise.resolve({ data: null, error: null }),
					}),
					delete: () => Promise.resolve({ data: null, error: null }),
				});
			}
			return target[prop];
		},
	});
}

const client = createDryRunProxy(supabase);

// Global counters for tracking what was actually created
const counters = {
	ministries: 0,
	ministry_accounts: 0,
	registration_cycles: 0,
	bible_bee_years: 0,
	households: 0,
	emergency_contacts: 0,
	guardians: 0,
	children: 0,
	ministry_enrollments: 0,
	events: 0,
	incidents: 0,
	attendance: 0,
	leader_profiles: 0,
	leader_assignments: 0,
};

/**
 * Insert a fixture row unless it is already there.
 *
 * Households used to be "guarded" by looking up a `crypto.randomUUID()`
 * generated microseconds earlier, which no database could ever have seen, so
 * the guard always fell through to the insert. Guardians, emergency contacts,
 * children and incidents had no guard at all. Every run added another copy of
 * the same four children.
 *
 * Fixture ids are now derived from the row's natural key
 * (`scripts/lib/dev-seed-ids.mjs`), so asking whether the id is present is a
 * real question. Logging matches `createEventsData`, which has always done
 * this correctly.
 *
 * @returns {Promise<boolean>} true when this run created the row.
 */
async function insertFixtureIfAbsent({ table, idColumn, row, label, counter }) {
	const { data: existing } = await client
		.from(table)
		.select(idColumn)
		.eq(idColumn, row[idColumn])
		.single();

	if (existing) {
		console.log(`✅ ${label} already exists`);
		return false;
	}

	const { error } = await client.from(table).insert(row).select().single();

	if (error) {
		throw new Error(`Failed to create ${label}: ${error.message}`);
	}

	console.log(`✅ Created ${label}`);
	if (counter) {
		counters[counter]++;
	}
	return true;
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
 * Create registration cycle using direct Supabase calls
 */
async function createRegistrationCycleData() {
	try {
		console.log('🔄 Creating registration cycle...');

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

		// Force create a new cycle with a unique ID by appending a timestamp
		const now = new Date();
		const timestamp = now
			.toISOString()
			.replace(/[^0-9]/g, '')
			.substring(0, 14);
		const humanReadableDate = `${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
		const uniqueCycleId = `${cycleId}_${timestamp}`;
		const uniqueCycleName = `${cycleName} (${humanReadableDate})`;

		console.log(
			`🔄 Creating a new unique registration cycle: ${uniqueCycleName}`
		);

		// Deactivate all other cycles first
		const { error: updateError } = await client
			.from('registration_cycles')
			.update({ is_active: false })
			.neq('cycle_id', 'nonexistent');

		if (updateError) {
			console.log(
				'⚠️ Could not deactivate existing cycles:',
				updateError.message
			);
		}

		// Create the new cycle
		const cycleData = {
			cycle_id: uniqueCycleId,
			name: uniqueCycleName,
			start_date: startDateString,
			end_date: endDateString,
			is_active: true,
		};

		const { data, error } = await client
			.from('registration_cycles')
			.insert(cycleData)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to create registration cycle: ${error.message}`);
		}

		console.log(
			`✅ Created registration cycle: ${uniqueCycleName} (${startDateString} to ${endDateString})`
		);
		counters.registration_cycles++;
		return data.cycle_id;
	} catch (error) {
		console.error('❌ Failed to create registration cycle:', error.message);
		throw error;
	}
}

/**
 * Create ministries using direct Supabase calls
 */
async function createMinistriesData() {
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
			// Youth Choir ministries with age restrictions
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
				name: 'Youth Choirs- Joy Bells (Ages 4-8)',
				code: 'choir-joy-bells',
				enrollment_type: 'enrolled',
				min_age: 4,
				max_age: 8,
				details:
					'Joy Bells is our introductory choir for the youngest voices. Practices are held after the 11 AM service.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
				name: 'Youth Choirs- Keita Praise Choir (Ages 9-12)',
				code: 'choir-keita',
				enrollment_type: 'enrolled',
				min_age: 9,
				max_age: 12,
				details:
					'Keita Praise Choir builds on foundational skills and performs once a month. Practices are on Wednesdays.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
				name: 'Youth Choirs- New Generation Teen Choir (Ages 13-18)',
				code: 'choir-teen',
				enrollment_type: 'enrolled',
				min_age: 13,
				max_age: 18,
				details:
					'The Teen Choir performs contemporary gospel music and leads worship during Youth Sundays.',
				data_profile: 'Basic',
				is_active: true,
			},
		];

		for (const ministryData of ministriesData) {
			try {
				// Check if ministry already exists
				const { data: existing } = await client
					.from('ministries')
					.select('ministry_id')
					.eq('ministry_id', ministryData.ministry_id)
					.single();

				if (existing) {
					console.log(`✅ Ministry already exists: ${ministryData.name}`);
				} else {
					const { data, error } = await client
						.from('ministries')
						.insert(ministryData)
						.select()
						.single();

					if (error) {
						throw new Error(`Failed to create ministry: ${error.message}`);
					}

					console.log(`✅ Created ministry: ${ministryData.name}`);
					counters.ministries++;
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to create ministry ${ministryData.name}: ${error.message}`
				);
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministries:', error.message);
		throw error;
	}
}

/**
 * Create ministry accounts using direct Supabase calls
 */
async function createMinistryAccountsData() {
	try {
		console.log('🔑 Creating ministry accounts for all ministries...');

		const ministries = [
			{ ministry_id: 'min_sunday_school', name: 'Sunday School' },
			{ ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`, name: 'Bible Bee' },
			{ ministry_id: `${EXTERNAL_ID_PREFIX}acolyte`, name: 'Acolyte Ministry' },
			{ ministry_id: `${EXTERNAL_ID_PREFIX}dance`, name: 'Dance Ministry' },
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
				name: 'Youth Choirs- Joy Bells (Ages 4-8)',
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
				name: 'Youth Choirs- Keita Praise Choir (Ages 9-12)',
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
				name: 'Youth Choirs- New Generation Teen Choir (Ages 13-18)',
			},
		];

		for (const ministry of ministries) {
			try {
				const accountData = {
					ministry_id: ministry.ministry_id,
					email: ministryNameToEmail(ministry.name),
					display_name: ministry.name,
					is_active: true,
				};

				// Check if account already exists
				const { data: existing } = await client
					.from('ministry_accounts')
					.select('ministry_id')
					.eq('ministry_id', ministry.ministry_id)
					.single();

				if (existing) {
					console.log(
						`✅ Ministry account already exists for ${ministry.name}`
					);
				} else {
					const { data, error } = await client
						.from('ministry_accounts')
						.insert(accountData)
						.select()
						.single();

					if (error) {
						throw new Error(
							`Failed to create ministry account: ${error.message}`
						);
					}

					console.log(`✅ Created ministry account for ${ministry.name}`);
					counters.ministry_accounts++;
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to create ministry account for ${ministry.name}: ${error.message}`
				);
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministry accounts:', error.message);
		throw error;
	}
}

/**
 * Create ministry groups and assign choir ministries
 */
async function createMinistryGroupsData() {
	try {
		console.log(
			'🎵 Creating ministry groups and assigning choir ministries...'
		);

		// Create the 'choirs' ministry group
		const groupData = {
			code: 'choirs',
			name: 'Choirs',
			description:
				'Youth choir ministries grouped together for shared management and notifications',
			email: 'choirs@morethanahut.com',
			custom_consent_text:
				'Cathedral International youth choirs communicate using the Planning Center app. By clicking yes, you agree to be added into the app, which will enable you to download the app, receive emails and push communications.',
			custom_consent_required: true,
		};

		// Check if group already exists
		const { data: existingGroup } = await client
			.from('ministry_groups')
			.select('id')
			.eq('code', 'choirs')
			.single();

		let groupId;
		if (existingGroup) {
			console.log('✅ Ministry group already exists: Choirs');
			groupId = existingGroup.id;
		} else {
			const { data, error } = await client
				.from('ministry_groups')
				.insert(groupData)
				.select('id')
				.single();

			if (error) {
				throw new Error(`Failed to create ministry group: ${error.message}`);
			}

			console.log('✅ Created ministry group: Choirs');
			groupId = data.id;
		}

		// Assign choir ministries to the group
		const choirMinistries = [
			`${EXTERNAL_ID_PREFIX}joy_bells`,
			`${EXTERNAL_ID_PREFIX}keita_choir`,
			`${EXTERNAL_ID_PREFIX}teen_choir`,
		];

		for (const ministryId of choirMinistries) {
			try {
				// Check if membership already exists
				const { data: existingMembership } = await client
					.from('ministry_group_members')
					.select('group_id')
					.eq('group_id', groupId)
					.eq('ministry_id', ministryId)
					.single();

				if (existingMembership) {
					console.log(
						`✅ Ministry ${ministryId} already assigned to Choirs group`
					);
				} else {
					const { error } = await client.from('ministry_group_members').insert({
						group_id: groupId,
						ministry_id: ministryId,
					});

					if (error) {
						throw new Error(
							`Failed to assign ministry to group: ${error.message}`
						);
					}

					console.log(`✅ Assigned ${ministryId} to Choirs group`);
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to assign ${ministryId} to Choirs group: ${error.message}`
				);
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministry groups:', error.message);
		throw error;
	}
}

/**
 * Create Bible Bee cycles using direct Supabase calls
 */
async function createBibleBeeCyclesData(activeCycleId) {
	try {
		console.log('📖 Creating Bible Bee cycles...');

		const bibleBeeCycleData = {
			id: crypto.randomUUID(),
			cycle_id: activeCycleId, // Direct reference to registration cycle
			name: 'Fall 2025 Bible Bee',
			description: 'Bible Bee competition for Fall 2025 registration cycle',
			is_active: true,
		};

		// Check if Bible Bee cycle already exists for this registration cycle
		const { data: existing } = await client
			.from('bible_bee_cycles')
			.select('id')
			.eq('cycle_id', activeCycleId)
			.single();

		if (existing) {
			console.log(
				`✅ Bible Bee cycle already exists for cycle ${activeCycleId}`
			);
		} else {
			const { data, error } = await client
				.from('bible_bee_cycles')
				.insert(bibleBeeCycleData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create Bible Bee cycle: ${error.message}`);
			}

			console.log(`✅ Created Bible Bee cycle: ${bibleBeeCycleData.name}`);
			counters.bible_bee_years++; // Keep same counter name for now
		}
	} catch (error) {
		console.error('❌ Failed to create Bible Bee cycles:', error.message);
		throw error;
	}
}

/**
 * Create events using direct Supabase calls
 */
async function createEventsData() {
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
			try {
				// Check if event already exists
				const { data: existing } = await client
					.from('events')
					.select('event_id')
					.eq('event_id', event.event_id)
					.single();

				if (existing) {
					console.log(`✅ Event already exists: ${event.event_id}`);
				} else {
					const { data, error } = await client
						.from('events')
						.insert(event)
						.select()
						.single();

					if (error) {
						throw new Error(`Failed to create event: ${error.message}`);
					}

					console.log(`✅ Created event: ${event.event_id} - ${event.name}`);
					counters.events++;
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to create event ${event.event_id}: ${error.message}`
				);
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
 * Create households and families using direct Supabase calls
 */
async function createHouseholdsAndFamiliesData() {
	try {
		console.log('🏠 Creating households and families...');

		// Create households using database schema format
		const householdsData = [
			{
				household_id: devSeedUuid('household', SMITH_HOUSEHOLD),
				name: SMITH_HOUSEHOLD,
				address_line1: '123 Main St',
				city: 'Anytown',
				state: 'NJ',
				zip: '12345',
				primary_phone: '555-123-4567',
				email: 'smith@example.com', // Add email field
				created_at: new Date().toISOString(),
			},
			{
				household_id: devSeedUuid('household', JOHNSON_HOUSEHOLD),
				name: JOHNSON_HOUSEHOLD,
				address_line1: '456 Oak Ave',
				city: 'Anytown',
				state: 'NJ',
				zip: '12345',
				primary_phone: '555-234-5678',
				email: 'johnson@example.com', // Add email field
				created_at: new Date().toISOString(),
			},
		];

		for (const householdData of householdsData) {
			await insertFixtureIfAbsent({
				table: 'households',
				idColumn: 'household_id',
				row: householdData,
				label: `Household: ${householdData.name}`,
				counter: 'households',
			});
		}

		// Stable by construction now, rather than whatever the inserts returned.
		const householdIds = householdsData.map((h) => h.household_id);

		// Create emergency contacts
		const emergencyContactsData = [
			{
				contact_id: devSeedUuid(
					'emergency_contact',
					SMITH_HOUSEHOLD,
					'Emergency Contact1'
				),
				household_id: householdIds[0],
				first_name: 'Emergency',
				last_name: 'Contact1',
				mobile_phone: '555-111-1111',
				relationship: 'Grandmother',
				created_at: new Date().toISOString(),
			},
			{
				contact_id: devSeedUuid(
					'emergency_contact',
					JOHNSON_HOUSEHOLD,
					'Emergency Contact2'
				),
				household_id: householdIds[1],
				first_name: 'Emergency',
				last_name: 'Contact2',
				mobile_phone: '555-222-2222',
				relationship: 'Aunt',
				created_at: new Date().toISOString(),
			},
		];

		for (const contactData of emergencyContactsData) {
			await insertFixtureIfAbsent({
				table: 'emergency_contacts',
				idColumn: 'contact_id',
				row: contactData,
				label: `Emergency contact: ${contactData.first_name} ${contactData.last_name}`,
				counter: 'emergency_contacts',
			});
		}

		// Create guardians
		const guardiansData = [
			{
				guardian_id: devSeedUuid('guardian', 'john.smith@example.com'),
				household_id: householdIds[0],
				first_name: 'John',
				last_name: 'Smith',
				email: 'john.smith@example.com',
				mobile_phone: '555-123-4567',
				relationship: 'Father',
				is_primary: true,
				created_at: new Date().toISOString(),
			},
			{
				guardian_id: devSeedUuid('guardian', 'jane.smith@example.com'),
				household_id: householdIds[0],
				first_name: 'Jane',
				last_name: 'Smith',
				email: 'jane.smith@example.com',
				mobile_phone: '555-987-6543',
				relationship: 'Mother',
				is_primary: false,
				created_at: new Date().toISOString(),
			},
			{
				guardian_id: devSeedUuid('guardian', 'bob.johnson@example.com'),
				household_id: householdIds[1],
				first_name: 'Bob',
				last_name: 'Johnson',
				email: 'bob.johnson@example.com',
				mobile_phone: '555-234-5678',
				relationship: 'Father',
				is_primary: true,
				created_at: new Date().toISOString(),
			},
			{
				guardian_id: devSeedUuid('guardian', 'mary.johnson@example.com'),
				household_id: householdIds[1],
				first_name: 'Mary',
				last_name: 'Johnson',
				email: 'mary.johnson@example.com',
				mobile_phone: '555-876-5432',
				relationship: 'Mother',
				is_primary: false,
				created_at: new Date().toISOString(),
			},
		];

		for (const guardianData of guardiansData) {
			await insertFixtureIfAbsent({
				table: 'guardians',
				idColumn: 'guardian_id',
				row: guardianData,
				label: `Guardian: ${guardianData.first_name} ${guardianData.last_name}`,
				counter: 'guardians',
			});
		}

		// Create children
		const childrenData = [
			// Smith family children
			{
				child_id: devSeedUuid('child', SMITH_HOUSEHOLD, 'Emma', 'Smith'),
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
				created_at: new Date().toISOString(),
			},
			{
				child_id: devSeedUuid('child', SMITH_HOUSEHOLD, 'Liam', 'Smith'),
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
				created_at: new Date().toISOString(),
			},
			// Johnson family children
			{
				child_id: devSeedUuid('child', JOHNSON_HOUSEHOLD, 'Sophia', 'Johnson'),
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
				created_at: new Date().toISOString(),
			},
			{
				child_id: devSeedUuid('child', JOHNSON_HOUSEHOLD, 'Noah', 'Johnson'),
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
				created_at: new Date().toISOString(),
			},
		];

		for (const childData of childrenData) {
			await insertFixtureIfAbsent({
				table: 'children',
				idColumn: 'child_id',
				row: childData,
				label: `Child: ${childData.first_name} ${childData.last_name}`,
				counter: 'children',
			});
		}

		return householdIds;
	} catch (error) {
		console.error('❌ Error creating households and families:', error.message);
		throw error;
	}
}

/**
 * Create ministry enrollments using direct Supabase calls
 */
async function createMinistryEnrollmentsData(activeCycleId) {
	try {
		console.log('📚 Creating ministry enrollments...');

		// Get children
		const { data: children, error: childrenError } = await client
			.from('children')
			.select('child_id, first_name')
			.in('first_name', ['Emma', 'Liam', 'Sophia', 'Noah']);

		if (childrenError) {
			throw new Error(`Failed to get children: ${childrenError.message}`);
		}

		if (!children || children.length === 0) {
			console.log('⚠️ No children found for enrollments');
			return;
		}

		console.log(`✅ Found ${children.length} children for enrollments`);

		// Create enrollments: all children in Sunday School, Bible Bee, and one additional ministry
		// Acolyte ministry only in Smith household for filtering test
		for (const child of children) {
			// All children in Sunday School
			try {
				const { error } = await client.from('ministry_enrollments').insert({
					enrollment_id: crypto.randomUUID(),
					child_id: child.child_id,
					ministry_id: 'min_sunday_school',
					cycle_id: activeCycleId,
					status: 'enrolled',
				});

				if (error) {
					throw new Error(
						`Failed to create Sunday School enrollment: ${error.message}`
					);
				}

				console.log(
					`✅ Created Sunday School enrollment for ${child.first_name}`
				);
				counters.ministry_enrollments++;
			} catch (error) {
				console.log(
					`⚠️ Failed to create Sunday School enrollment for ${child.first_name}: ${error.message}`
				);
			}

			// All children in Bible Bee
			try {
				const { error } = await client.from('ministry_enrollments').insert({
					enrollment_id: crypto.randomUUID(),
					child_id: child.child_id,
					ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
					cycle_id: activeCycleId,
					status: 'enrolled',
				});

				if (error) {
					throw new Error(
						`Failed to create Bible Bee enrollment: ${error.message}`
					);
				}

				console.log(`✅ Created Bible Bee enrollment for ${child.first_name}`);
				counters.ministry_enrollments++;
			} catch (error) {
				console.log(
					`⚠️ Failed to create Bible Bee enrollment for ${child.first_name}: ${error.message}`
				);
			}

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

			if (additionalMinistry) {
				try {
					const { error } = await client.from('ministry_enrollments').insert({
						enrollment_id: crypto.randomUUID(),
						child_id: child.child_id,
						ministry_id: additionalMinistry,
						cycle_id: activeCycleId,
						status: 'enrolled',
					});

					if (error) {
						throw new Error(
							`Failed to create ${additionalMinistry} enrollment: ${error.message}`
						);
					}

					console.log(
						`✅ Created ${additionalMinistry} enrollment for ${child.first_name}`
					);
					counters.ministry_enrollments++;
				} catch (error) {
					console.log(
						`⚠️ Failed to create ${additionalMinistry} enrollment for ${child.first_name}: ${error.message}`
					);
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
 * Create ministry leaders and their assignments using direct Supabase calls
 */
async function createMinistryLeadersData() {
	try {
		console.log('👤 Creating ministry leaders and assignments...');

		// Create 3 ministry leaders
		const leadersData = [
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Sarah',
				last_name: 'Lee',
				email: 'sarah.lee@example.com',
				phone: '555-123-4567',
				background_check_complete: true,
				is_active: true,
				notes: 'Primary Sunday School leader with 5 years experience',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Michael',
				last_name: 'Chen',
				email: 'michael.chen@example.com',
				phone: '555-234-5678',
				background_check_complete: true,
				is_active: true,
				notes: 'Bible Bee coordinator and youth mentor',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Jessica',
				last_name: 'Rodriguez',
				email: 'jessica.rodriguez@example.com',
				phone: '555-345-6789',
				background_check_complete: true,
				is_active: true,
				notes: 'Dance ministry director and choir assistant',
			},
		];

		// Store created leader IDs for use in assignments
		const leaderMap = {};

		// Create the leader profiles
		for (const leaderData of leadersData) {
			try {
				// Check if leader already exists
				const { data: existing } = await client
					.from('leader_profiles')
					.select('leader_id')
					.eq('email', leaderData.email)
					.single();

				if (existing) {
					console.log(
						`✅ Leader profile already exists for ${leaderData.first_name} ${leaderData.last_name}`
					);
					leaderMap[leaderData.email] = existing.leader_id;
				} else {
					const { data, error } = await client
						.from('leader_profiles')
						.insert(leaderData)
						.select()
						.single();

					if (error) {
						throw new Error(
							`Failed to create leader profile: ${error.message}`
						);
					}

					console.log(
						`✅ Created leader profile for ${leaderData.first_name} ${leaderData.last_name}`
					);
					leaderMap[leaderData.email] = data.leader_id;
					counters.leader_profiles++;
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to create leader profile for ${leaderData.first_name} ${leaderData.last_name}: ${error.message}`
				);
			}
		}

		// Create ministry assignments for each leader
		const assignmentsData = [
			// Sarah Lee - Sunday School and Joy Bells
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['sarah.lee@example.com'],
				ministry_id: 'min_sunday_school',
				role: 'PRIMARY',
				is_active: true,
				notes: 'Primary Sunday School leader',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['sarah.lee@example.com'],
				ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
				role: 'VOLUNTEER',
				is_active: true,
				notes: 'Joy Bells choir assistant',
			},
			// Michael Chen - Bible Bee and Keita Choir
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['michael.chen@example.com'],
				ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
				role: 'PRIMARY',
				is_active: true,
				notes: 'Bible Bee coordinator',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['michael.chen@example.com'],
				ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
				role: 'VOLUNTEER',
				is_active: true,
				notes: 'Keita Choir assistant',
			},
			// Jessica Rodriguez - Dance Ministry and Teen Choir
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['jessica.rodriguez@example.com'],
				ministry_id: `${EXTERNAL_ID_PREFIX}dance`,
				role: 'PRIMARY',
				is_active: true,
				notes: 'Dance ministry director',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['jessica.rodriguez@example.com'],
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
				role: 'VOLUNTEER',
				is_active: true,
				notes: 'Teen Choir assistant',
			},
		];

		// Create the assignments
		for (const assignmentData of assignmentsData) {
			try {
				// Check if assignment already exists
				const { data: existing } = await client
					.from('leader_assignments')
					.select('assignment_id')
					.eq('leader_id', assignmentData.leader_id)
					.eq('ministry_id', assignmentData.ministry_id)
					.single();

				if (existing) {
					console.log(
						`✅ Assignment already exists for leader ${assignmentData.leader_id} in ministry ${assignmentData.ministry_id}`
					);
				} else {
					const { data, error } = await client
						.from('leader_assignments')
						.insert(assignmentData)
						.select()
						.single();

					if (error) {
						throw new Error(
							`Failed to create leader assignment: ${error.message}`
						);
					}

					console.log(
						`✅ Created assignment for leader in ministry ${assignmentData.ministry_id}`
					);
					counters.leader_assignments++;
				}
			} catch (error) {
				console.log(`⚠️ Failed to create assignment: ${error.message}`);
			}
		}

		console.log('✅ Ministry leaders and assignments created successfully');
	} catch (error) {
		console.error('❌ Error creating ministry leaders:', error.message);
		throw error;
	}
}

/**
 * Create incidents using direct Supabase calls
 */
async function createIncidentsData() {
	try {
		console.log('🚨 Creating incidents for testing...');

		// Get children to create incidents for
		const { data: children, error: childrenError } = await client
			.from('children')
			.select('child_id, first_name, last_name')
			.in('first_name', ['Emma', 'Liam', 'Sophia', 'Noah']);

		if (childrenError) {
			throw new Error(`Failed to get children: ${childrenError.message}`);
		}

		if (!children || children.length === 0) {
			console.log('⚠️ No children found for incidents');
			return;
		}

		// By first name, not by array position: the query above is unordered, so
		// `children[0]` was whichever row the database happened to return first.
		const childByName = Object.fromEntries(
			children.map((child) => [child.first_name, child])
		);

		const incidentSpecs = [
			{
				child: childByName.Emma,
				severity: 'medium',
				description: 'Minor behavioral issue during Sunday School',
				timestamp: new Date().toISOString(),
			},
			{
				child: childByName.Liam,
				severity: 'high',
				description: 'Allergic reaction to snack - immediate attention required',
				timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
			},
		];

		for (const spec of incidentSpecs) {
			if (!spec.child) {
				console.log(`⚠️ Skipping incident, child not seeded: ${spec.description}`);
				continue;
			}

			const childName = `${spec.child.first_name} ${spec.child.last_name}`;

			try {
				await insertFixtureIfAbsent({
					table: 'incidents',
					idColumn: 'incident_id',
					row: {
						incident_id: devSeedUuid('incident', childName, spec.description),
						child_id: spec.child.child_id,
						child_name: childName,
						severity: spec.severity,
						description: spec.description,
						timestamp: spec.timestamp,
						admin_acknowledged_at: null, // Unacknowledged, so the admin badge has something to show
					},
					label: `Incident: ${spec.description}`,
					counter: 'incidents',
				});
			} catch (error) {
				console.log(
					`⚠️ Failed to create incident ${spec.description}: ${error.message}`
				);
			}
		}

		console.log(`✅ Created ${counters.incidents} incidents for testing`);
	} catch (error) {
		console.error('❌ Failed to create incidents:', error.message);
		throw error;
	}
}

/**
 * Door check-in state.
 *
 * Without this the door screen renders with every child "Not checked in": no
 * check-out control to inspect, and "on site 0 of M". That made it impossible
 * to validate the check-in/check-out surface locally.
 *
 * Produces a deliberate mix so all three stats cards and all three status tabs
 * have a non-trivial value:
 *
 *   Emma    - checked in, still on site
 *   Sophia  - checked in, still on site
 *   Liam    - checked in earlier and already checked out (not on site)
 *   Noah    - never checked in
 *
 * => on site 2 of 4, not checked in 2, and the two unacknowledged incidents
 *    created by createIncidentsData.
 *
 * `date` must match `getServiceDayIso()` in `src/lib/dal/utils.ts` — the church's
 * local (America/New_York) day — because `listAttendance({ date })` filters on
 * that column exactly.
 *
 * Idempotent at the level of the screen rather than the row: if today already
 * has attendance, this step does nothing.
 *
 * This was originally the only workable shape, because
 * `createHouseholdsAndFamiliesData` created a fresh Emma/Liam/Sophia/Noah on
 * every run, so "no row for this child today" stayed true forever and the state
 * inflated on each reseed. #446 fixed that, and a per-child check would now
 * work — but the day-level check is still the cheaper and more honest question
 * to ask about a screen's state, so it stays. Children are still picked
 * oldest-first per name, which keeps this correct on a dev database that was
 * already duplicated before the fix landed.
 */
async function createDoorCheckInStateData() {
	try {
		console.log('🚪 Creating door check-in state...');

		// Mirror of `getServiceDayIso()` in `src/lib/dal/utils.ts`. This script is
		// plain JS and cannot import from `src/`, so the timezone is repeated here.
		// Seeding the UTC day instead would make the seeded door state invisible on
		// the screen every evening after 8pm ET.
		const today = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'America/New_York',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(new Date());
		const EVENT_ID = 'evt_sunday_school';

		const { count: existingToday, error: countError } = await client
			.from('attendance')
			.select('attendance_id', { count: 'exact', head: true })
			.eq('date', today);

		if (countError) {
			throw new Error(`Failed to read attendance: ${countError.message}`);
		}

		if (existingToday && existingToday > 0) {
			console.log(
				`✅ Today already has ${existingToday} attendance row(s); leaving door state alone`
			);
			return;
		}

		const { data: children, error: childrenError } = await client
			.from('children')
			.select('child_id, first_name, last_name, created_at')
			.in('first_name', ['Emma', 'Liam', 'Sophia', 'Noah'])
			.order('created_at', { ascending: true });

		if (childrenError) {
			throw new Error(`Failed to get children: ${childrenError.message}`);
		}

		if (!children || children.length === 0) {
			console.log('⚠️ No children found for door check-in state');
			return;
		}

		// Oldest first, so the first occurrence of each name wins.
		const byName = new Map();
		for (const child of children) {
			if (!byName.has(child.first_name)) byName.set(child.first_name, child);
		}
		const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

		const plan = [
			{ name: 'Emma', checkInAt: minutesAgo(35), checkOutAt: null },
			{ name: 'Sophia', checkInAt: minutesAgo(18), checkOutAt: null },
			{ name: 'Liam', checkInAt: minutesAgo(95), checkOutAt: minutesAgo(12) },
		];

		for (const entry of plan) {
			const child = byName.get(entry.name);
			if (!child) {
				console.log(`⚠️ Child not found, skipping: ${entry.name}`);
				continue;
			}

			try {
				const { error } = await client.from('attendance').insert({
					attendance_id: crypto.randomUUID(),
					child_id: child.child_id,
					event_id: EVENT_ID,
					date: today,
					check_in_at: entry.checkInAt,
					check_out_at: entry.checkOutAt,
					checked_in_by: 'dev-seed',
					checked_out_by: entry.checkOutAt ? 'dev-seed' : null,
					pickup_method: entry.checkOutAt ? 'PIN' : null,
					picked_up_by: entry.checkOutAt ? 'Jane Smith' : null,
					first_time_flag: false,
				});

				if (error) {
					throw new Error(`Failed to create attendance: ${error.message}`);
				}

				const state = entry.checkOutAt ? 'checked in + out' : 'on site';
				console.log(`✅ Created attendance for ${entry.name} (${state})`);
				counters.attendance++;
			} catch (error) {
				console.log(
					`⚠️ Failed to create attendance for ${entry.name}: ${error.message}`
				);
			}
		}

		console.log(
			`✅ Created ${counters.attendance} attendance rows for the door screen`
		);
	} catch (error) {
		console.error('❌ Failed to create door check-in state:', error.message);
		throw error;
	}
}

/**
 * Main seeding function
 */
async function seedDevData() {
	try {
		console.log('🌱 Starting dev seed script...');

		// Create registration cycle first
		const activeCycleId = await createRegistrationCycleData();

		// Create ministries
		await createMinistriesData();

		// Create ministry accounts
		await createMinistryAccountsData();

		// Create ministry groups and assign choir ministries
		await createMinistryGroupsData();

		// Create ministry leaders and assignments
		await createMinistryLeadersData();

		// Create Bible Bee cycles
		await createBibleBeeCyclesData(activeCycleId);

		// Create events for check-in
		await createEventsData();

		// Create households and families
		const householdIds = await createHouseholdsAndFamiliesData();

		// Create ministry enrollments
		await createMinistryEnrollmentsData(activeCycleId);

		// Create some incidents for testing
		await createIncidentsData();

		// Check-in / check-out state so the door screen has something to show
		await createDoorCheckInStateData();

		console.log('✨ Dev seeding completed successfully!');
		console.log('📊 Summary:');
		console.log(`- ${counters.ministries} ministries created`);
		console.log(`- ${counters.ministry_accounts} ministry accounts created`);
		console.log(
			`- ${counters.registration_cycles} registration cycles created`
		);
		console.log(`- ${counters.bible_bee_years} Bible Bee cycles created`);
		console.log(`- ${counters.leader_profiles} leader profiles created`);
		console.log(`- ${counters.leader_assignments} leader assignments created`);
		console.log(`- ${counters.households} households created`);
		console.log(`- ${counters.guardians} guardians created`);
		console.log(`- ${counters.children} children created`);
		console.log(
			`- ${counters.ministry_enrollments} ministry enrollments created`
		);
		console.log(`- ${counters.events} events created`);
		console.log(`- ${counters.incidents} incidents created`);
		console.log(`- ${counters.attendance} attendance rows created`);
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
		console.log('- 3 ministry leaders with multiple assignments each');
		console.log('- Sarah Lee: Sunday School (Primary) + Joy Bells (Volunteer)');
		console.log(
			'- Michael Chen: Bible Bee (Primary) + Keita Choir (Volunteer)'
		);
		console.log(
			'- Jessica Rodriguez: Dance Ministry (Primary) + Teen Choir (Volunteer)'
		);
		console.log('- Ministry accounts created for all ministries');
		console.log('- Registration cycle set up properly');
		console.log('- All operations use direct Supabase calls');
		console.log('- All data follows canonical DTO conventions');
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

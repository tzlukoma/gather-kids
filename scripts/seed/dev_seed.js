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

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment setup
const projectRoot = path.resolve(__dirname, '../..');
const DRY_RUN = process.env.DRY_RUN === 'true';
const EXTERNAL_ID_PREFIX = 'dev_';

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
};

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
				household_id: crypto.randomUUID(),
				name: 'Smith Family',
				address_line1: '123 Main St',
				city: 'Anytown',
				state: 'NJ',
				zip: '12345',
				primary_phone: '555-123-4567',
				email: 'smith@example.com', // Add email field
				created_at: new Date().toISOString(),
			},
			{
				household_id: crypto.randomUUID(),
				name: 'Johnson Family',
				address_line1: '456 Oak Ave',
				city: 'Anytown',
				state: 'NJ',
				zip: '12345',
				primary_phone: '555-234-5678',
				email: 'johnson@example.com', // Add email field
				created_at: new Date().toISOString(),
			},
		];

		const householdIds = [];

		for (const householdData of householdsData) {
			try {
				// Check if household already exists
				const { data: existing } = await client
					.from('households')
					.select('household_id')
					.eq('household_id', householdData.household_id)
					.single();

				if (existing) {
					console.log(`✅ Household already exists: ${householdData.name}`);
					householdIds.push(existing.household_id);
				} else {
					const { data, error } = await client
						.from('households')
						.insert(householdData)
						.select()
						.single();

					if (error) {
						throw new Error(`Failed to create household: ${error.message}`);
					}

					console.log(`✅ Created household: ${householdData.name}`);
					householdIds.push(data.household_id);
					counters.households++;
				}
			} catch (error) {
				throw new Error(
					`Failed to create household ${householdData.name}: ${error.message}`
				);
			}
		}

		// Create emergency contacts
		const emergencyContactsData = [
			{
				contact_id: crypto.randomUUID(),
				household_id: householdIds[0],
				first_name: 'Emergency',
				last_name: 'Contact1',
				mobile_phone: '555-111-1111',
				relationship: 'Grandmother',
				created_at: new Date().toISOString(),
			},
			{
				contact_id: crypto.randomUUID(),
				household_id: householdIds[1],
				first_name: 'Emergency',
				last_name: 'Contact2',
				mobile_phone: '555-222-2222',
				relationship: 'Aunt',
				created_at: new Date().toISOString(),
			},
		];

		for (const contactData of emergencyContactsData) {
			try {
				const { data, error } = await client
					.from('emergency_contacts')
					.insert(contactData)
					.select()
					.single();

				if (error) {
					throw new Error(
						`Failed to create emergency contact: ${error.message}`
					);
				}

				console.log(
					`✅ Created emergency contact: ${contactData.first_name} ${contactData.last_name}`
				);
				counters.emergency_contacts++;
			} catch (error) {
				throw new Error(
					`Failed to create emergency contact ${contactData.first_name} ${contactData.last_name}: ${error.message}`
				);
			}
		}

		// Create guardians
		const guardiansData = [
			{
				guardian_id: crypto.randomUUID(),
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
				guardian_id: crypto.randomUUID(),
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
				guardian_id: crypto.randomUUID(),
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
				guardian_id: crypto.randomUUID(),
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
			try {
				const { data, error } = await client
					.from('guardians')
					.insert(guardianData)
					.select()
					.single();

				if (error) {
					throw new Error(`Failed to create guardian: ${error.message}`);
				}

				console.log(
					`✅ Created guardian: ${guardianData.first_name} ${guardianData.last_name}`
				);
				counters.guardians++;
			} catch (error) {
				throw new Error(
					`Failed to create guardian ${guardianData.first_name} ${guardianData.last_name}: ${error.message}`
				);
			}
		}

		// Create children
		const childrenData = [
			// Smith family children
			{
				child_id: crypto.randomUUID(),
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
				child_id: crypto.randomUUID(),
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
				child_id: crypto.randomUUID(),
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
				child_id: crypto.randomUUID(),
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
			try {
				const { data, error } = await client
					.from('children')
					.insert(childData)
					.select()
					.single();

				if (error) {
					throw new Error(`Failed to create child: ${error.message}`);
				}

				console.log(
					`✅ Created child: ${childData.first_name} ${childData.last_name}`
				);
				counters.children++;
			} catch (error) {
				throw new Error(
					`Failed to create child ${childData.first_name} ${childData.last_name}: ${error.message}`
				);
			}
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

		const incidentsData = [
			{
				incident_id: crypto.randomUUID(),
				child_id: children[0].child_id,
				child_name: `${children[0].first_name} ${children[0].last_name}`,
				severity: 'medium',
				description: 'Minor behavioral issue during Sunday School',
				timestamp: new Date().toISOString(),
				admin_acknowledged_at: null, // Unacknowledged incident
			},
			{
				incident_id: crypto.randomUUID(),
				child_id: children[1].child_id,
				child_name: `${children[1].first_name} ${children[1].last_name}`,
				severity: 'high',
				description:
					'Allergic reaction to snack - immediate attention required',
				timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
				admin_acknowledged_at: null, // Unacknowledged incident
			},
		];

		for (const incidentData of incidentsData) {
			try {
				const { data, error } = await client
					.from('incidents')
					.insert(incidentData)
					.select()
					.single();

				if (error) {
					throw new Error(`Failed to create incident: ${error.message}`);
				}

				console.log(`✅ Created incident: ${incidentData.description}`);
				counters.incidents++;
			} catch (error) {
				console.log(
					`⚠️ Failed to create incident ${incidentData.description}: ${error.message}`
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

		console.log('✨ Dev seeding completed successfully!');
		console.log('📊 Summary:');
		console.log(`- ${counters.ministries} ministries created`);
		console.log(`- ${counters.ministry_accounts} ministry accounts created`);
		console.log(
			`- ${counters.registration_cycles} registration cycles created`
		);
		console.log(`- ${counters.bible_bee_years} Bible Bee cycles created`);
		console.log(`- ${counters.households} households created`);
		console.log(`- ${counters.guardians} guardians created`);
		console.log(`- ${counters.children} children created`);
		console.log(
			`- ${counters.ministry_enrollments} ministry enrollments created`
		);
		console.log(`- ${counters.events} events created`);
		console.log(`- ${counters.incidents} incidents created`);
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

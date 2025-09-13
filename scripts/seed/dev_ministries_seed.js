/**
 * Dev Ministries Seed Script for gatherKids
 *
 * Seeds the development database with a comprehensive set of ministries for testing all registration flow edge cases.
 * This includes ministries with custom questions, age restrictions, custom consent types, and different enrollment types.
 *
 * Features tested:
 * - Custom questions (Teen Fellowship with 3 checkbox questions)
 * - Age restrictions (Joy Bells: 4-8, Keita Choir: 9-12, Teen Choir: 13-18)
 * - Custom consent text (New Jersey Orators)
 * - Different enrollment types (enrolled vs expressed_interest)
 * - Communicate later flag (for future ministries)
 * - Open/close dates (Bible Bee with registration window)
 * - Ministry groups (Choirs group with all three youth choirs, Music group with all music ministries)
 *
 * Usage:
 *   npm run seed:dev:ministries
 *   DRY_RUN=true npm run seed:dev:ministries
 */

import { createClient } from '@supabase/supabase-js';

// Environment setup
const DRY_RUN = process.env.DRY_RUN === 'true';
const EXTERNAL_ID_PREFIX = 'dev-';

// Global counters for tracking what was created
const counters = {
	ministries: 0,
	registration_cycles: 0,
	ministry_groups: 0,
	ministry_group_members: 0,
};

// Create Supabase client
async function initSupabase() {
	// Fetch configuration from environment
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
		);
	}

	// Initialize Supabase client with service role key
	const supabase = createClient(supabaseUrl, supabaseKey, {
		auth: { persistSession: false },
	});

	return supabase;
}

async function seedRegistrationCycles() {
	console.log('🌱 Seeding registration cycles...');

	try {
		const supabase = await initSupabase();

		// Define registration cycles
		const cyclesData = [
			{
				cycle_id: '2025',
				name: '2025-2026 Registration',
				start_date: '2025-06-01T00:00:00.000Z',
				end_date: '2026-05-31T23:59:59.999Z',
				description: 'Registration for the 2025-2026 ministry year',
				is_active: true,
			},
			{
				cycle_id: '2024',
				name: '2024-2025 Registration',
				start_date: '2024-06-01T00:00:00.000Z',
				end_date: '2025-05-31T23:59:59.999Z',
				description: 'Registration for the 2024-2025 ministry year',
				is_active: false,
			},
		];

		// Insert registration cycles
		for (const cycleData of cyclesData) {
			try {
				if (DRY_RUN) {
					console.log(`[DRY RUN] Accessing table: registration_cycles`);
					console.log(
						`[DRY RUN] INSERT INTO registration_cycles: ${JSON.stringify(
							cycleData,
							null,
							2
						)}`
					);
					console.log(`✅ Would create registration cycle: ${cycleData.name}`);
					counters.registration_cycles++;
					continue;
				}

				const { data: existing, error: checkError } = await supabase
					.from('registration_cycles')
					.select('cycle_id')
					.eq('cycle_id', cycleData.cycle_id)
					.single();

				if (checkError && checkError.code !== 'PGRST116') {
					console.log(
						`⚠️ Error checking cycle ${cycleData.name}: ${checkError.message}`
					);
					// Continue with insertion attempt rather than throwing error
				}

				if (existing) {
					console.log(
						`🔄 Registration cycle already exists: ${cycleData.name}`
					);
					// Update the cycle to ensure it has the right properties
					const { error: updateError } = await supabase
						.from('registration_cycles')
						.update({
							name: cycleData.name,
							start_date: cycleData.start_date,
							end_date: cycleData.end_date,
							description: cycleData.description,
							is_active: cycleData.is_active,
						})
						.eq('cycle_id', cycleData.cycle_id);

					if (updateError) {
						console.log(
							`⚠️ Failed to update registration cycle ${cycleData.name}: ${updateError.message}`
						);
					} else {
						console.log(`✅ Updated registration cycle: ${cycleData.name}`);
					}
				} else {
					const { error: insertError } = await supabase
						.from('registration_cycles')
						.insert(cycleData);

					if (insertError) {
						console.log(
							`⚠️ Failed to create registration cycle ${cycleData.name}: ${insertError.message}`
						);
					} else {
						console.log(`✅ Created registration cycle: ${cycleData.name}`);
						counters.registration_cycles++;
					}
				}
			} catch (error) {
				console.log(
					`⚠️ Unexpected error with registration cycle ${cycleData.name}: ${error.message}`
				);
			}
		}

		console.log(
			`✅ Registration cycles seeded: ${counters.registration_cycles} created`
		);
	} catch (error) {
		console.error('❌ Error seeding registration cycles:', error);
		process.exit(1);
	}
}

async function seedMinistries() {
	console.log('🌱 Seeding ministries for development testing...');

	try {
		const supabase = await initSupabase();

		// Define ministries for development testing - comprehensive set from UAT
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
				ministry_id: `${EXTERNAL_ID_PREFIX}bible-bee`,
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

			// Enrolled ministries
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
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}media_production`,
				name: 'Media Production Ministry',
				code: 'media-production',
				enrollment_type: 'enrolled',
				details:
					"Thank you for registering for the Media Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}mentoring_boys`,
				name: 'Mentoring Ministry-Boys (Khalfani)',
				code: 'mentoring-boys',
				enrollment_type: 'enrolled',
				details:
					'The Khalfani ministry provides mentorship for young boys through various activities and discussions.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}mentoring_girls`,
				name: 'Mentoring Ministry-Girls (Nailah)',
				code: 'mentoring-girls',
				enrollment_type: 'enrolled',
				details:
					'The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth.',
				data_profile: 'Basic',
				is_active: true,
			},

			// Teen Fellowship with custom questions
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_fellowship`,
				name: 'New Generation Teen Fellowship',
				code: 'teen-fellowship',
				enrollment_type: 'enrolled',
				details:
					'Thank you for registering for New Generation Teen Fellowship.\n\nOn 3rd Sundays, during the 10:30 AM service, New Generation Teen Fellowship will host Teen Church in the Family Life Enrichment Center. Teens may sign themselves in and out of the service.\n\nYou will receive more information about ministry activities from minstry leaders.',
				data_profile: 'Basic',
				custom_questions: [
					{
						id: 'teen_podcast',
						text: 'Podcast & YouTube Channel Projects',
						type: 'checkbox',
					},
					{
						id: 'teen_social_media',
						text: 'Social Media Team',
						type: 'checkbox',
					},
					{
						id: 'teen_community_service',
						text: 'Leading Community Service Projects',
						type: 'checkbox',
					},
				],
				is_active: true,
			},

			// Music ministries with age restrictions
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}symphonic_orchestra`,
				name: 'Symphonic Orchestra',
				code: 'symphonic-orchestra',
				enrollment_type: 'enrolled',
				data_profile: 'Basic',
				details:
					'The Symphonic Orchestra is for experienced musicians. Auditions may be required.',
				is_active: true,
			},
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

			// Other enrolled ministries
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}youth_ushers`,
				name: 'Youth Ushers',
				code: 'youth-ushers',
				enrollment_type: 'enrolled',
				details:
					"Thank you for registering for the Youth Ushers Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
				data_profile: 'Basic',
				is_active: true,
			},

			// Interest-only ministries (expressed_interest)
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}childrens_musical`,
				name: "Children's Musical",
				code: 'childrens-musical',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				communicate_later: true,
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}confirmation`,
				name: 'Confirmation',
				code: 'confirmation',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				communicate_later: true,
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}international_travel`,
				name: 'International Travel',
				code: 'international-travel',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}nursery`,
				name: 'Nursery',
				code: 'nursery',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				communicate_later: true,
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}vbs`,
				name: 'Vacation Bible School',
				code: 'vbs',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				communicate_later: true,
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}college_tour`,
				name: 'College Tour',
				code: 'college-tour',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				is_active: true,
			},

			// Ministry with custom consent
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}orators`,
				name: 'New Jersey Orators',
				code: 'orators',
				enrollment_type: 'expressed_interest',
				data_profile: 'Basic',
				optional_consent_text:
					'I agree to share my contact information with New Jersey Orators. New Jersey Orators is not a part of Cathedral International, but Cathedral hosts the Perth Amboy Chapter. Registration can take place through their website at oratorsinc.org.',
				is_active: true,
			},
		];

		// Insert ministries
		for (const ministryData of ministriesData) {
			try {
				if (DRY_RUN) {
					console.log(`[DRY RUN] Accessing table: ministries`);
					console.log(
						`[DRY RUN] INSERT INTO ministries: ${JSON.stringify(
							ministryData,
							null,
							2
						)}`
					);
					console.log(`✅ Would create ministry: ${ministryData.name}`);
					counters.ministries++;
					continue;
				}

				const { data: existing, error: checkError } = await supabase
					.from('ministries')
					.select('ministry_id')
					.eq('ministry_id', ministryData.ministry_id)
					.single();

				if (checkError && checkError.code !== 'PGRST116') {
					console.log(
						`⚠️ Error checking ministry ${ministryData.name}: ${checkError.message}`
					);
					// Continue with insertion attempt rather than throwing error
				}

				if (existing) {
					console.log(`🔄 Ministry already exists: ${ministryData.name}`);
					// Update the ministry to ensure it's active and has the right properties
					const { error: updateError } = await supabase
						.from('ministries')
						.update({
							name: ministryData.name,
							code: ministryData.code,
							enrollment_type: ministryData.enrollment_type,
							description: ministryData.description,
							details: ministryData.details,
							data_profile: ministryData.data_profile,
							is_active: true,
						})
						.eq('ministry_id', ministryData.ministry_id);

					if (updateError) {
						console.log(
							`⚠️ Failed to update ministry ${ministryData.name}: ${updateError.message}`
						);
					} else {
						console.log(`✅ Updated ministry: ${ministryData.name}`);
					}
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
			} catch (error) {
				console.log(
					`⚠️ Unexpected error with ministry ${ministryData.name}: ${error.message}`
				);
			}
		}

		console.log(`✅ Ministries seeded: ${counters.ministries} created`);
	} catch (error) {
		console.error('❌ Error seeding ministries:', error);
		process.exit(1);
	}
}

async function seedMinistryGroups() {
	console.log('🌱 Seeding ministry groups...');

	try {
		const supabase = await initSupabase();

		// Create ministry groups
		const groupsData = [
			{
				id: `${EXTERNAL_ID_PREFIX}choirs-group`,
				code: 'choirs',
				name: 'Choirs',
				description:
					'Youth choir ministries grouped together for shared management and notifications',
				custom_consent_text:
					'Cathedral International youth choirs communicate using the Planning Center app. By clicking yes, you agree to be added into the app, which will enable you to download the app, receive emails and push communications.',
				custom_consent_required: true,
			},
			{
				id: `${EXTERNAL_ID_PREFIX}music-group`,
				code: 'music',
				name: 'Music Ministries',
				description:
					'All music-related ministries including choirs and orchestra',
				custom_consent_text: '',
				custom_consent_required: false,
			},
		];

		for (const groupData of groupsData) {
			if (DRY_RUN) {
				console.log(`[DRY RUN] Would create ministry group: ${groupData.name}`);
				counters.ministry_groups++;
			} else {
				const { error } = await supabase
					.from('ministry_groups')
					.upsert(groupData, { onConflict: 'id' });

				if (error) {
					console.error(
						`Error creating ministry group ${groupData.name}:`,
						error
					);
					throw error;
				}
				console.log(`✅ Created ministry group: ${groupData.name}`);
				counters.ministry_groups++;
			}
		}

		// Assign ministries to groups
		const groupMemberships = [
			// Choirs group - all three youth choirs
			{
				group_id: `${EXTERNAL_ID_PREFIX}choirs-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
			},
			{
				group_id: `${EXTERNAL_ID_PREFIX}choirs-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
			},
			{
				group_id: `${EXTERNAL_ID_PREFIX}choirs-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
			},
			// Music group - all music ministries
			{
				group_id: `${EXTERNAL_ID_PREFIX}music-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}symphonic_orchestra`,
			},
			{
				group_id: `${EXTERNAL_ID_PREFIX}music-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
			},
			{
				group_id: `${EXTERNAL_ID_PREFIX}music-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
			},
			{
				group_id: `${EXTERNAL_ID_PREFIX}music-group`,
				ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
			},
		];

		for (const membership of groupMemberships) {
			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would assign ministry ${membership.ministry_id} to group ${membership.group_id}`
				);
				counters.ministry_group_members++;
			} else {
				const { error } = await supabase
					.from('ministry_group_members')
					.upsert(membership, { onConflict: 'group_id,ministry_id' });

				if (error) {
					console.error(`Error assigning ministry to group:`, error);
					throw error;
				}
				counters.ministry_group_members++;
			}
		}

		console.log(`✅ Created ${counters.ministry_groups} ministry groups`);
		console.log(
			`✅ Created ${counters.ministry_group_members} ministry group memberships`
		);
	} catch (error) {
		console.error('❌ Error seeding ministry groups:', error);
		throw error;
	}
}

// Run the seeding process
async function runSeeding() {
	console.log('🚀 Starting ministry development seed script');

	if (DRY_RUN) {
		console.log('🔍 DRY RUN MODE: No changes will be made to the database');
	}

	try {
		// First seed registration cycles since they might be referenced by other data
		await seedRegistrationCycles();

		// Then seed ministries
		await seedMinistries();

		// Finally seed ministry groups and assign ministries to them
		await seedMinistryGroups();

		console.log('✨ Dev seeding completed successfully!');
		console.log('📊 Summary:');
		console.log('- 20+ ministries with various enrollment types');
		console.log('- Custom questions for Teen Fellowship testing');
		console.log('- Age restrictions for choir ministries');
		console.log('- Custom consent text for New Jersey Orators');
		console.log('- Registration window testing for Bible Bee');
		console.log('- Both enrolled and expressed_interest ministries');
		console.log('- Ministry groups with three youth choirs grouped together');
		console.log('- Music ministries grouped for shared management');
	} catch (error) {
		console.error('❌ Seeding failed:', error);
		process.exit(1);
	}
}
runSeeding();

#!/usr/bin/env node

/**
 * Production Ministry Seeding Script
 *
 * This script creates ministries in the production database using the same
 * app functions as the frontend, ensuring proper auto-generated IDs and
 * data consistency. Email fields are left blank for manual entry through the UI.
 *
 * Usage:
 *   node scripts/seed/prod_ministries.js
 *
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL: Production Supabase URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Production service role key
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   NEXT_PUBLIC_SUPABASE_URL');
	console.error('   SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Ministry data - same as UAT but without external_id prefixes and with blank emails
const ministriesData = [
	{
		name: 'Sunday School',
		code: 'min_sunday_school',
		enrollment_type: 'enrolled',
		data_profile: 'SafetyAware',
		is_active: true,
	},
	{
		name: 'Acolyte Ministry',
		code: 'acolyte',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Bible Bee',
		code: 'bible-bee',
		enrollment_type: 'enrolled',
		description: 'Registration open until Oct. 8, 2023',
		open_at: '2025-01-01',
		close_at: '2025-10-08',
		details:
			'Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately.',
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Dance Ministry',
		code: 'dance',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Media Production Ministry',
		code: 'media-production',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for the Media Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Mentoring Ministry-Boys (Khalfani)',
		code: 'mentoring-boys',
		enrollment_type: 'enrolled',
		details:
			'The Khalfani ministry provides mentorship for young boys through various activities and discussions.',
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Mentoring Ministry-Girls (Nailah)',
		code: 'mentoring-girls',
		enrollment_type: 'enrolled',
		details:
			'The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth.',
		data_profile: 'Basic',
		is_active: true,
	},
	{
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
		is_active: false, // Inactive as requested
	},
	{
		name: 'Symphonic Orchestra',
		code: 'symphonic-orchestra',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for the Symphonic Orchestra.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Youth Choirs- Joy Bells (Ages 4-8)',
		code: 'choir-joy-bells',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for Joy Bells.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		min_age: 4,
		max_age: 8,
		is_active: true,
	},
	{
		name: 'Youth Choirs- Keita Praise Choir (Ages 9-12)',
		code: 'choir-keita-praise',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for Keita Praise Choir.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		min_age: 9,
		max_age: 12,
		is_active: true,
	},
	{
		name: 'Youth Choirs- New Generation Teen Choir (Ages 13-18)',
		code: 'choir-teen-choir',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for New Generation Teen Choir.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		min_age: 13,
		max_age: 18,
		is_active: true,
	},
	{
		name: 'Youth Ushers',
		code: 'youth-ushers',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for Youth Ushers.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: "Children's Musical",
		code: 'childrens-musical',
		enrollment_type: 'enrolled',
		details:
			"Thank you for registering for Children's Musical.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Confirmation',
		code: 'confirmation',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		communicate_later: true,
		is_active: true,
	},
	{
		name: 'International Travel',
		code: 'international-travel',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		is_active: false, // Inactive as requested
	},
	{
		name: 'New Jersey Orators',
		code: 'orators',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		optional_consent_text:
			'I agree to share my contact information with New Jersey Orators. New Jersey Orators is not a part of Cathedral International, but Cathedral hosts the Perth Amboy Chapter. Registration can take place through their website at oratorsinc.org.',
		is_active: true,
	},
	{
		name: 'Nursery',
		code: 'nursery',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		communicate_later: true,
		is_active: true,
	},
	{
		name: 'Vacation Bible School',
		code: 'vbs',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		communicate_later: true,
		is_active: true,
	},
	{
		name: 'College Tour',
		code: 'college-tour',
		enrollment_type: 'expressed_interest',
		data_profile: 'Basic',
		communicate_later: true,
		is_active: true,
	},
];

// Counters for tracking progress
const counters = {
	ministries: 0,
	skipped: 0,
	errors: 0,
	events: 0,
	ministry_groups: 0,
	ministry_group_members: 0,
};

/**
 * Create ministries using direct Supabase calls
 */
async function createMinistries() {
	console.log('📋 Starting ministry creation for production...');
	console.log(`📊 Found ${ministriesData.length} ministries to process`);

	// Validate schema first
	console.log('🔍 Validating ministries table schema...');
	const { data: columns, error: schemaError } = await supabase
		.rpc('get_table_columns', { table_name: 'ministries' })
		.single();

	if (schemaError) {
		// Fallback: check if we can query the table
		const { error: testError } = await supabase
			.from('ministries')
			.select('*')
			.limit(1);

		if (testError) {
			console.error('❌ Cannot access ministries table:', testError.message);
			throw new Error(`Schema validation failed: ${testError.message}`);
		}
		console.log('✅ Ministries table is accessible');
	} else {
		console.log('✅ Schema validation passed');
	}

	if (DRY_RUN) {
		console.log('🧪 DRY RUN MODE - No changes will be made');
		console.log('===============================================');
	}

	for (const ministryData of ministriesData) {
		try {
			// Check if ministry already exists by code
			const { data: existing } = await supabase
				.from('ministries')
				.select('ministry_id, name')
				.eq('code', ministryData.code)
				.single();

			if (existing) {
				console.log(
					`⏭️  Ministry already exists: ${ministryData.name} (${ministryData.code})`
				);
				counters.skipped++;
				continue;
			}

			if (DRY_RUN) {
				console.log(`[DRY RUN] Would create ministry: ${ministryData.name}`);
				console.log(`[DRY RUN] Code: ${ministryData.code}`);
				console.log(`[DRY RUN] Active: ${ministryData.is_active}`);
				console.log(
					`[DRY RUN] Enrollment Type: ${ministryData.enrollment_type}`
				);
				console.log(`[DRY RUN] Data Profile: ${ministryData.data_profile}`);
				if (ministryData.min_age && ministryData.max_age) {
					console.log(
						`[DRY RUN] Age Range: ${ministryData.min_age}-${ministryData.max_age}`
					);
				}
				if (ministryData.custom_questions) {
					console.log(
						`[DRY RUN] Custom Questions: ${ministryData.custom_questions.length} questions`
					);
				}
				console.log(
					`[DRY RUN] Ministry account would be created manually through UI`
				);
				console.log('---');
				counters.ministries++;
				continue;
			}

			// Create ministry using direct Supabase call
			console.log(`🔄 Creating ministry: ${ministryData.name}...`);

			// Generate a unique ministry_id
			const ministryId = `min_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;

			// Prepare data for insertion
			const insertData = {
				ministry_id: ministryId,
				name: ministryData.name,
				code: ministryData.code,
				enrollment_type: ministryData.enrollment_type,
				data_profile: ministryData.data_profile,
				is_active: ministryData.is_active,
				created_at: new Date().toISOString(),
			};

			// Add optional fields if they exist
			if (ministryData.description)
				insertData.description = ministryData.description;
			if (ministryData.details) insertData.details = ministryData.details;
			if (ministryData.open_at) insertData.open_at = ministryData.open_at;
			if (ministryData.close_at) insertData.close_at = ministryData.close_at;
			if (ministryData.min_age) insertData.min_age = ministryData.min_age;
			if (ministryData.max_age) insertData.max_age = ministryData.max_age;
			if (ministryData.custom_questions)
				insertData.custom_questions = ministryData.custom_questions;
			if (ministryData.communicate_later !== undefined)
				insertData.communicate_later = ministryData.communicate_later;
			if (ministryData.optional_consent_text)
				insertData.optional_consent_text = ministryData.optional_consent_text;

			const { data: newMinistry, error: createError } = await supabase
				.from('ministries')
				.insert(insertData)
				.select('ministry_id')
				.single();

			if (createError) {
				throw new Error(`Database error: ${createError.message}`);
			}

			console.log(
				`✅ Created ministry: ${ministryData.name} (ID: ${ministryId})`
			);
			counters.ministries++;

			// Note: We intentionally do NOT create ministry accounts here
			// Email fields are left blank for manual entry through the UI
			console.log(
				`📝 Ministry account will be created manually through UI for: ${ministryData.name}`
			);
		} catch (error) {
			console.error(
				`❌ Failed to create ministry ${ministryData.name}:`,
				error.message
			);
			counters.errors++;
		}
	}
}

/**
 * Create events for check-in functionality
 */
async function createEvents() {
	try {
		console.log('🎪 Creating events for check-in functionality...');

		// Define the events that the check-in system expects
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
			// Check if event already exists
			const { data: existing, error: checkError } = await supabase
				.from('events')
				.select('event_id')
				.eq('event_id', event.event_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking event ${event.event_id}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(`✅ Event already exists: ${event.event_id}`);
			} else {
				if (DRY_RUN) {
					console.log(
						`[DRY RUN] Would create event: ${event.name} (${event.event_id})`
					);
					counters.events++;
				} else {
					const { error: insertError } = await supabase
						.from('events')
						.insert(event);

					if (insertError) {
						throw new Error(
							`Failed to create event ${event.event_id}: ${insertError.message}`
						);
					}

					console.log(`✅ Created event: ${event.name} (${event.event_id})`);
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
 * Create ministry groups and assign choir ministries
 */
async function createMinistryGroups() {
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
			email: '', // Left blank for manual entry through UI
			custom_consent_text:
				'Cathedral International youth choirs communicate using the Planning Center app. By clicking yes, you agree to be added into the app, which will enable you to download the app, receive emails and push communications.',
			custom_consent_required: true,
		};

		// Check if group already exists
		const { data: existingGroup } = await supabase
			.from('ministry_groups')
			.select('id')
			.eq('code', 'choirs')
			.single();

		let groupId;
		if (existingGroup) {
			console.log('✅ Ministry group already exists: Choirs');
			groupId = existingGroup.id;
		} else {
			if (DRY_RUN) {
				console.log('[DRY RUN] Would create ministry group: Choirs');
				console.log('[DRY RUN] Code: choirs');
				console.log('[DRY RUN] Custom consent required: true');
				console.log('[DRY RUN] Email: (blank - to be set manually)');
				counters.ministry_groups++;
			} else {
				const { data, error } = await supabase
					.from('ministry_groups')
					.insert(groupData)
					.select('id')
					.single();

				if (error) {
					throw new Error(`Failed to create ministry group: ${error.message}`);
				}

				console.log('✅ Created ministry group: Choirs');
				groupId = data.id;
				counters.ministry_groups++;
			}
		}

		// Assign choir ministries to the group
		const choirMinistries = [
			'choir-joy-bells',
			'choir-keita-praise',
			'choir-teen-choir',
		];

		for (const ministryCode of choirMinistries) {
			try {
				// Get the ministry_id for this code
				const { data: ministry, error: ministryError } = await supabase
					.from('ministries')
					.select('ministry_id')
					.eq('code', ministryCode)
					.single();

				if (ministryError) {
					console.log(
						`⚠️ Ministry not found: ${ministryCode} - skipping group assignment`
					);
					continue;
				}

				// Check if membership already exists
				const { data: existingMembership } = await supabase
					.from('ministry_group_members')
					.select('group_id')
					.eq('group_id', groupId)
					.eq('ministry_id', ministry.ministry_id)
					.single();

				if (existingMembership) {
					console.log(
						`✅ Ministry ${ministryCode} already assigned to Choirs group`
					);
				} else {
					if (DRY_RUN) {
						console.log(
							`[DRY RUN] Would assign ${ministryCode} to Choirs group`
						);
						counters.ministry_group_members++;
					} else {
						const { error } = await supabase
							.from('ministry_group_members')
							.insert({
								group_id: groupId,
								ministry_id: ministry.ministry_id,
							});

						if (error) {
							throw new Error(
								`Failed to assign ministry to group: ${error.message}`
							);
						}

						console.log(`✅ Assigned ${ministryCode} to Choirs group`);
						counters.ministry_group_members++;
					}
				}
			} catch (error) {
				console.log(
					`⚠️ Failed to assign ${ministryCode} to Choirs group: ${error.message}`
				);
			}
		}
	} catch (error) {
		console.error('❌ Error creating ministry groups:', error.message);
		throw error;
	}
}

/**
 * Main execution function
 */
async function main() {
	console.log('🚀 Starting Production Ministry Seeding...');
	console.log('📡 Connecting to:', supabaseUrl);
	console.log('🔑 Using service role key');
	if (DRY_RUN) {
		console.log('🧪 DRY RUN MODE - No changes will be made');
	}
	console.log('');

	try {
		await createMinistries();
		await createMinistryGroups();
		await createEvents();

		console.log('');
		console.log('📊 Summary:');
		if (DRY_RUN) {
			console.log(`   🧪 Would create ministries: ${counters.ministries}`);
			console.log(
				`   🧪 Would create ministry groups: ${counters.ministry_groups}`
			);
			console.log(
				`   🧪 Would create ministry group members: ${counters.ministry_group_members}`
			);
			console.log(`   🧪 Would create events: ${counters.events}`);
			console.log(
				`   ⏭️  Ministries skipped (already exist): ${counters.skipped}`
			);
			console.log(`   ❌ Errors: ${counters.errors}`);
		} else {
			console.log(`   ✅ Ministries created: ${counters.ministries}`);
			console.log(`   ✅ Ministry groups created: ${counters.ministry_groups}`);
			console.log(
				`   ✅ Ministry group members created: ${counters.ministry_group_members}`
			);
			console.log(`   ✅ Events created: ${counters.events}`);
			console.log(
				`   ⏭️  Ministries skipped (already exist): ${counters.skipped}`
			);
			console.log(`   ❌ Errors: ${counters.errors}`);
		}
		console.log('');
		console.log('📝 Next Steps:');
		console.log('   1. Log into the production admin interface');
		console.log('   2. Navigate to Ministries page');
		console.log('   3. Add email addresses for each ministry through the UI');
		console.log('   4. Navigate to Ministry Groups page');
		console.log('   5. Add email address for the Choirs ministry group');
		console.log('   6. Assign ministry leaders as needed');
		console.log('   7. Events for check-in functionality have been created');
		console.log('');
		if (DRY_RUN) {
			console.log('🧪 Dry run completed successfully!');
		} else {
			console.log('✅ Production ministry seeding completed successfully!');
		}
	} catch (error) {
		console.error('❌ FATAL ERROR:', error.message);
		console.error('Stack trace:', error.stack);
		process.exit(1);
	}
}

// Run the script
main().catch((error) => {
	console.error('❌ Unhandled error:', error);
	process.exit(1);
});

export { createMinistries, createMinistryGroups, createEvents, ministriesData };

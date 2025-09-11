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
import { v4 as uuidv4 } from 'uuid';

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
		code: 'joy-bells',
		enrollment_type: 'enrolled',
		min_age: 4,
		max_age: 8,
		details:
			"Thank you for registering for Joy Bells.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Youth Choirs- Keita Praise Choir (Ages 9-12)',
		code: 'keita-praise',
		enrollment_type: 'enrolled',
		min_age: 9,
		max_age: 12,
		details:
			"Thank you for registering for Keita Praise Choir.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
		is_active: true,
	},
	{
		name: 'Youth Choirs- New Generation Teen Choir (Ages 13-18)',
		code: 'teen-choir',
		enrollment_type: 'enrolled',
		min_age: 13,
		max_age: 18,
		details:
			"Thank you for registering for New Generation Teen Choir.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
		data_profile: 'Basic',
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
};

/**
 * Create ministries using the app's DAL functions
 */
async function createMinistries() {
	console.log('📋 Starting ministry creation for production...');
	console.log(`📊 Found ${ministriesData.length} ministries to process`);

	// Validate database schema before proceeding
	console.log('🔍 Validating database schema...');
	try {
		const { data: schemaTest, error: schemaError } = await supabase
			.from('ministries')
			.select('code, close_at, data_profile, enrollment_type, min_age, max_age')
			.limit(1);

		if (schemaError) {
			console.error('❌ Database schema validation failed:');
			console.error('   Error:', schemaError.message);
			console.error('💡 The ministries table is missing required columns.');
			console.error(
				'   Please run the migration: 20250110000000_ensure_ministries_schema_complete.sql'
			);
			console.error(
				'   Or contact the database administrator to apply missing migrations.'
			);
			throw new Error('Schema validation failed');
		}

		console.log('✅ Database schema validation passed');
	} catch (err) {
		console.error('❌ Failed to validate database schema:', err.message);
		throw err;
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
						`[DRY RUN] Age Range: ${ministryData.min_age}-${ministryData.max_age} years old`
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

			// Create ministry using direct Supabase insert
			console.log(`🔄 Creating ministry: ${ministryData.name}...`);

			const ministry = {
				...ministryData,
				ministry_id: uuidv4(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			const { data: result, error } = await supabase
				.from('ministries')
				.insert(ministry)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Error creating ministry ${ministryData.name}:`,
					error.message
				);

				// Provide helpful guidance for schema issues
				if (
					error.message.includes('column') &&
					error.message.includes('does not exist')
				) {
					console.error('💡 This appears to be a database schema issue.');
					console.error('   The ministries table is missing required columns.');
					console.error(
						'   Please run the migration: 20250110000000_ensure_ministries_schema_complete.sql'
					);
					console.error(
						'   Or contact the database administrator to apply missing migrations.'
					);
				}

				counters.errors++;
				continue;
			}

			const ministryId = result.ministry_id;
			let successMessage = `✅ Created ministry: ${ministryData.name} (ID: ${ministryId})`;
			if (ministryData.min_age && ministryData.max_age) {
				successMessage += ` - Age Range: ${ministryData.min_age}-${ministryData.max_age} years old`;
			}
			console.log(successMessage);
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

		console.log('');
		console.log('📊 Summary:');
		if (DRY_RUN) {
			console.log(`   🧪 Would create ministries: ${counters.ministries}`);
			console.log(
				`   ⏭️  Ministries skipped (already exist): ${counters.skipped}`
			);
			console.log(`   ❌ Errors: ${counters.errors}`);
		} else {
			console.log(`   ✅ Ministries created: ${counters.ministries}`);
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
		console.log('   4. Assign ministry leaders as needed');
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

export { createMinistries, ministriesData };

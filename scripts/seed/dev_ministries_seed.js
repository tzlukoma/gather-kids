#!/usr/bin/env node
/**
 * Dev Ministries Seed Script for gatherKids
 *
 * Seeds the development database with a minimal set of ministries for testing registration flow.
 * This is specifically for testing the snake_case schema changes in the registration flow.
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

async function seedMinistries() {
	console.log('🌱 Seeding ministries for development testing...');

	try {
		const supabase = await initSupabase();

		// Define ministries for development testing
		const ministriesData = [
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}bible-bee`,
				name: 'Bible Bee',
				code: 'bible-bee',
				enrollment_type: 'enrolled',
				description: 'Registration open for testing',
				details:
					'Bible Bee is a competitive program that encourages scripture memorization.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}sunday-school`,
				name: 'Sunday School',
				code: 'min-sunday-school',
				enrollment_type: 'enrolled',
				data_profile: 'SafetyAware',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}youth-group`,
				name: 'Youth Group',
				code: 'youth-group',
				enrollment_type: 'enrolled',
				details: 'Weekly meetings for teenagers to learn and grow together.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}vacation-bible-school`,
				name: 'Vacation Bible School',
				code: 'vbs',
				enrollment_type: 'enrolled',
				description: 'Summer program for kids',
				details:
					'A week-long summer program filled with Bible stories, crafts, and fun activities.',
				data_profile: 'Basic',
				is_active: true,
			},
			{
				ministry_id: `${EXTERNAL_ID_PREFIX}childrens-choir`,
				name: "Children's Choir",
				code: 'childrens-choir',
				enrollment_type: 'enrolled',
				details:
					'For children who love to sing and perform in church services.',
				data_profile: 'Basic',
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

// Run the seeding process
async function runSeeding() {
	console.log('🚀 Starting ministry development seed script');

	if (DRY_RUN) {
		console.log('🔍 DRY RUN MODE: No changes will be made to the database');
	}

	try {
		await seedMinistries();
		console.log('✨ Dev ministries seeding completed successfully!');
	} catch (error) {
		console.error('❌ Seeding failed:', error);
		process.exit(1);
	}
}

runSeeding();

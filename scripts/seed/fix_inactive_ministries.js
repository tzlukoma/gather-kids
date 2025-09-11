#!/usr/bin/env node

/**
 * Fix Inactive Ministries Script
 *
 * This script updates the ministries that should be inactive in the UAT database.
 * It's a one-time fix for ministries that were created as active but should be inactive.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
const supabaseServiceKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_UAT_URL');
	console.error(
		'   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_UAT_SERVICE_ROLE_KEY'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Ministries that should be inactive
const ministriesToDeactivate = [
	'New Generation Teen Fellowship',
	'International Travel',
];

async function fixInactiveMinistries() {
	console.log('🔧 Fixing inactive ministries...');

	for (const ministryName of ministriesToDeactivate) {
		try {
			// Check current status
			const { data: current, error: checkError } = await supabase
				.from('ministries')
				.select('name, is_active')
				.eq('name', ministryName)
				.single();

			if (checkError) {
				console.error(`❌ Error checking ${ministryName}:`, checkError.message);
				continue;
			}

			if (!current) {
				console.log(`⚠️  Ministry not found: ${ministryName}`);
				continue;
			}

			if (current.is_active === false) {
				console.log(`✅ ${ministryName} is already inactive`);
				continue;
			}

			// Update to inactive
			const { error: updateError } = await supabase
				.from('ministries')
				.update({ is_active: false })
				.eq('name', ministryName);

			if (updateError) {
				console.error(
					`❌ Error updating ${ministryName}:`,
					updateError.message
				);
			} else {
				console.log(`✅ Updated ${ministryName} to inactive`);
			}
		} catch (error) {
			console.error(`❌ Unexpected error with ${ministryName}:`, error.message);
		}
	}
}

async function main() {
	console.log('🚀 Starting Inactive Ministries Fix...');
	console.log('📡 Connecting to:', supabaseUrl);
	console.log('');

	try {
		await fixInactiveMinistries();

		console.log('');
		console.log('✅ Inactive ministries fix completed!');
	} catch (error) {
		console.error('❌ FATAL ERROR:', error.message);
		process.exit(1);
	}
}

// Run the script
main().catch((error) => {
	console.error('❌ Unhandled error:', error);
	process.exit(1);
});

export { fixInactiveMinistries };

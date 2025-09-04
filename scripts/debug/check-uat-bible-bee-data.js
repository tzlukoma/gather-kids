#!/usr/bin/env node
/**
 * Debug Script: Query and Display Bible Bee Data from UAT Database
 *
 * This script directly queries the UAT Supabase database to check Bible Bee related tables
 * to help debug why data might not be appearing in the application.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local or .env if available
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

// Set UAT environment variables if available
const supabaseUrl =
	process.env.SUPABASE_UAT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
	process.env.SUPABASE_UAT_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log info about environment
console.log('📊 UAT Environment check:');
console.log(
	`- SUPABASE_UAT_URL: ${
		process.env.SUPABASE_UAT_URL ? '✅ Set' : '❌ Not set'
	}`
);
console.log(
	`- SUPABASE_UAT_SERVICE_ROLE_KEY: ${
		process.env.SUPABASE_UAT_SERVICE_ROLE_KEY
			? '✅ Set (partially hidden)'
			: '❌ Not set'
	}`
);
console.log(`\nFallback environment check:`);
console.log(
	`- NEXT_PUBLIC_SUPABASE_URL: ${
		process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'
	}`
);
console.log(
	`- SUPABASE_SERVICE_ROLE_KEY: ${
		process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'
	}`
);

// Validate environment
if (!supabaseUrl) {
	console.error(
		'❌ ERROR: No Supabase URL found. Please set SUPABASE_UAT_URL in your environment.'
	);
	process.exit(1);
}

if (!serviceRoleKey) {
	console.error(
		'❌ ERROR: No Supabase service role key found. Please set SUPABASE_UAT_SERVICE_ROLE_KEY in your environment.'
	);
	process.exit(1);
}

console.log(`\n🔄 Using Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using service role key: ${serviceRoleKey.substring(0, 10)}...`);

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Helper function to run a query and display results
async function queryTable(tableName, limit = 10) {
	console.log(`\n📋 Querying ${tableName} table...`);

	const { data, error } = await supabase
		.from(tableName)
		.select('*')
		.limit(limit);

	if (error) {
		console.error(`❌ Error querying ${tableName}: ${error.message}`);
		return;
	}

	if (data && data.length > 0) {
		console.log(`✅ Found ${data.length} records in ${tableName}`);

		// Show sample data structure
		console.log('📊 Sample Record Fields:');
		console.log(JSON.stringify(Object.keys(data[0]), null, 2));

		// Print first record
		console.log('📄 First Record:');
		console.log(JSON.stringify(data[0], null, 2));
	} else {
		console.log(`⚠️ No data found in ${tableName} table`);
	}

	return data;
}

// Main function
async function main() {
	try {
		console.log('🔍 UAT Bible Bee Data Debug Query');

		// Verify connection to Supabase
		try {
			const { error: healthCheckError } = await supabase
				.from('ministries')
				.select('count')
				.limit(1);

			if (healthCheckError) {
				console.error(
					`❌ FATAL ERROR: Cannot connect to UAT Supabase: ${healthCheckError.message}`
				);
				console.error(
					'Please check your environment variables and network connection.'
				);
				process.exit(1);
			}
			console.log('✅ Connection to UAT Supabase verified');
		} catch (err) {
			console.error(
				`❌ FATAL ERROR: Cannot connect to UAT Supabase: ${err.message}`
			);
			console.error(
				'Please check your environment variables and network connection.'
			);
			process.exit(1);
		}

		// 1. Check Bible Bee ministry
		console.log('\n🔍 Checking Bible Bee Ministry...');
		const ministries = await queryTable('ministries');

		if (ministries) {
			const bibleBeeMinistry = ministries.find(
				(m) =>
					m.name?.toLowerCase().includes('bible bee') ||
					m.code?.toLowerCase().includes('bible-bee') ||
					(m.ministry_id && m.ministry_id.toLowerCase().includes('bible_bee'))
			);

			if (bibleBeeMinistry) {
				console.log(
					`✅ Bible Bee ministry found: ${JSON.stringify(bibleBeeMinistry)}`
				);
			} else {
				console.log('❌ Bible Bee ministry NOT found in ministries table');
				console.log('Available ministries:');
				ministries.forEach((m) =>
					console.log(`  - ${m.name} (${m.ministry_id || m.id})`)
				);
			}
		}

		// 2. Check Bible Bee Year
		console.log('\n🔍 Checking Bible Bee Years...');
		await queryTable('bible_bee_years');

		// 3. Check Divisions
		console.log('\n🔍 Checking Divisions...');
		await queryTable('divisions');

		// 4. Check Grade Rules
		console.log('\n🔍 Checking Grade Rules...');
		await queryTable('grade_rules');

		// 5. Check Essay Prompts
		console.log('\n🔍 Checking Essay Prompts...');
		await queryTable('essay_prompts');

		// 6. Check Competition Years
		console.log('\n🔍 Checking Competition Years...');
		await queryTable('competition_years');

		console.log('\n✅ UAT Bible Bee data check complete');
	} catch (error) {
		console.error(`❌ Unexpected error: ${error.message}`);
		if (error.stack) console.error(error.stack);
		process.exit(1);
	}
}

// Run the script
main();

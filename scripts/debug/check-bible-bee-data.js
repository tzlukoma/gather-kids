#!/usr/bin/env node
/**
 * Debug Script: Query and Display Bible Bee Data
 *
 * This script directly queries the Supabase database to check Bible Bee related tables
 * to help debug why data might not be appearing in the application.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client setup
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log info about environment
console.log('📊 Environment check:');
console.log(
	`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Not set'}`
);
console.log(
	`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set' : '❌ Not set'}`
);

// Fallbacks for different environment configurations
if (!supabaseUrl) {
	supabaseUrl = process.env.SUPABASE_UAT_URL || 'http://127.0.0.1:54321';
	console.log(`Using fallback SUPABASE_URL: ${supabaseUrl}`);
}

if (!serviceRoleKey) {
	serviceRoleKey =
		process.env.SUPABASE_UAT_SERVICE_ROLE_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
	console.log(
		`Using fallback SERVICE_ROLE_KEY (partially hidden): ${serviceRoleKey.substring(
			0,
			10
		)}...`
	);
}

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
		console.log('🔍 Bible Bee Data Debug Query');

		// Verify connection to Supabase
		try {
			const { error: healthCheckError } = await supabase
				.from('ministries')
				.select('count')
				.limit(1);

			if (healthCheckError) {
				console.error(
					`❌ FATAL ERROR: Cannot connect to Supabase: ${healthCheckError.message}`
				);
				console.error(
					'Please check your environment variables and network connection.'
				);
				process.exit(1);
			}
			console.log('✅ Connection to Supabase verified');
		} catch (err) {
			console.error(
				`❌ FATAL ERROR: Cannot connect to Supabase: ${err.message}`
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
					m.name === 'Bible Bee' ||
					m.code === 'bible-bee' ||
					(m.ministry_id && m.ministry_id.includes('bible_bee'))
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

		console.log('\n✅ Bible Bee data check complete');
	} catch (error) {
		console.error(`❌ Unexpected error: ${error.message}`);
		if (error.stack) console.error(error.stack);
		process.exit(1);
	}
}

// Run the script
main();

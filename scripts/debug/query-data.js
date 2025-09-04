#!/usr/bin/env node
/**
 * Debug Script: Query and Display Database Data
 *
 * This script directly queries the Supabase database to display data from key tables
 * to help debug why data might not be appearing in the application.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error(
		'❌ Error: Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)'
	);
	process.exit(1);
}

console.log('🔍 Debug Script: Querying Database Data');
console.log(`🔗 Using Supabase URL: ${supabaseUrl}`);

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

	console.log(`✅ Found ${data.length} records`);

	if (data.length > 0) {
		// Show sample data structure
		console.log('📊 Sample Record Structure:');
		console.log(JSON.stringify(Object.keys(data[0]), null, 2));

		// Print first record
		console.log('📄 First Record:');
		console.log(JSON.stringify(data[0], null, 2));

		// Print all IDs to help with debugging
		if (data[0].id || data[0].ministry_id || data[0].bible_bee_year_id) {
			const idField = data[0].id
				? 'id'
				: data[0].ministry_id
				? 'ministry_id'
				: 'bible_bee_year_id';
			console.log(`🔑 All ${idField}s:`);
			data.forEach((record, index) => {
				const name =
					record.name || record.title || record.description || record.code;
				console.log(
					`  [${index + 1}] ${record[idField]} ${name ? `(${name})` : ''}`
				);
			});
		}
	} else {
		console.log('⚠️ No data found in this table');
	}
}

// List all tables in the public schema to see what's available
async function listTables() {
	console.log('\n📚 Listing all tables in database...');

	const { data, error } = await supabase.rpc('list_tables');

	if (error) {
		console.error(`❌ Error listing tables: ${error.message}`);
		return [];
	}

	console.log(`✅ Found ${data.length} tables:`);
	data.forEach((table) => console.log(`  - ${table.table_name}`));

	return data.map((t) => t.table_name);
}

// Main function
async function main() {
	try {
		// Verify connection to Supabase
		const { error: healthCheckError } = await supabase
			.from('ministries')
			.select('count')
			.limit(1);

		if (healthCheckError) {
			console.error(
				`❌ Cannot connect to Supabase: ${healthCheckError.message}`
			);
			process.exit(1);
		}

		console.log('✅ Connection to Supabase verified\n');

		// List all tables
		const tables = await listTables();

		// Query key tables for Bible Bee data
		console.log('\n🔍 Checking Bible Bee related tables:');

		// Only query tables that exist
		if (tables.includes('bible_bee_years')) await queryTable('bible_bee_years');
		if (tables.includes('divisions')) await queryTable('divisions');
		if (tables.includes('ministries')) await queryTable('ministries');
		if (tables.includes('ministry_leaders'))
			await queryTable('ministry_leaders');
		if (tables.includes('ministry_enrollments'))
			await queryTable('ministry_enrollments');
		if (tables.includes('grade_rules')) await queryTable('grade_rules');
		if (tables.includes('competition_years'))
			await queryTable('competition_years');

		console.log('\n✅ Debug query completed');
	} catch (error) {
		console.error(`❌ Unexpected error: ${error.message}`);
		if (error.stack) console.error(error.stack);
		process.exit(1);
	}
}

// Run the script
main();

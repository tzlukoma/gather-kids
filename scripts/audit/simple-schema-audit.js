#!/usr/bin/env node

/**
 * Simple Database Schema Audit Script
 *
 * This script tests each expected table and column by attempting to query them.
 * It's a simpler approach that doesn't require custom RPC functions.
 *
 * Usage:
 *   node scripts/audit/simple-schema-audit.js
 *
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL: Production Supabase URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Production service role key
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
	console.error(
		'   SUPABASE_SERVICE_ROLE_KEY:',
		supabaseServiceKey ? '✅' : '❌'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Critical tables and their expected columns
const criticalTables = {
	households: [
		'household_id',
		'name',
		'address_line1',
		'city',
		'state',
		'zip',
		'phone',
		'email',
		'preferred_scripture_translation',
		'created_at',
		'updated_at',
	],
	children: [
		'child_id',
		'household_id',
		'first_name',
		'last_name',
		'birth_date',
		'dob',
		'grade',
		'gender',
		'mobile_phone',
		'child_mobile',
		'created_at',
		'updated_at',
	],
	emergency_contacts: [
		'contact_id',
		'household_id',
		'first_name',
		'last_name',
		'mobile_phone',
		'relationship',
		'created_at',
		'updated_at',
	],
	ministries: [
		'ministry_id',
		'code',
		'name',
		'description',
		'data_profile',
		'enrollment_type',
		'min_age',
		'max_age',
		'is_active',
		'open_at',
		'close_at',
		'created_at',
		'updated_at',
	],
	registrations: [
		'registration_id',
		'child_id',
		'cycle_id',
		'status',
		'pre_registered_sunday_school',
		'consents',
		'submitted_at',
		'created_at',
	],
	ministry_enrollments: [
		'enrollment_id',
		'child_id',
		'cycle_id',
		'ministry_id',
		'status',
		'custom_fields',
		'created_at',
	],
	leader_assignments: [
		'assignment_id',
		'leader_id',
		'ministry_id',
		'cycle_id',
		'role',
		'created_at',
	],
	child_year_profiles: [
		'profile_id',
		'child_id',
		'cycle_id',
		'grade',
		'notes',
		'created_at',
	],
	competition_years: [
		'id',
		'year',
		'name',
		'description',
		'created_at',
		'updated_at',
	],
	scriptures: [
		'scripture_id',
		'competition_year_id',
		'division_id',
		'reference',
		'text',
		'created_at',
		'updated_at',
	],
	divisions: [
		'id',
		'competition_year_id',
		'name',
		'description',
		'min_age',
		'max_age',
		'min_grade',
		'max_grade',
		'created_at',
		'updated_at',
	],
	essay_prompts: [
		'id',
		'division_id',
		'title',
		'prompt',
		'instructions',
		'min_words',
		'max_words',
		'created_at',
		'updated_at',
	],
	registration_cycles: [
		'cycle_id',
		'name',
		'description',
		'start_date',
		'end_date',
		'is_active',
		'created_at',
		'updated_at',
	],
	leader_profiles: [
		'leader_id',
		'first_name',
		'last_name',
		'email',
		'phone',
		'background_check_complete',
		'is_active',
		'created_at',
		'updated_at',
	],
	ministry_accounts: [
		'id',
		'ministry_id',
		'email',
		'display_name',
		'is_active',
		'created_at',
		'updated_at',
	],
	branding_settings: [
		'setting_id',
		'organization_name',
		'logo_url',
		'primary_color',
		'secondary_color',
		'created_at',
		'updated_at',
	],
};

/**
 * Test if a table exists and has expected columns
 */
async function testTable(tableName, expectedColumns) {
	const results = {
		table: tableName,
		exists: false,
		missingColumns: [],
		extraColumns: [],
		errors: [],
	};

	try {
		// First, try to select all columns to see if table exists
		const { data, error } = await supabase.from(tableName).select('*').limit(0);

		if (error) {
			results.errors.push(
				`Table does not exist or is not accessible: ${error.message}`
			);
			return results;
		}

		results.exists = true;

		// Test each expected column
		for (const column of expectedColumns) {
			try {
				const { error: columnError } = await supabase
					.from(tableName)
					.select(column)
					.limit(0);

				if (columnError) {
					results.missingColumns.push(column);
				}
			} catch (err) {
				results.missingColumns.push(column);
			}
		}

		// Try to detect extra columns by attempting to select common ones
		const commonExtraColumns = [
			'id',
			'external_id',
			'uuid',
			'created_at',
			'updated_at',
			'deleted_at',
			'archived_at',
			'version',
			'status',
		];

		for (const extraColumn of commonExtraColumns) {
			if (!expectedColumns.includes(extraColumn)) {
				try {
					const { error: extraError } = await supabase
						.from(tableName)
						.select(extraColumn)
						.limit(0);

					if (!extraError) {
						results.extraColumns.push(extraColumn);
					}
				} catch (err) {
					// Column doesn't exist, which is fine
				}
			}
		}
	} catch (err) {
		results.errors.push(`Unexpected error: ${err.message}`);
	}

	return results;
}

/**
 * Main audit function
 */
async function runSchemaAudit() {
	console.log('🔍 Starting Simple Database Schema Audit...');
	console.log(`📡 Connecting to: ${supabaseUrl}`);
	console.log('🔑 Using service role key');
	console.log('');

	const allResults = [];
	let criticalIssues = 0;
	let warnings = 0;

	console.log('📊 Testing tables and columns...');

	for (const [tableName, expectedColumns] of Object.entries(criticalTables)) {
		console.log(`   Testing ${tableName}...`);
		const result = await testTable(tableName, expectedColumns);
		allResults.push(result);

		if (!result.exists) {
			criticalIssues++;
		} else if (result.missingColumns.length > 0) {
			criticalIssues += result.missingColumns.length;
		} else if (result.extraColumns.length > 0) {
			warnings += result.extraColumns.length;
		}
	}

	// Report results
	console.log('');
	console.log('📋 SCHEMA AUDIT RESULTS');
	console.log('===============================================');

	if (criticalIssues === 0 && warnings === 0) {
		console.log('✅ No schema issues found!');
		console.log('🎉 Your database schema matches expectations.');
	} else {
		console.log(
			`❌ Found ${criticalIssues} critical issues and ${warnings} warnings:`
		);
		console.log('');

		// Report critical issues first
		const criticalResults = allResults.filter(
			(r) => !r.exists || r.missingColumns.length > 0
		);
		if (criticalResults.length > 0) {
			console.log('🚨 CRITICAL ISSUES:');
			criticalResults.forEach((result) => {
				if (!result.exists) {
					console.log(`   • Table ${result.table} does not exist`);
					if (result.errors.length > 0) {
						result.errors.forEach((error) => console.log(`     - ${error}`));
					}
				} else if (result.missingColumns.length > 0) {
					console.log(
						`   • Table ${
							result.table
						} missing columns: ${result.missingColumns.join(', ')}`
					);
				}
			});
			console.log('');
		}

		// Report warnings
		const warningResults = allResults.filter(
			(r) => r.exists && r.extraColumns.length > 0
		);
		if (warningResults.length > 0) {
			console.log('⚠️  WARNINGS (Extra columns found):');
			warningResults.forEach((result) => {
				console.log(
					`   • Table ${
						result.table
					} has extra columns: ${result.extraColumns.join(', ')}`
				);
			});
			console.log('');
		}

		console.log('💡 RECOMMENDATIONS:');
		console.log('   1. Apply missing migrations to fix critical issues');
		console.log('   2. Review extra columns - they might be legacy or needed');
		console.log('   3. Test thoroughly after applying fixes');
		console.log('   4. Run this audit regularly to catch issues early');
		console.log('');

		// Generate migration suggestions
		console.log('🛠️  SUGGESTED ACTIONS:');
		criticalResults.forEach((result) => {
			if (!result.exists) {
				console.log(`   • Create table: ${result.table}`);
			} else if (result.missingColumns.length > 0) {
				console.log(
					`   • Add missing columns to ${
						result.table
					}: ${result.missingColumns.join(', ')}`
				);
			}
		});
	}

	console.log('');
	console.log('✅ Schema audit completed');

	// Exit with error code if critical issues found
	if (criticalIssues > 0) {
		process.exit(1);
	}
}

// Run the audit
runSchemaAudit().catch((err) => {
	console.error('❌ Schema audit failed:', err.message);
	process.exit(1);
});

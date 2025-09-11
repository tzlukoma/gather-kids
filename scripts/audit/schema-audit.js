#!/usr/bin/env node

/**
 * Database Schema Audit Script
 *
 * This script compares the expected schema (from migrations) with the actual
 * production database schema to identify mismatches that could cause issues.
 *
 * Usage:
 *   node scripts/audit/schema-audit.js
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

// Expected schema based on migrations and canonical DTOs
const expectedSchema = {
	households: {
		household_id: 'text',
		name: 'text',
		address_line1: 'text',
		address_line2: 'text',
		city: 'text',
		state: 'text',
		zip: 'text',
		phone: 'text',
		email: 'text',
		preferred_scripture_translation: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
		external_id: 'text',
	},
	children: {
		child_id: 'text',
		external_id: 'text',
		household_id: 'text',
		external_household_id: 'text',
		first_name: 'text',
		last_name: 'text',
		birth_date: 'date',
		dob: 'date',
		grade: 'text',
		gender: 'text',
		mobile_phone: 'text',
		child_mobile: 'text',
		allergies: 'text',
		notes: 'text',
		medical_notes: 'text',
		special_needs: 'boolean',
		special_needs_notes: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	emergency_contacts: {
		contact_id: 'uuid',
		household_id: 'uuid',
		first_name: 'text',
		last_name: 'text',
		mobile_phone: 'text',
		relationship: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	ministries: {
		ministry_id: 'text',
		code: 'text',
		name: 'text',
		description: 'text',
		details: 'text',
		data_profile: 'text',
		enrollment_type: 'text',
		min_age: 'integer',
		max_age: 'integer',
		communicate_later: 'boolean',
		custom_questions: 'jsonb',
		optional_consent_text: 'text',
		is_active: 'boolean',
		open_at: 'date',
		close_at: 'date',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
		external_id: 'text',
		allows_checkin: 'boolean',
	},
	registrations: {
		registration_id: 'text',
		child_id: 'text',
		cycle_id: 'text',
		status: 'text',
		pre_registered_sunday_school: 'boolean',
		consents: 'jsonb',
		submitted_at: 'timestamptz',
		submitted_via: 'text',
		created_at: 'timestamptz',
	},
	ministry_enrollments: {
		enrollment_id: 'text',
		child_id: 'text',
		cycle_id: 'text',
		ministry_id: 'text',
		status: 'text',
		custom_fields: 'jsonb',
		created_at: 'timestamptz',
	},
	leader_assignments: {
		assignment_id: 'text',
		leader_id: 'text',
		ministry_id: 'text',
		cycle_id: 'text',
		role: 'text',
		created_at: 'timestamptz',
	},
	child_year_profiles: {
		profile_id: 'text',
		child_id: 'text',
		cycle_id: 'text',
		grade: 'text',
		notes: 'text',
		created_at: 'timestamptz',
	},
	competition_years: {
		id: 'text',
		year: 'integer',
		name: 'text',
		description: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	scriptures: {
		scripture_id: 'text',
		competition_year_id: 'text',
		division_id: 'text',
		reference: 'text',
		text: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
		external_id: 'text',
	},
	divisions: {
		id: 'text',
		competition_year_id: 'text',
		name: 'text',
		description: 'text',
		min_age: 'integer',
		max_age: 'integer',
		min_grade: 'integer',
		max_grade: 'integer',
		requires_essay: 'boolean',
		min_scriptures: 'integer',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	essay_prompts: {
		id: 'text',
		division_id: 'text',
		title: 'text',
		prompt: 'text',
		instructions: 'text',
		min_words: 'integer',
		max_words: 'integer',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	grade_rules: {
		id: 'text',
		competition_year_id: 'text',
		grade: 'text',
		division_id: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	bible_bee_enrollments: {
		enrollment_id: 'text',
		child_id: 'text',
		competition_year_id: 'text',
		division_id: 'text',
		status: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	enrollment_overrides: {
		id: 'text',
		child_id: 'text',
		competition_year_id: 'text',
		division_id: 'text',
		reason: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	registration_cycles: {
		cycle_id: 'text',
		name: 'text',
		description: 'text',
		start_date: 'date',
		end_date: 'date',
		is_active: 'boolean',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	leader_profiles: {
		leader_id: 'uuid',
		first_name: 'text',
		last_name: 'text',
		email: 'text',
		phone: 'text',
		photo_url: 'text',
		avatar_path: 'text',
		notes: 'text',
		background_check_complete: 'boolean',
		is_active: 'boolean',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	ministry_accounts: {
		id: 'uuid',
		ministry_id: 'text',
		email: 'text',
		display_name: 'text',
		is_active: 'boolean',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
	branding_settings: {
		setting_id: 'uuid',
		organization_name: 'text',
		logo_url: 'text',
		primary_color: 'text',
		secondary_color: 'text',
		font_family: 'text',
		custom_css: 'text',
		created_at: 'timestamptz',
		updated_at: 'timestamptz',
	},
};

/**
 * Get actual schema from production database
 */
async function getActualSchema() {
	const actualSchema = {};

	for (const tableName of Object.keys(expectedSchema)) {
		try {
			// Try to get table info using information_schema
			const { data: columns, error } = await supabase.rpc('get_table_columns', {
				table_name: tableName,
			});

			if (error) {
				// Fallback: try to select from table to see if it exists
				const { data, error: selectError } = await supabase
					.from(tableName)
					.select('*')
					.limit(0);

				if (selectError) {
					console.log(
						`⚠️  Table ${tableName} does not exist or is not accessible`
					);
					actualSchema[tableName] = { error: selectError.message };
					continue;
				}

				// Table exists but we can't get column info via RPC
				actualSchema[tableName] = { exists: true, columns: 'unknown' };
				continue;
			}

			actualSchema[tableName] = { exists: true, columns: columns || [] };
		} catch (err) {
			console.log(`⚠️  Error checking table ${tableName}:`, err.message);
			actualSchema[tableName] = { error: err.message };
		}
	}

	return actualSchema;
}

/**
 * Compare expected vs actual schema
 */
function compareSchemas(expected, actual) {
	const issues = [];

	for (const tableName of Object.keys(expected)) {
		const expectedColumns = expected[tableName];
		const actualTable = actual[tableName];

		if (!actualTable || actualTable.error) {
			issues.push({
				type: 'missing_table',
				table: tableName,
				message: `Table ${tableName} does not exist or is not accessible`,
				error: actualTable?.error,
			});
			continue;
		}

		if (!actualTable.exists) {
			issues.push({
				type: 'missing_table',
				table: tableName,
				message: `Table ${tableName} does not exist`,
			});
			continue;
		}

		if (actualTable.columns === 'unknown') {
			issues.push({
				type: 'unknown_schema',
				table: tableName,
				message: `Table ${tableName} exists but column information is not accessible`,
			});
			continue;
		}

		// Check for missing columns
		for (const [columnName, expectedType] of Object.entries(expectedColumns)) {
			const actualColumn = actualTable.columns.find(
				(col) => col.column_name === columnName
			);

			if (!actualColumn) {
				issues.push({
					type: 'missing_column',
					table: tableName,
					column: columnName,
					message: `Column ${tableName}.${columnName} is missing`,
				});
			} else {
				// Check type compatibility (simplified check)
				const actualType = actualColumn.data_type;
				if (!isTypeCompatible(expectedType, actualType)) {
					issues.push({
						type: 'type_mismatch',
						table: tableName,
						column: columnName,
						expected: expectedType,
						actual: actualType,
						message: `Column ${tableName}.${columnName} has wrong type: expected ${expectedType}, got ${actualType}`,
					});
				}
			}
		}

		// Check for unexpected columns (optional - might be legacy)
		for (const actualColumn of actualTable.columns) {
			if (!expectedColumns[actualColumn.column_name]) {
				issues.push({
					type: 'unexpected_column',
					table: tableName,
					column: actualColumn.column_name,
					actual: actualColumn.data_type,
					message: `Unexpected column ${tableName}.${actualColumn.column_name} (${actualColumn.data_type})`,
				});
			}
		}
	}

	return issues;
}

/**
 * Check if types are compatible (simplified)
 */
function isTypeCompatible(expected, actual) {
	// Map PostgreSQL types to our expected types
	const typeMap = {
		text: ['text', 'character varying'],
		integer: ['integer', 'int4'],
		boolean: ['boolean', 'bool'],
		date: ['date'],
		timestamptz: ['timestamp with time zone', 'timestamptz'],
		uuid: ['uuid'],
		jsonb: ['jsonb'],
	};

	for (const [expectedType, actualTypes] of Object.entries(typeMap)) {
		if (expectedType === expected) {
			return actualTypes.includes(actual.toLowerCase());
		}
	}

	return false;
}

/**
 * Create a custom RPC function to get table columns
 */
async function createHelperFunction() {
	const createFunctionSQL = `
	CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
	RETURNS TABLE(
		column_name text,
		data_type text,
		is_nullable text,
		column_default text
	)
	LANGUAGE plpgsql
	AS $$
	BEGIN
		RETURN QUERY
		SELECT 
			c.column_name::text,
			c.data_type::text,
			c.is_nullable::text,
			c.column_default::text
		FROM information_schema.columns c
		WHERE c.table_schema = 'public'
		AND c.table_name = $1
		ORDER BY c.ordinal_position;
	END;
	$$;
	`;

	try {
		const { error } = await supabase.rpc('exec_sql', {
			sql: createFunctionSQL,
		});
		if (error) {
			console.log('⚠️  Could not create helper function:', error.message);
			return false;
		}
		return true;
	} catch (err) {
		console.log('⚠️  Could not create helper function:', err.message);
		return false;
	}
}

/**
 * Main audit function
 */
async function runSchemaAudit() {
	console.log('🔍 Starting Database Schema Audit...');
	console.log(`📡 Connecting to: ${supabaseUrl}`);
	console.log('🔑 Using service role key');
	console.log('');

	// Try to create helper function
	console.log('🛠️  Setting up schema inspection...');
	const helperCreated = await createHelperFunction();

	if (!helperCreated) {
		console.log('⚠️  Using fallback method (limited information)');
	}

	console.log('📊 Analyzing database schema...');
	const actualSchema = await getActualSchema();

	console.log('🔍 Comparing expected vs actual schema...');
	const issues = compareSchemas(expectedSchema, actualSchema);

	// Report results
	console.log('');
	console.log('📋 SCHEMA AUDIT RESULTS');
	console.log('===============================================');

	if (issues.length === 0) {
		console.log('✅ No schema issues found!');
		console.log('🎉 Your database schema matches expectations.');
	} else {
		console.log(`❌ Found ${issues.length} schema issues:`);
		console.log('');

		// Group issues by type
		const groupedIssues = issues.reduce((acc, issue) => {
			if (!acc[issue.type]) acc[issue.type] = [];
			acc[issue.type].push(issue);
			return acc;
		}, {});

		// Report critical issues first
		const criticalTypes = ['missing_table', 'missing_column', 'type_mismatch'];
		const warningTypes = ['unexpected_column', 'unknown_schema'];

		for (const type of criticalTypes) {
			if (groupedIssues[type]) {
				console.log(`🚨 CRITICAL: ${type.replace('_', ' ').toUpperCase()}`);
				groupedIssues[type].forEach((issue) => {
					console.log(`   • ${issue.message}`);
				});
				console.log('');
			}
		}

		for (const type of warningTypes) {
			if (groupedIssues[type]) {
				console.log(`⚠️  WARNING: ${type.replace('_', ' ').toUpperCase()}`);
				groupedIssues[type].forEach((issue) => {
					console.log(`   • ${issue.message}`);
				});
				console.log('');
			}
		}

		console.log('💡 RECOMMENDATIONS:');
		console.log('   1. Apply missing migrations to fix critical issues');
		console.log('   2. Review unexpected columns - they might be legacy');
		console.log('   3. Test thoroughly after applying fixes');
		console.log('   4. Consider running this audit regularly');
	}

	console.log('');
	console.log('✅ Schema audit completed');
}

// Run the audit
runSchemaAudit().catch((err) => {
	console.error('❌ Schema audit failed:', err.message);
	process.exit(1);
});

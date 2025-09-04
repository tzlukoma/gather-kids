/**
 * This script creates the registration_cycles table directly using SQL
 * Run this if the uat_seed script fails with "Could not find the table 'public.registration_cycles'"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error(
		'❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function checkIfTableExists() {
	try {
		console.log('🔍 Checking if registration_cycles table exists...');

		// Try to directly query the table instead of checking information_schema
		const { data, error } = await supabase
			.from('registration_cycles')
			.select('count(*)')
			.limit(1);

		if (error) {
			if (error.message.includes('does not exist')) {
				console.log('✓ Verified: Table registration_cycles does not exist');
				return false;
			}
			
			console.error('❌ Error checking table existence:', error.message);
			return null; // Return null to indicate error
		}

		console.log('✓ Verified: Table registration_cycles exists');
		return true;
	} catch (error) {
		console.error('❌ Error checking if table exists:', error.message);
		return null; // Return null to indicate error
	}
}

async function createRegistrationCyclesTable() {
	console.log('⏳ Checking registration_cycles table status...');

	const tableExists = await checkIfTableExists();

	if (tableExists === true) {
		console.log('✅ Table registration_cycles already exists');
		return true;
	} else if (tableExists === null) {
		console.log(
			'⚠️ Could not determine if table exists, will try to create anyway'
		);
	} else {
		console.log('🔧 Table does not exist, creating it now...');
	}

	// Direct SQL approach using REST API
	try {
		console.log('🔄 Creating table using direct SQL API call...');
		
		// The POST SQL method for direct SQL execution
		const sqlEndpoint = `${supabaseUrl}/rest/v1/sql`;
		const sqlQuery = `
			CREATE TABLE IF NOT EXISTS public.registration_cycles (
				id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
				name TEXT NOT NULL,
				cycle_id VARCHAR UNIQUE,
				start_date TIMESTAMP WITH TIME ZONE NOT NULL,
				end_date TIMESTAMP WITH TIME ZONE NOT NULL, 
				description TEXT,
				active BOOLEAN DEFAULT true NOT NULL,
				is_active BOOLEAN DEFAULT false
			);
		`;
		
		// Make direct SQL call using fetch
		try {
			console.log('📡 Sending SQL request to Supabase REST API...');
			
			const response = await fetch(sqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': supabaseKey,
					'Authorization': `Bearer ${supabaseKey}`
				},
				body: JSON.stringify({ query: sqlQuery })
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(`SQL API failed with status ${response.status}: ${JSON.stringify(result)}`);
			}
			
			console.log('✅ Table created successfully via SQL API!');
			return true;
		} catch (sqlApiError) {
			console.error('❌ SQL API creation attempt failed:', sqlApiError.message);
			throw sqlApiError;
		}
	} catch (directSqlError) {
		console.error('⚠️ Direct SQL creation attempt failed:', directSqlError.message);
		console.log('Attempting alternative approach...');
		
		try {
			// Try creating a temporary table to see if we have permissions
			console.log('🔄 Testing permissions with a temporary table creation...');
			
			const tempSqlEndpoint = `${supabaseUrl}/rest/v1/sql`;
			const tempSqlQuery = `
				CREATE TEMP TABLE IF NOT EXISTS temp_test_permissions (
					id SERIAL PRIMARY KEY,
					name TEXT
				);
			`;
			
			const response = await fetch(tempSqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': supabaseKey,
					'Authorization': `Bearer ${supabaseKey}`
				},
				body: JSON.stringify({ query: tempSqlQuery })
			});
			
			if (!response.ok) {
				throw new Error('No permission to create tables');
			}

			console.log('✅ Permissions test succeeded');
			console.log('But failed to create the actual table.');
			return false;
		} catch (permissionCheckError) {
			console.error('❌ Permission check failed:', permissionCheckError.message);
		}

		// Provide manual SQL for the user to run
		const migrationSQL = `
CREATE TABLE IF NOT EXISTS public.registration_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  cycle_id VARCHAR UNIQUE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT false
);
		`.trim();

			console.log(
				'\n📋 To create this table manually in the Supabase SQL Editor, run:'
			);
			console.log(
				'\n-----------------------------------------------------------'
			);
			console.log(migrationSQL);
			console.log(
				'-----------------------------------------------------------\n'
			);
			console.log(`🌐 SQL Editor URL: ${supabaseUrl}/project/sql`);
			console.log('Then run the UAT seed script again with: npm run seed:uat');

			return false;
		}
	}
}

async function main() {
	console.log('🚀 Starting registration_cycles table creation script');

	try {
		const success = await createRegistrationCyclesTable();
		if (success) {
			console.log('✅ Script completed successfully');

			// Check if the table exists now
			const tableExists = await checkIfTableExists();
			if (tableExists === true) {
				console.log(
					'🔍 Verified: registration_cycles table exists in the database'
				);
				console.log('🎉 You can now run the UAT seed script: npm run seed:uat');
			} else {
				console.log(
					'⚠️ Table creation reported success, but verification failed'
				);
				console.log(
					'Please try running the SQL manually in the Supabase SQL Editor'
				);
			}
		} else {
			console.log('⚠️ Script completed with errors');
			process.exit(1);
		}
	} catch (err) {
		console.error('❌ Unexpected error:', err);
		process.exit(1);
	}
}

main();

/**
 * This script creates the registration_cycles table directly using SQL
 * Run this if the uat_seed script fails with "Could not find the table 'public.registration_cycles'"
 *
 * This updated version handles Supabase API limitations better.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error(
		'❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIfTableExists() {
	try {
		console.log('🔍 Checking if registration_cycles table exists...');

		// Try to directly query the table
		const { data, error } = await supabase
			.from('registration_cycles')
			.select('count(*)')
			.limit(1);

		if (error) {
			if (error.message.includes('does not exist')) {
				console.log('✓ Confirmed: Table registration_cycles does not exist');
				return false;
			}
			console.error('❌ Error checking table existence:', error.message);
			return null; // Return null to indicate error
		}

		console.log('✓ Confirmed: Table registration_cycles exists');
		return true;
	} catch (error) {
		console.error('❌ Error checking if table exists:', error);
		return null; // Return null to indicate error
	}
}

async function createRegistrationCyclesTable() {
	console.log('⏳ Starting table creation process...');

	const tableExists = await checkIfTableExists();

	if (tableExists === true) {
		console.log('✅ Table registration_cycles already exists');
		return true;
	}

	console.log('🔧 Table needs to be created...');

	// Generate SQL for creating the table
	const createTableSQL = `
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

	// First try using the Supabase REST SQL API if available
	try {
		console.log('🔄 Attempting to create table via REST SQL API...');

		const sqlEndpoint = `${supabaseUrl}/rest/v1/sql`;

		const response = await fetch(sqlEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: supabaseKey,
				Authorization: `Bearer ${supabaseKey}`,
			},
			body: JSON.stringify({ query: createTableSQL }),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`SQL API failed: ${response.status} - ${errorBody}`);
		}

		console.log('✅ Table created successfully via SQL API!');
		return true;
	} catch (sqlApiError) {
		console.error('❌ SQL API creation failed:', sqlApiError.message);

		// Display manual instructions
		console.log('\n📝 You need to create this table manually using SQL:');
		console.log(
			'\n-----------------------------------------------------------'
		);
		console.log(createTableSQL);
		console.log(
			'-----------------------------------------------------------\n'
		);
		console.log(`🌐 Go to Supabase SQL Editor: ${supabaseUrl}/project/sql`);
		console.log('1. Copy the SQL above');
		console.log('2. Paste it in the SQL Editor');
		console.log('3. Click "Run" button');
		console.log('4. Then run your UAT seed script again\n');

		return false;
	}
}

async function main() {
	console.log('🚀 Starting registration_cycles table creation script');

	try {
		const success = await createRegistrationCyclesTable();

		if (success) {
			console.log('✅ Script completed successfully');

			// Verify the table exists
			const tableExists = await checkIfTableExists();
			if (tableExists === true) {
				console.log('🔍 Verification successful: Table exists');
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
			console.log(
				'Please follow the manual instructions above to create the table'
			);
		}
	} catch (error) {
		console.error('❌ Unexpected error:', error);
		process.exit(1);
	}
}

main();

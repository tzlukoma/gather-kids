import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error(
		'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
	console.log('Listing all tables in the database...');

	try {
		// Query information_schema.tables to get all tables
		const { data, error } = await supabase
			.from('information_schema.tables')
			.select('table_name')
			.eq('table_schema', 'public');

		if (error) {
			// If the RPC method fails, try a raw SQL query
			console.log('Standard query failed, trying raw SQL...');
			const { data: sqlData, error: sqlError } = await supabase.rpc(
				'list_tables'
			);

			if (sqlError) {
				console.error('Failed to list tables using RPC:', sqlError);
				return [];
			}

			return sqlData;
		}

		return data.map((item) => item.table_name);
	} catch (err) {
		console.error('Error listing tables:', err);
		return [];
	}
}

async function main() {
	console.log('Schema Inspector');

	try {
		// Try a SQL query to list tables
		const { data, error } = await supabase.rpc('list_tables');

		if (error) {
			console.log('RPC method not available, trying raw SQL...');

			// Try direct SQL as fallback
			const { data: sqlData, error: sqlError } = await supabase.rpc(
				'execute_sql',
				{
					sql_query:
						"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
				}
			);

			if (sqlError) {
				console.error('Could not list tables using SQL:', sqlError);

				// Last attempt with PostgreSQL metadata tables
				console.log('Trying direct table selection...');
				const tables = await listTables();
				console.log('Tables found:', tables);
			} else {
				console.log('Tables found:', sqlData);
			}
		} else {
			console.log('Tables found:', data);
		}

		// Check if registration_cycles table exists
		const { data: countData, error: countError } = await supabase
			.from('registration_cycles')
			.select('*', { count: 'exact', head: true });

		if (countError) {
			console.log(
				'Registration cycles table does not exist or is not accessible:',
				countError.message
			);
		} else {
			console.log('Registration cycles table exists with count:', countData);
		}
	} catch (err) {
		console.error('Error in main function:', err);
	}
}

main();

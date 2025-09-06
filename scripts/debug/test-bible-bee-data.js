/**
 * This script helps test database connection to Bible Bee scriptures data
 * Run it with your supabase credentials to check for data access.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.uat' });

async function main() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error('Missing Supabase credentials');
		process.exit(1);
	}

	console.log('Connecting to Supabase at:', supabaseUrl);
	const supabase = createClient(supabaseUrl, supabaseKey);

	try {
		// First check ministries
		console.log('\nChecking ministries table...');
		const { data: ministries, error: ministryError } = await supabase
			.from('ministries')
			.select('*');
		if (ministryError) throw ministryError;
		console.log(`Found ${ministries.length} ministries`);

		// Check Bible Bee ministry
		const bibleBeeMinistry = ministries.find(
			(m) => m.ministry_id === 'bible-bee'
		);
		if (bibleBeeMinistry) {
			console.log('Bible Bee ministry found:', bibleBeeMinistry);
		} else {
			console.log('Bible Bee ministry not found!');
		}

		// Check bible_bee_years table
		console.log('\nChecking bible_bee_years table...');
		const { data: years, error: yearsError } = await supabase
			.from('bible_bee_years')
			.select('*');
		if (yearsError) throw yearsError;
		console.log(`Found ${years.length} Bible Bee years`);
		if (years.length > 0) {
			console.log('Sample year:', years[0]);
		}

		// Check divisions table
		console.log('\nChecking divisions table...');
		const { data: divisions, error: divisionsError } = await supabase
			.from('divisions')
			.select('*');
		if (divisionsError) throw divisionsError;
		console.log(`Found ${divisions.length} divisions`);
		if (divisions.length > 0) {
			console.log('Sample division:', divisions[0]);
		}

		// Check scriptures table
		console.log('\nChecking scriptures table...');
		const { data: scriptures, error: scripturesError } = await supabase
			.from('scriptures')
			.select('*')
			.limit(10);
		if (scripturesError) throw scripturesError;
		console.log(`Found ${scriptures.length} scriptures (showing max 10)`);
		if (scriptures.length > 0) {
			console.log('Sample scripture:', scriptures[0]);
		}

		// Check if we have scriptures with year_id field
		if (scriptures.length > 0) {
			const hasYearId = scriptures.some((s) => s.year_id);
			console.log('\nScriptures with year_id field:', hasYearId ? 'Yes' : 'No');

			if (hasYearId) {
				// Example: Get scriptures for a specific year
				const yearId = years[0]?.id;
				if (yearId) {
					console.log(`\nFetching scriptures for year: ${yearId}`);
					const { data: yearScriptures, error: yearScripturesError } =
						await supabase.from('scriptures').select('*').eq('year_id', yearId);

					if (yearScripturesError) throw yearScripturesError;
					console.log(
						`Found ${yearScriptures.length} scriptures for year ${yearId}`
					);
				}
			}
		}

		console.log('\n✅ Database connection test completed successfully');
	} catch (error) {
		console.error('Error accessing database:', error);
	}
}

main();

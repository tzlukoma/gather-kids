// Verify Bible Bee data
// This script checks if all required Bible Bee data exists in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get directory path for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.uat (or fallback to .env.local)
let envFile = resolve(__dirname, '../../.env.uat');
dotenv.config({ path: envFile });

// Fallback to .env.local if Supabase credentials not found
if (
	!process.env.NEXT_PUBLIC_SUPABASE_URL ||
	!process.env.SUPABASE_SERVICE_ROLE_KEY
) {
	console.log(
		'⚠️ Supabase credentials not found in .env.uat, trying .env.local'
	);
	envFile = resolve(__dirname, '../../.env.local');
	dotenv.config({ path: envFile });
}

// Initialize Supabase client
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

// External ID prefix for UAT data
const EXTERNAL_ID_PREFIX = 'uat_';

/**
 * Verify Bible Bee data
 */
async function verifyBibleBeeData() {
	console.log('=====================================');
	console.log('🐝 Bible Bee Data Verification 🐝');
	console.log('=====================================');
	console.log();
	console.log('🔍 Checking Bible Bee data components...');
	console.log();

	let allPassed = true;

	// 1. Check if Bible Bee ministry exists
	console.log('1. Checking Bible Bee ministry...');
	const { data: ministry, error: ministryError } = await supabase
		.from('ministries')
		.select('ministry_id, name')
		.eq('code', 'bible-bee')
		.single();

	if (ministryError) {
		console.log(
			`   ❌ Error checking Bible Bee ministry: ${ministryError.message}`
		);
		allPassed = false;
	} else if (ministry) {
		console.log(
			`   ✅ Bible Bee ministry exists: "${ministry.name}" (${ministry.ministry_id})`
		);
	} else {
		console.log('   ❌ Bible Bee ministry not found!');
		allPassed = false;
	}

	// 2. Check registration cycle
	console.log('\n2. Checking active registration cycle...');
	const { data: cycles, error: cycleError } = await supabase
		.from('registration_cycles')
		.select('cycle_id, name, start_date, end_date')
		.order('created_at', { ascending: false })
		.limit(1);

	if (cycleError) {
		console.log(
			`   ❌ Error checking registration cycles: ${cycleError.message}`
		);
		allPassed = false;
	} else if (cycles && cycles.length > 0) {
		const cycle = cycles[0];
		const now = new Date();
		const endDate = new Date(cycle.end_date);

		if (endDate > now) {
			console.log(
				`   ✅ Active registration cycle found: "${cycle.name}" (ends ${cycle.end_date})`
			);
		} else {
			console.log(
				`   ⚠️ Registration cycle found but might be expired: "${cycle.name}" (ended ${cycle.end_date})`
			);
			allPassed = false;
		}
	} else {
		console.log('   ❌ No registration cycles found!');
		allPassed = false;
	}

	// 3. Check competition year
	console.log('\n3. Checking Bible Bee competition year...');
	let years, yearError;

	// Try different column names since schema may vary
	try {
		const result = await supabase
			.from('competition_years')
			.select('id, name, registration_cycle_id')
			.order('created_at', { ascending: false })
			.limit(1);

		years = result.data;
		yearError = result.error;
	} catch (e) {
		// Try alternate column name
		console.log('   ⚠️ Trying alternate column name (registrationCycleId)...');
		const result = await supabase
			.from('competition_years')
			.select('id, name, registrationCycleId')
			.order('created_at', { ascending: false })
			.limit(1);

		years = result.data;
		yearError = result.error;
	}

	if (yearError) {
		console.log(`   ❌ Error checking competition years: ${yearError.message}`);
		allPassed = false;
	} else if (years && years.length > 0) {
		const year = years[0];

		// Check if either column name exists
		const cycleId = year.registration_cycle_id || year.registrationCycleId;

		if (cycleId) {
			console.log(
				`   ✅ Competition year found and linked: "${year.name}" (${year.id})`
			);

			// Check if registration cycle matches
			if (cycles && cycles.length > 0 && cycleId === cycles[0].cycle_id) {
				console.log(
					`   ✅ Competition year correctly linked to active registration cycle`
				);
			} else {
				console.log(
					`   ⚠️ Competition year linked to a different registration cycle`
				);
				allPassed = false;
			}
		} else {
			console.log(
				`   ⚠️ Competition year found but not linked to a registration cycle: "${year.name}"`
			);
			allPassed = false;
		}
	} else {
		console.log('   ❌ No competition years found!');
		allPassed = false;
	}

	// 4. Check divisions
	console.log('\n4. Checking Bible Bee divisions...');

	if (!years || years.length === 0) {
		console.log('   ❌ Cannot check divisions: No competition year found');
		allPassed = false;
	} else {
		const yearId = years[0].id;

		// Try to determine correct column name
		let divisions, divisionError;

		try {
			const result = await supabase
				.from('divisions')
				.select('id, name, min_grade, max_grade')
				.eq('competitionYearId', yearId);

			divisions = result.data;
			divisionError = result.error;

			if (divisionError || !divisions || divisions.length === 0) {
				console.log(
					'   ⚠️ Trying alternate column name (competition_year_id)...'
				);
				const altResult = await supabase
					.from('divisions')
					.select('id, name, min_grade, max_grade')
					.eq('competition_year_id', yearId);

				divisions = altResult.data;
				divisionError = altResult.error;
			}
		} catch (e) {
			console.log(`   ❌ Error checking divisions: ${e.message}`);
			divisionError = e;
		}

		if (divisionError) {
			console.log(`   ❌ Error checking divisions: ${divisionError.message}`);
			allPassed = false;
		} else if (divisions && divisions.length > 0) {
			console.log(`   ✅ Found ${divisions.length} divisions:`);
			divisions.forEach((div) => {
				console.log(
					`     - ${div.name}: grades ${div.min_grade}-${div.max_grade}`
				);
			});

			// Check for coverage of grades K-12
			const allGrades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
			const coveredGrades = [];

			divisions.forEach((div) => {
				for (let g = div.min_grade; g <= div.max_grade; g++) {
					if (!coveredGrades.includes(g)) {
						coveredGrades.push(g);
					}
				}
			});

			const missingGrades = allGrades.filter((g) => !coveredGrades.includes(g));

			if (missingGrades.length === 0) {
				console.log('   ✅ All grades (K-12) covered by divisions');
			} else {
				console.log(
					`   ⚠️ Some grades not covered by divisions: ${missingGrades.join(
						', '
					)}`
				);
				allPassed = false;
			}
		} else {
			console.log('   ❌ No divisions found!');
			allPassed = false;
		}
	}

	// 5. Check Bible Bee ministry enrollments
	console.log('\n5. Checking Bible Bee ministry enrollments...');

	if (!ministry) {
		console.log('   ❌ Cannot check enrollments: Bible Bee ministry not found');
		allPassed = false;
	} else {
		const { data: enrollments, error: enrollmentError } = await supabase
			.from('ministry_enrollments')
			.select('enrollment_id, child_id')
			.eq('ministry_id', ministry.ministry_id);

		if (enrollmentError) {
			console.log(
				`   ❌ Error checking enrollments: ${enrollmentError.message}`
			);
			allPassed = false;
		} else if (enrollments && enrollments.length > 0) {
			console.log(
				`   ✅ Found ${enrollments.length} children enrolled in Bible Bee ministry`
			);

			// Check if there are at least 10 enrollments
			if (enrollments.length >= 10) {
				console.log('   ✅ Requirement met: At least 10 children enrolled');
			} else {
				console.log(
					`   ⚠️ Found only ${enrollments.length} enrollments (need at least 10)`
				);
				allPassed = false;
			}
		} else {
			console.log('   ❌ No children enrolled in Bible Bee ministry!');
			allPassed = false;
		}
	}

	console.log('\n=====================');
	if (allPassed) {
		console.log('✅ All Bible Bee data checks passed!');
		console.log(
			'The system is ready for testing the Bible Bee auto-enrollment logic.'
		);
	} else {
		console.log(
			'⚠️ Some checks failed. Please run the following command to fix:'
		);
		console.log('npm run seed:uat:reset');
	}
	console.log('=====================\n');
}

// Execute and handle errors
try {
	await verifyBibleBeeData();
} catch (error) {
	console.error('❌ Unexpected error during verification:', error);
}

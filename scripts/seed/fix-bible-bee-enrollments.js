/**
 * This script fixes Bible Bee enrollments by creating proper entries in the bible_bee_enrollments table.
 * It reads existing ministry enrollments for Bible Bee and creates corresponding Bible Bee enrollments.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.uat' });

// Validation
if (
	!process.env.NEXT_PUBLIC_SUPABASE_URL ||
	!process.env.SUPABASE_SERVICE_ROLE_KEY
) {
	console.error('❌ Error: Required environment variables are missing.');
	console.error(
		'Make sure you have a .env.uat file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
	);
	process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

// External ID prefix for UAT data
const EXTERNAL_ID_PREFIX = 'uat_';

/**
 * Creates Bible Bee enrollments based on existing ministry enrollments
 */
async function createBibleBeeEnrollments() {
	console.log('🐝 Creating Bible Bee enrollments from ministry enrollments...');

	try {
		// Get Bible Bee ministry ID
		const { data: ministry, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id')
			.eq('code', 'bible-bee')
			.single();

		if (ministryError) {
			throw new Error(
				`Failed to find Bible Bee ministry: ${ministryError.message}`
			);
		}

		const bibleBeeMinistryId = ministry.ministry_id;
		console.log(`✅ Found Bible Bee ministry with ID: ${bibleBeeMinistryId}`);

		// Find all enrollments for Bible Bee ministry
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('ministry_enrollments')
			.select('enrollment_id, child_id')
			.eq('ministry_id', bibleBeeMinistryId)
			.eq('status', 'active');

		if (enrollmentsError) {
			throw new Error(
				`Failed to fetch Bible Bee enrollments: ${enrollmentsError.message}`
			);
		}

		if (!enrollments || enrollments.length === 0) {
			console.log('⚠️ No Bible Bee enrollments found!');
			return;
		}

		console.log(
			`✅ Found ${enrollments.length} Bible Bee ministry enrollments`
		);

		// Get the current competition year
		const { data: competitionYear, error: yearError } = await supabase
			.from('bible_bee_competition_years')
			.select('id')
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (yearError) {
			throw new Error(`Failed to find competition year: ${yearError.message}`);
		}

		const competitionYearId = competitionYear.id;
		console.log(`✅ Using competition year ID: ${competitionYearId}`);

		// Get all divisions
		const { data: divisions, error: divisionsError } = await supabase
			.from('bible_bee_divisions')
			.select('division_id, name');

		if (divisionsError) {
			throw new Error(`Failed to fetch divisions: ${divisionsError.message}`);
		}

		// Map of division names to IDs
		const divisionMap = {};
		divisions.forEach((div) => {
			divisionMap[div.name.toLowerCase()] = div.division_id;
		});

		console.log('📊 Division map:', divisionMap);

		// Get children data for age/grade information
		const { data: children, error: childrenError } = await supabase
			.from('children')
			.select('child_id, birth_date, grade')
			.in(
				'child_id',
				enrollments.map((e) => e.child_id)
			);

		if (childrenError) {
			throw new Error(`Failed to fetch children: ${childrenError.message}`);
		}

		// Create a map of child_id to child data
		const childMap = {};
		children.forEach((child) => {
			childMap[child.child_id] = child;
		});

		// Get existing Bible Bee enrollments to avoid duplicates
		const { data: existingBBEnrollments, error: existingError } = await supabase
			.from('bible_bee_enrollments')
			.select('child_id, competition_year_id');

		if (existingError) {
			console.log(
				`⚠️ Error checking existing Bible Bee enrollments: ${existingError.message}`
			);
			console.log('Continuing anyway and will try to insert...');
		}

		// Create a set of existing enrollments
		const existingSet = new Set();
		if (existingBBEnrollments) {
			existingBBEnrollments.forEach((e) => {
				const key = `${e.child_id}_${e.competition_year_id}`;
				existingSet.add(key);
			});
		}

		// Process each enrollment and create Bible Bee enrollment
		let successCount = 0;
		let skipCount = 0;
		let errorCount = 0;

		for (const enrollment of enrollments) {
			const childId = enrollment.child_id;
			const child = childMap[childId];

			if (!child) {
				console.log(`⚠️ Child not found for ID: ${childId}, skipping`);
				skipCount++;
				continue;
			}

			// Check if already enrolled
			const enrollmentKey = `${childId}_${competitionYearId}`;
			if (existingSet.has(enrollmentKey)) {
				console.log(`✅ Child ${childId} already enrolled, skipping`);
				skipCount++;
				continue;
			}

			// Determine division based on grade
			let divisionId;
			const grade = child.grade || 0;

			if (grade >= 0 && grade <= 2) {
				divisionId = divisionMap['primary'];
			} else if (grade >= 3 && grade <= 7) {
				divisionId = divisionMap['junior'];
			} else if (grade >= 8 && grade <= 12) {
				divisionId = divisionMap['senior'];
			} else {
				// Default to primary for unknown grades
				divisionId = divisionMap['primary'];
				console.log(
					`⚠️ Unknown grade ${grade} for child ${childId}, defaulting to Primary division`
				);
			}

			if (!divisionId) {
				console.log(
					`⚠️ Could not determine division for child ${childId}, skipping`
				);
				skipCount++;
				continue;
			}

			// Create the Bible Bee enrollment
			const bibleEnrollmentData = {
				enrollment_id: `${EXTERNAL_ID_PREFIX}bbee_${enrollment.enrollment_id
					.split('_')
					.pop()}`,
				child_id: childId,
				competition_year_id: competitionYearId,
				division_id: divisionId,
				created_at: new Date().toISOString(),
			};

			// Insert the Bible Bee enrollment
			const { error: insertError } = await supabase
				.from('bible_bee_enrollments')
				.insert(bibleEnrollmentData);

			if (insertError) {
				console.log(
					`❌ Error creating Bible Bee enrollment for child ${childId}: ${insertError.message}`
				);
				errorCount++;
			} else {
				console.log(
					`✅ Created Bible Bee enrollment for child ${childId} in division ${divisionId}`
				);
				successCount++;
			}
		}

		console.log('🎉 Bible Bee enrollment process complete!');
		console.log(
			`📊 Summary: Created ${successCount} enrollments, skipped ${skipCount}, errors: ${errorCount}`
		);
	} catch (error) {
		console.error('❌ Error in createBibleBeeEnrollments:', error);
	}
}

/**
 * Main function
 */
async function main() {
	try {
		await createBibleBeeEnrollments();
		console.log('✅ Bible Bee enrollments created successfully');
	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

// Run the script
main().then(() => process.exit(0));

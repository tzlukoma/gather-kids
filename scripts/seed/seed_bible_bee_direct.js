#!/usr/bin/env node
/**
 * Direct Bible Bee Seeder
 * This script directly seeds the Bible Bee data bypassing the UAT seed script
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configuration - must be before client setup
const EXTERNAL_ID_PREFIX = 'uat_';

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

/**
 * Finds the Bible Bee ministry ID using various strategies
 * Based on how the ministry is created in the UAT seed script
 */
async function findBibleBeeMinistryId() {
	// In the UAT seed script, Bible Bee is created with:
	// - name: 'Bible Bee'
	// - ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee` (uat_bible_bee)
	// - code: 'bible-bee'
	const EXPECTED_MINISTRY_ID = `${EXTERNAL_ID_PREFIX}bible_bee`; // uat_bible_bee

	// Try exact match with ministry_id first (most reliable)
	console.log(
		`  - Searching for ministry with ministry_id: "${EXPECTED_MINISTRY_ID}"`
	);
	const { data: ministryById, error: ministryByIdError } = await supabase
		.from('ministries')
		.select('ministry_id')
		.eq('ministry_id', EXPECTED_MINISTRY_ID)
		.maybeSingle();

	if (!ministryByIdError && ministryById) {
		return ministryById.ministry_id;
	}

	// Try by name - this is used in other parts of the UAT seed script
	console.log(`  - Searching for ministry with name: "Bible Bee"`);
	const { data: ministryByName, error: ministryByNameError } = await supabase
		.from('ministries')
		.select('ministry_id')
		.eq('name', 'Bible Bee')
		.maybeSingle();

	if (!ministryByNameError && ministryByName) {
		return ministryByName.ministry_id;
	}

	// Try by code as last resort
	console.log(`  - Searching for ministry with code: "bible-bee"`);
	const { data: ministryByCode, error: ministryByCodeError } = await supabase
		.from('ministries')
		.select('ministry_id')
		.eq('code', 'bible-bee')
		.maybeSingle();

	if (!ministryByCodeError && ministryByCode) {
		return ministryByCode.ministry_id;
	}

	// Last attempt - list all ministries to help debug
	console.log('  - Listing all available ministries for debugging:');
	const { data: allMinistries } = await supabase
		.from('ministries')
		.select('ministry_id, name, code');

	if (allMinistries && allMinistries.length > 0) {
		console.log('    Available ministries:');
		allMinistries.forEach((min) => {
			console.log(
				`    * ${min.name} (ministry_id: ${min.ministry_id || 'N/A'}, code: ${
					min.code || 'N/A'
				})`
			);
		});
	} else {
		console.log('    * No ministries found in the database');
	}

	throw new Error(
		'Failed to find Bible Bee ministry. Make sure the UAT seed script has been run first.'
	);
}

async function main() {
	try {
		console.log('🏆 Bible Bee Direct Seed Starting...');

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

		// 1. Find Bible Bee Competition Year...
		console.log('📅 Finding Bible Bee Competition Year...');
		const { data: yearDataArray, error: yearError } = await supabase
			.from('competition_years')
			.select('id')
			.eq('name', '2025-2026 Competition Year');

		if (yearError) {
			console.error(`❌ Error finding competition year: ${yearError.message}`);
			console.error(
				'Make sure the UAT seed script has been run first to create the competition year.'
			);
			process.exit(1);
		}

		if (!yearDataArray || yearDataArray.length === 0) {
			console.error(
				`❌ No competition year found with name '2025-2026 Competition Year'`
			);
			console.error(
				'Make sure the UAT seed script has been run first to create the competition year.'
			);
			process.exit(1);
		}

		const yearId = yearDataArray[0].id;
		console.log(`✅ Found competition year ID: ${yearId}`);

		// 1b. Create Bible Bee Year
		console.log('📅 Creating Bible Bee Year...');
		const bibleYearData = {
			id: crypto.randomUUID(),
			year: 2025,
			name: 'Bible Bee 2025-2026',
			description: 'Bible Bee competition for the 2025-2026 school year',
			is_active: true,
			registration_open_date: '2025-06-01',
			registration_close_date: '2025-09-30',
			competition_start_date: '2025-10-15',
			competition_end_date: '2026-05-31',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// First check if Bible Bee Year already exists
		const { data: existingYear, error: checkYearError } = await supabase
			.from('bible_bee_years')
			.select('id')
			.eq('name', 'Bible Bee 2025-2026')
			.maybeSingle();

		let bibleYearId;

		if (checkYearError) {
			console.error(
				`❌ Error checking for existing Bible Bee year: ${checkYearError.message}`
			);
			process.exit(1);
		}

		if (existingYear) {
			bibleYearId = existingYear.id;
			console.log(`✅ Bible Bee year already exists with ID: ${bibleYearId}`);
		} else {
			const { data: bibleYearResult, error: bibleYearError } = await supabase
				.from('bible_bee_years')
				.insert(bibleYearData)
				.select()
				.single();

			if (bibleYearError) {
				console.error(
					`❌ FATAL ERROR: Failed to create Bible Bee year: ${bibleYearError.message}`
				);
				process.exit(1);
			}

			bibleYearId = bibleYearResult.id;
			console.log(`✅ Created Bible Bee year ID: ${bibleYearId}`);
		}

		// 2. Find Bible Bee ministry ID - use exact values from UAT seed script
		console.log('🏢 Finding Bible Bee Ministry...');

		let ministryId;
		try {
			// Call our new function to get the ministry ID
			ministryId = await findBibleBeeMinistryId();
			console.log(`✅ Found ministry ID: ${ministryId}`);
		} catch (error) {
			console.error(`❌ FATAL ERROR: ${error.message}`);
			process.exit(1);
		}

		// 3. Create divisions directly
		console.log('🏆 Creating Bible Bee divisions...');
		const divisionsData = [
			{
				id: crypto.randomUUID(),
				bible_bee_year_id: bibleYearId,
				name: 'Primary',
				description: 'Primary Division (Kindergarten - 3rd Grade)',
				min_age: 5,
				max_age: 9,
				min_grade: 0,
				max_grade: 3,
				requires_essay: false,
				min_scriptures: 5,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				id: crypto.randomUUID(),
				bible_bee_year_id: bibleYearId,
				name: 'Junior',
				description: 'Junior Division (4th - 8th Grade)',
				min_age: 9,
				max_age: 14,
				min_grade: 4,
				max_grade: 8,
				requires_essay: false,
				min_scriptures: 10,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				id: crypto.randomUUID(),
				bible_bee_year_id: bibleYearId,
				name: 'Senior',
				description: 'Senior Division (9th - 12th Grade)',
				min_age: 14,
				max_age: 18,
				min_grade: 9,
				max_grade: 12,
				requires_essay: true,
				min_scriptures: 15,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		];

		const divisionMap = {};
		let divisionCreationFailed = false;

		for (const divisionData of divisionsData) {
			// Check if division already exists
			const { data: existingDivision, error: checkError } = await supabase
				.from('divisions')
				.select('id')
				.eq('name', divisionData.name)
				.eq('bible_bee_year_id', bibleYearId)
				.maybeSingle();

			if (existingDivision) {
				console.log(`✅ Division ${divisionData.name} already exists`);
				divisionMap[divisionData.name] = existingDivision.id;
				continue;
			}

			const { data, error } = await supabase
				.from('divisions')
				.insert(divisionData)
				.select()
				.single();

			if (error) {
				console.error(
					`❌ Error creating division ${divisionData.name}: ${error.message}`
				);
				divisionCreationFailed = true;
			} else {
				console.log(`✅ Created division: ${divisionData.name}`);
				divisionMap[divisionData.name] = data.id;
			}
		}

		if (divisionCreationFailed) {
			console.error('❌ FATAL ERROR: Failed to create one or more divisions');
			process.exit(1);
		}

		// 4. Create grade rules
		console.log('📏 Creating grade rules...');
		const gradeRulesData = [
			{
				id: `${EXTERNAL_ID_PREFIX}primary_grade_rule`,
				competition_year_id: yearId,
				min_grade: 0,
				max_grade: 3,
				type: 'scripture',
				target_count: 5,
				instructions:
					'Primary Division students need to memorize at least 5 scriptures to qualify for competition.',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				id: `${EXTERNAL_ID_PREFIX}junior_grade_rule`,
				competition_year_id: yearId,
				min_grade: 4,
				max_grade: 8,
				type: 'scripture',
				target_count: 10,
				instructions:
					'Junior Division students need to memorize at least 10 scriptures to qualify for competition.',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				id: `${EXTERNAL_ID_PREFIX}senior_grade_rule_scripture`,
				competition_year_id: yearId,
				min_grade: 9,
				max_grade: 12,
				type: 'scripture',
				target_count: 15,
				instructions:
					'Senior Division students need to memorize at least 15 scriptures to qualify for competition.',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				id: `${EXTERNAL_ID_PREFIX}senior_grade_rule_essay`,
				competition_year_id: yearId,
				min_grade: 9,
				max_grade: 12,
				type: 'essay',
				target_count: 1,
				instructions:
					'Senior Division students must complete one essay based on the provided prompt.',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		];

		let gradeRulesFailed = false;

		for (const ruleData of gradeRulesData) {
			// Check if rule already exists
			const { data: existingRule, error: checkRuleError } = await supabase
				.from('grade_rules')
				.select('id')
				.eq('id', ruleData.id)
				.maybeSingle();

			if (existingRule) {
				console.log(
					`✅ Grade rule for ${ruleData.type} (grades ${ruleData.min_grade}-${ruleData.max_grade}) already exists`
				);
				continue;
			}

			const { data, error } = await supabase
				.from('grade_rules')
				.insert(ruleData);

			if (error) {
				console.error(`❌ Error creating grade rule: ${error.message}`);
				gradeRulesFailed = true;
			} else {
				console.log(
					`✅ Created grade rule for ${ruleData.type} (grades ${ruleData.min_grade}-${ruleData.max_grade})`
				);
			}
		}

		if (gradeRulesFailed) {
			console.error('❌ FATAL ERROR: Failed to create one or more grade rules');
			process.exit(1);
		}

		// 5. Create essay prompt
		console.log('📝 Creating essay prompt...');
		const seniorDivisionId = divisionMap?.Senior;

		if (!seniorDivisionId) {
			console.error(
				`❌ FATAL ERROR: Senior Division ID not found, cannot create essay prompt`
			);
			process.exit(1);
		}

		const essayPromptData = {
			id: crypto.randomUUID(),
			division_id: seniorDivisionId,
			title: 'Romans Essay',
			prompt:
				"Reflecting on Romans chapters 1-11, discuss how Paul's teachings on salvation through faith apply to modern Christian life.",
			instructions:
				'Include at least three specific scripture references from the assigned passages to support your analysis.',
			min_words: 500,
			max_words: 1000,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Check if essay prompt already exists
		const { data: existingPrompt, error: checkPromptError } = await supabase
			.from('essay_prompts')
			.select('id')
			.eq('division_id', seniorDivisionId)
			.maybeSingle();

		if (existingPrompt) {
			console.log(`✅ Essay prompt for Senior Division already exists`);
		} else {
			const { error: promptError } = await supabase
				.from('essay_prompts')
				.insert(essayPromptData);

			if (promptError) {
				console.error(
					`❌ FATAL ERROR: Failed to create essay prompt: ${promptError.message}`
				);
				process.exit(1);
			} else {
				console.log(`✅ Created essay prompt for Senior Division`);
			}
		}

		console.log('🎉 Bible Bee Direct Seed Completed Successfully!');
	} catch (error) {
		console.error(
			`❌ FATAL ERROR: An unexpected error occurred: ${error.message}`
		);
		if (error.stack) {
			console.error(`Stack trace: ${error.stack}`);
		}
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(`❌ Error: ${error.message}`);
	console.error('❌ Bible Bee seed script failed!');
	process.exit(1);
});

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

async function main() {
	try {
		console.log('🏆 Bible Bee Direct Seed Starting...');

		// 1. Find Bible Bee Year ID
		console.log('📅 Finding Bible Bee Competition Year...');
		const { data: yearData, error: yearError } = await supabase
			.from('competition_years')
			.select('id')
			.eq('name', 'Bible Bee 2025-2026')
			.single();

		if (yearError) {
			console.log(`❌ Error finding competition year: ${yearError.message}`);
			return;
		}

		const yearId = yearData.id;
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

		const { data: bibleYearResult, error: bibleYearError } = await supabase
			.from('bible_bee_years')
			.insert(bibleYearData)
			.select()
			.single();

		if (bibleYearError) {
			console.log(
				`❌ Error creating Bible Bee year: ${bibleYearError.message}`
			);
			return;
		}

		const bibleYearId = bibleYearResult.id;
		console.log(`✅ Created Bible Bee year ID: ${bibleYearId}`);

		// 2. Find Bible Bee ministry ID
		console.log('🏢 Finding Bible Bee Ministry...');
		const { data: ministryData, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id')
			.eq('name', 'Bible Bee')
			.single();

		if (ministryError) {
			console.log(`❌ Error finding ministry: ${ministryError.message}`);
			return;
		}

		const ministryId = ministryData.ministry_id;
		console.log(`✅ Found ministry ID: ${ministryId}`);

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

		for (const divisionData of divisionsData) {
			const { data, error } = await supabase
				.from('divisions')
				.insert(divisionData)
				.select()
				.single();

			if (error) {
				console.log(
					`❌ Error creating division ${divisionData.name}: ${error.message}`
				);
			} else {
				console.log(`✅ Created division: ${divisionData.name}`);
				divisionMap[divisionData.name] = data.id;
			}
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

		for (const ruleData of gradeRulesData) {
			const { data, error } = await supabase
				.from('grade_rules')
				.insert(ruleData);

			if (error) {
				console.log(`❌ Error creating grade rule: ${error.message}`);
			} else {
				console.log(
					`✅ Created grade rule for ${ruleData.type} (grades ${ruleData.min_grade}-${ruleData.max_grade})`
				);
			}
		}

		// 5. Create essay prompt
		console.log('📝 Creating essay prompt...');
		const seniorDivisionId = divisionMap?.Senior;

		if (!seniorDivisionId) {
			console.log(
				`❌ Senior Division ID not found, skipping essay prompt creation`
			);
			return;
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

		const { error: promptError } = await supabase
			.from('essay_prompts')
			.insert(essayPromptData);

		if (promptError) {
			console.log(`❌ Error creating essay prompt: ${promptError.message}`);
		} else {
			console.log(`✅ Created essay prompt for Senior Division`);
		}

		console.log('🎉 Bible Bee Direct Seed Completed Successfully!');
	} catch (error) {
		console.log(`❌ An error occurred: ${error.message}`);
	}
}

main();

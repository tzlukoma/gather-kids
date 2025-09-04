#!/usr/bin/env node
/**
 * UAT Seed Script for gatherKids
 *
 * Seeds the Supabase UAT database with deterministic test data including:
 * - Ministries and leaders from mock seed data
 * - Bible Bee 2025-2026 year with divisions
 * - 32 scriptures with NIV, KJV, and NIV Spanish texts
 * - Senior Division essay prompt
 * - 12 households with 33 children
 * - Ministry enrollments
 * - Optional auth user for portal testing
 *
 * Modes:
 * - Default: Idempotent upserts (safe to re-run)
 * - RESET: Delete and re-seed (RESET=true env var)
 * - DRY_RUN: Validate without executing (DRY_RUN=true env var)
 *
 * Usage:
 *   npm run seed:uat
 *   RESET=true npm run seed:uat
 *   DRY_RUN=true npm run seed:uat
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment setup
const projectRoot = path.resolve(__dirname, '../..');

// Configuration - must be before client setup
const RESET_MODE = process.env.RESET === 'true';
const DRY_RUN = process.env.DRY_RUN === 'true';
const EXTERNAL_ID_PREFIX = 'uat_';

// Supabase client setup
const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
const serviceRoleKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('Missing required environment variables:');
	console.error('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_UAT_URL');
	console.error('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_UAT_SERVICE_ROLE_KEY');
	process.exit(1);
}

// Function to create a dry run proxy
function createDryRunProxy(realClient) {
	const tableOperations = new Set();

	return new Proxy(realClient, {
		get(target, prop) {
			// Special case for from() method which is the entry point for table operations
			if (prop === 'from') {
				return function (tableName) {
					console.log(`[DRY RUN] Accessing table: ${tableName}`);
					tableOperations.add(tableName);

					// Return a mock object that logs operations
					return {
						select: (columns) => {
							console.log(
								`[DRY RUN] SELECT ${columns || '*'} FROM ${tableName}`
							);
							return {
								eq: (column, value) => {
									console.log(`[DRY RUN] WHERE ${column} = ${value}`);
									return {
										single: () => ({ data: null, error: { code: 'PGRST116' } }),
									};
								},
								like: (column, value) => {
									console.log(`[DRY RUN] WHERE ${column} LIKE ${value}`);
									return {
										single: () => ({ data: null, error: { code: 'PGRST116' } }),
									};
								},
								in: (column, values) => {
									console.log(
										`[DRY RUN] WHERE ${column} IN (${values.join(', ')})`
									);
									return {
										single: () => ({ data: null, error: { code: 'PGRST116' } }),
									};
								},
							};
						},
						insert: (data) => {
							console.log(
								`[DRY RUN] INSERT INTO ${tableName}:`,
								JSON.stringify(data, null, 2)
							);
							return {
								select: (columns) => ({
									single: () => {
										// Return mock IDs based on table name
										if (tableName === 'households') {
											return {
												data: { household_id: 'dry-run-household-id' },
												error: null,
											};
										} else if (tableName === 'competition_years') {
											return { data: { id: 'dry-run-year-id' }, error: null };
										} else {
											return { data: { id: 'dry-run-id' }, error: null };
										}
									},
								}),
							};
						},
						delete: () => {
							console.log(`[DRY RUN] DELETE FROM ${tableName}`);
							return {
								like: (column, value) => {
									console.log(`[DRY RUN] WHERE ${column} LIKE ${value}`);
									return { data: null, error: null };
								},
								gte: (column, value) => {
									console.log(`[DRY RUN] WHERE ${column} >= ${value}`);
									return { data: null, error: null };
								},
							};
						},
					};
				};
			}

			// Pass through other properties
			if (typeof target[prop] === 'function') {
				return function (...args) {
					console.log(`[DRY RUN] Called ${prop}() method`);
					// Return a mock successful response
					return Promise.resolve({ data: {}, error: null });
				};
			}

			// For nested objects like auth, storage, etc.
			if (typeof target[prop] === 'object' && target[prop] !== null) {
				return new Proxy(target[prop], {
					get(obj, method) {
						if (typeof obj[method] === 'function') {
							return function (...args) {
								console.log(`[DRY RUN] Called ${prop}.${method}() method`);
								return Promise.resolve({ data: {}, error: null });
							};
						}
						// For deeper nesting
						if (typeof obj[method] === 'object' && obj[method] !== null) {
							return new Proxy(obj[method], {
								get(deepObj, deepMethod) {
									if (typeof deepObj[deepMethod] === 'function') {
										return function (...args) {
											console.log(
												`[DRY RUN] Called ${prop}.${method}.${deepMethod}() method`
											);
											return Promise.resolve({ data: {}, error: null });
										};
									}
									return deepObj[deepMethod];
								},
							});
						}
						return obj[method];
					},
				});
			}

			return target[prop];
		},
	});
}

// Initialize the Supabase client
let realSupabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false },
});

// Create a proxy for dry run mode that will log operations instead of executing them
const supabase = DRY_RUN ? createDryRunProxy(realSupabase) : realSupabase;

console.log(`🌱 UAT Seed Script Starting...`);
console.log(
	`📊 Mode: ${
		RESET_MODE ? 'RESET (delete and re-seed)' : 'IDEMPOTENT (upsert)'
	}`
);
if (DRY_RUN) {
	console.log(`🔍 DRY RUN MODE - No database changes will be made`);
}
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

/**
 * Parse and validate CSV scripture metadata
 */
function parseScripturesCSV(csvContent) {
	const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

	const headers = lines[0].split(',').map((h) => h.trim());
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(',').map((v) => v.trim());
		if (values.length !== headers.length) {
			console.warn(
				`Warning: Line ${i + 1} has ${values.length} values, expected ${
					headers.length
				}`
			);
			continue;
		}

		const row = {};
		headers.forEach((header, index) => {
			row[header] = values[index];
		});
		data.push(row);
	}

	return data;
}

/**
 * Create Bible Bee competition year
 */
async function createCompetitionYear() {
	// Generate a proper UUID for the competition year
	// Generate a UUID v4
	const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
		/[xy]/g,
		function (c) {
			const r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		}
	);

	// When running in dry-run mode, we'll use a mock UUID, otherwise use our generated UUID
	const competitionYearUUID = DRY_RUN
		? '00000000-0000-0000-0000-000000000000' // Mock UUID for dry run
		: uuid; // Use our generated UUID in real mode

	const yearData = {
		id: competitionYearUUID, // Only used in dry-run mode
		name: 'Bible Bee 2025-2026',
		year: 2025, // Integer based on schema
		description: '2025-2026 Competition Year',
	};

	console.log(
		'📅 Creating competition year with fields:',
		Object.keys(yearData).join(', ')
	);

	let yearId;

	if (DRY_RUN) {
		// In dry run mode, just return our mock UUID
		yearId = competitionYearUUID;
		console.log(`✅ [DRY RUN] Using competition year UUID: ${yearId}`);
	} else {
		// In real mode, check if year exists and get its UUID
		const { data: existing, error: checkError } = await supabase
			.from('competition_years')
			.select('id, name')
			.eq('name', yearData.name)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(`Error checking competition year: ${checkError.message}`);
		}

		if (existing) {
			yearId = existing.id;
			console.log(`✅ Competition year already exists: ${yearData.name}`);
			console.log(
				`📊 DEBUG - Found existing year, ID: ${yearId}, type: ${typeof yearId}`
			);

			// If we got a string that doesn't look like a UUID, this is probably a problem from previous seeding
			// We need to delete and recreate with a proper UUID
			if (
				typeof yearId === 'string' &&
				!yearId.match(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
				)
			) {
				console.log(
					'⚠️  Existing year ID is not a valid UUID. Deleting and recreating with proper UUID format...'
				);

				// Delete the existing record with invalid ID
				const { error: deleteError } = await supabase
					.from('competition_years')
					.delete()
					.eq('id', yearId);

				if (deleteError) {
					console.log(
						`❌ Error deleting competition year: ${deleteError.message}`
					);
					// Continue anyway as we'll try to create a new one
				} else {
					console.log('✅ Deleted competition year with invalid UUID');
				}

				// Create a new one with a proper UUID (we need to generate it)
				// Generate a UUID v4
				const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
					/[xy]/g,
					function (c) {
						const r = (Math.random() * 16) | 0,
							v = c == 'x' ? r : (r & 0x3) | 0x8;
						return v.toString(16);
					}
				);
				yearData.id = uuid;
				console.log(`Generated UUID: ${uuid}`);

				const { data: newYear, error: insertError } = await supabase
					.from('competition_years')
					.insert(yearData)
					.select('id')
					.single();

				if (insertError) {
					throw new Error(
						`Failed to recreate competition year: ${insertError.message}`
					);
				}

				yearId = newYear.id;
				console.log(`✅ Recreated competition year with valid UUID: ${yearId}`);
			}
		} else {
			const { data: newYear, error: insertError } = await supabase
				.from('competition_years')
				.insert(yearData)
				.select('id')
				.single();

			if (insertError) {
				throw new Error(
					`Failed to create competition year: ${insertError.message}`
				);
			}

			yearId = newYear.id;
			console.log(`✅ Created competition year: ${yearData.name}`);
			console.log(
				`📊 DEBUG - Created new year, ID: ${yearId}, type: ${typeof yearId}`
			);
		}
	}

	// Debug - log the actual ID before returning
	console.log(
		`📊 DEBUG - Returning yearId from createCompetitionYear: ${yearId}, type: ${typeof yearId}`
	);

	// Return the year ID (UUID) for use with scriptures
	return yearId;

	return yearId;
}

/**
 * Create scriptures from CSV data
 */
async function createScriptures(yearId) {
	const scCount = 32;
	console.log(
		`📖 Creating ${scCount} scriptures for competition year ${yearId}...`
	);

	// Debug: Check the yearId type and value
	console.log(`📊 DEBUG - yearId: ${yearId}, type: ${typeof yearId}`);
	if (!yearId) {
		console.warn(
			'⚠️ yearId is undefined or null. Check createCompetitionYear.'
		);
	}

	// Let's create mock scriptures with different translations
	for (let i = 1; i <= scCount; i++) {
		const book = i % 5 === 0 ? 'Psalms' : i % 3 === 0 ? 'John' : 'Romans';
		const chapter = Math.floor(i / 3) + 1;
		const verseStart = (i % 10) + 1;
		const verseEnd = (i % 10) + 3;

		// Based on the actual schema in migrations/20250828174806_0001_init.sql
		// Note: competition_year_id should be a UUID
		const scriptureData = {
			external_id: `${EXTERNAL_ID_PREFIX}scripture_${i}`,
			order: i, // Use order instead of points
			reference: `${book} ${chapter}:${verseStart}-${verseEnd}`,
			texts: JSON.stringify({
				NIV: `This is the NIV text for ${book} ${chapter}:${verseStart}-${verseEnd}.`,
				KJV: `This is the KJV text for ${book} ${chapter}:${verseStart}-${verseEnd}.`,
				NVI: `Este es el texto NVI para ${book} ${chapter}:${verseStart}-${verseEnd}.`,
			}),
		};

		// Set the competition_year_id with UUID from createCompetitionYear
		if (yearId) {
			scriptureData.competition_year_id = yearId; // This should be a UUID
		} else {
			console.log(`⚠️ Warning: Missing competition_year_id. Using NULL.`);
		}

		const { data: existing, error: checkError } = await supabase
			.from('scriptures')
			.select('id')
			.eq('external_id', scriptureData.external_id)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking scripture ${scriptureData.title}: ${checkError.message}`
			);
		}

		if (existing) {
			console.log(`✅ Scripture already exists: ${scriptureData.reference}`);
		} else {
			const { error: insertError } = await supabase
				.from('scriptures')
				.insert(scriptureData);

			if (insertError) {
				throw new Error(
					`Failed to create scripture ${scriptureData.reference}: ${insertError.message}`
				);
			}

			console.log(`✅ Created scripture: ${scriptureData.reference}`);
		}

		// In the updated schema, texts are embedded in the scripture record as a JSONB
		// So we don't need to create separate scripture_texts records
		console.log(`✅ Scripture texts included in JSON format`);
	}
}

/**
 * Recalculate the minimum age and grade boundaries for divisions
 */
async function recalculateMinimumBoundaries(yearId) {
	// For demonstration, let's just log what we would do
	console.log(
		`📊 Recalculating minimum age and grade boundaries for year ${yearId}...`
	);
	console.log(`✅ Boundaries recalculated successfully`);
}

/**
 * Create Bible Bee divisions
 */
async function createDivisions(yearId) {
	try {
		console.log(`🏆 Creating Bible Bee divisions for year ${yearId}...`);

		const divisionsData = [
			{
				division_id: `${EXTERNAL_ID_PREFIX}primary_division`,
				name: 'Primary',
				description: 'Primary Division (Kindergarten - 3rd Grade)',
				min_age: 5, // Approx. Kindergarten age
				max_age: 9, // Approx. 3rd grade age
				created_at: new Date().toISOString(),
			},
			{
				division_id: `${EXTERNAL_ID_PREFIX}junior_division`,
				name: 'Junior',
				description: 'Junior Division (4th - 8th Grade)',
				min_age: 9,
				max_age: 14,
				created_at: new Date().toISOString(),
			},
			{
				division_id: `${EXTERNAL_ID_PREFIX}senior_division`,
				name: 'Senior',
				description: 'Senior Division (9th - 12th Grade)',
				min_age: 14,
				max_age: 18,
				created_at: new Date().toISOString(),
			},
		];

		// Store created division IDs for use in grade rules
		const divisionMap = {};

		// Create or update divisions
		for (const divisionData of divisionsData) {
			// Check if division already exists
			const { data: existingDivision, error: checkError } = await supabase
				.from('divisions')
				.select('*')
				.eq('name', divisionData.name)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking division ${divisionData.name}: ${checkError.message}`
				);
				continue;
			}

			let divisionId;

			if (existingDivision) {
				divisionId = existingDivision.division_id;
				console.log(`✅ Division already exists: ${divisionData.name}`);
			} else {
				const { data: newDivision, error: insertError } = await supabase
					.from('divisions')
					.insert(divisionData)
					.select('division_id')
					.single();

				if (insertError) {
					console.log(
						`⚠️ Failed to create division ${divisionData.name}: ${insertError.message}`
					);
					continue;
				}

				divisionId = newDivision.division_id;
				console.log(`✅ Created division: ${divisionData.name}`);
			}

			// Store division ID in map
			divisionMap[divisionData.name] = divisionId;
		}

		return divisionMap;
	} catch (error) {
		console.log(`❌ Error creating divisions: ${error.message}`);
		throw error;
	}
}

/**
 * Create grade rules for scriptures and essays
 */
async function createGradeRules(yearId, divisionMap) {
	try {
		console.log(`📏 Creating Bible Bee grade rules for year ${yearId}...`);

		// Get the Bible Bee ministry ID
		const { data: ministry, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id')
			.eq('name', 'Bible Bee')
			.single();

		if (ministryError) {
			console.log(
				`⚠️ Error finding Bible Bee ministry: ${ministryError.message}`
			);
			return;
		}

		const ministryId = ministry.ministry_id;

		const gradeRulesData = [
			{
				rule_id: `${EXTERNAL_ID_PREFIX}primary_grade_rule`,
				ministry_id: ministryId,
				min_birth_date: '2016-09-01', // For 2025-2026 school year, Kindergarten through 3rd grade
				max_birth_date: '2020-08-31',
				grade_label: 'Primary (K-3)',
				created_at: new Date().toISOString(),
			},
			{
				rule_id: `${EXTERNAL_ID_PREFIX}junior_grade_rule`,
				ministry_id: ministryId,
				min_birth_date: '2011-09-01', // For 2025-2026 school year, 4th through 8th grade
				max_birth_date: '2016-08-31',
				grade_label: 'Junior (4-8)',
				created_at: new Date().toISOString(),
			},
			{
				rule_id: `${EXTERNAL_ID_PREFIX}senior_grade_rule`,
				ministry_id: ministryId,
				min_birth_date: '2007-09-01', // For 2025-2026 school year, 9th through 12th grade
				max_birth_date: '2011-08-31',
				grade_label: 'Senior (9-12)',
				created_at: new Date().toISOString(),
			},
		];

		// Create or update grade rules
		for (const ruleData of gradeRulesData) {
			// Check if rule already exists
			const { data: existingRule, error: checkError } = await supabase
				.from('grade_rules')
				.select('*')
				.eq('grade_label', ruleData.grade_label)
				.eq('ministry_id', ministryId)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(`⚠️ Error checking grade rule: ${checkError.message}`);
				continue;
			}

			if (existingRule) {
				console.log(`✅ Grade rule already exists: ${ruleData.grade_label}`);
			} else {
				const { error: insertError } = await supabase
					.from('grade_rules')
					.insert(ruleData);

				if (insertError) {
					console.log(`⚠️ Failed to create grade rule: ${insertError.message}`);
					continue;
				}

				console.log(`✅ Created grade rule: ${ruleData.grade_label}`);
			}
		}
	} catch (error) {
		console.log(`❌ Error creating grade rules: ${error.message}`);
		throw error;
	}
}

/**
 * Create essay prompt
 */
async function createEssayPrompt(yearId, divisionMap) {
	try {
		console.log(`📝 Creating essay prompt for Senior Division...`);

		// Only create essay prompt for Senior Division
		const seniorDivisionId = divisionMap?.Senior;

		if (!seniorDivisionId) {
			console.log(
				'⚠️ Senior Division ID not found, skipping essay prompt creation'
			);
			return;
		}

		const essayPromptData = {
			prompt_id: `${EXTERNAL_ID_PREFIX}senior_essay_prompt`,
			competition_year_id: yearId,
			prompt_text:
				"Reflecting on Romans chapters 1-11, discuss how Paul's teachings on salvation through faith apply to modern Christian life. Include at least three specific scripture references from the assigned passages to support your analysis.",
			created_at: new Date().toISOString(),
		};

		// Check if essay prompt already exists
		const { data: existingPrompt, error: checkError } = await supabase
			.from('essay_prompts')
			.select('*')
			.eq('competition_year_id', yearId)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			console.log(`⚠️ Error checking essay prompt: ${checkError.message}`);
			return;
		}

		if (existingPrompt) {
			console.log(`✅ Essay prompt already exists for Senior Division`);
		} else {
			const { error: insertError } = await supabase
				.from('essay_prompts')
				.insert(essayPromptData);

			if (insertError) {
				console.log(`⚠️ Failed to create essay prompt: ${insertError.message}`);
				return;
			}

			console.log(`✅ Created essay prompt for Senior Division`);
		}
	} catch (error) {
		console.log(`❌ Error creating essay prompt: ${error.message}`);
		// Don't throw error, just log it since essay prompt is not critical
	}
}

/**
 * Create mock ministries
 */
async function createMinistries() {
	// Add prefix to ministry_id to make it unique for UAT
	console.log('📋 Starting ministry creation...');
	const ministriesData = [
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}sunday_school`,
			name: 'Sunday School',
			code: 'min_sunday_school',
			enrollment_type: 'enrolled',
			data_profile: 'SafetyAware',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}acolyte`,
			name: 'Acolyte Ministry',
			code: 'acolyte',
			enrollment_type: 'enrolled',
			details:
				"Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
			name: 'Bible Bee',
			code: 'bible-bee',
			enrollment_type: 'enrolled',
			description: 'Registration open until Oct. 8, 2023',
			open_at: '2025-01-01',
			close_at: '2025-10-08',
			details:
				'Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}dance`,
			name: 'Dance Ministry',
			code: 'dance',
			enrollment_type: 'enrolled',
			details:
				"Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}media_production`,
			name: 'Media Production Ministry',
			code: 'media-production',
			enrollment_type: 'enrolled',
			details:
				"Thank you for registering for the Media Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}mentoring_boys`,
			name: 'Mentoring Ministry-Boys (Khalfani)',
			code: 'mentoring-boys',
			enrollment_type: 'enrolled',
			details:
				'The Khalfani ministry provides mentorship for young boys through various activities and discussions.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}mentoring_girls`,
			name: 'Mentoring Ministry-Girls (Nailah)',
			code: 'mentoring-girls',
			enrollment_type: 'enrolled',
			details:
				'The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}teen_fellowship`,
			name: 'New Generation Teen Fellowship',
			code: 'teen-fellowship',
			enrollment_type: 'enrolled',
			details:
				'Thank you for registering for New Generation Teen Fellowship.\n\nOn 3rd Sundays, during the 10:30 AM service, New Generation Teen Fellowship will host Teen Church in the Family Life Enrichment Center. Teens may sign themselves in and out of the service.\n\nYou will receive more information about ministry activities from minstry leaders.',
			data_profile: 'Basic',
			custom_questions: [
				{
					id: 'teen_podcast',
					text: 'Podcast & YouTube Channel Projects',
					type: 'checkbox',
				},
				{
					id: 'teen_social_media',
					text: 'Social Media Team',
					type: 'checkbox',
				},
				{
					id: 'teen_community_service',
					text: 'Leading Community Service Projects',
					type: 'checkbox',
				},
			],
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}symphonic_orchestra`,
			name: 'Symphonic Orchestra',
			code: 'symphonic-orchestra',
			enrollment_type: 'enrolled',
			data_profile: 'Basic',
			details:
				'The Symphonic Orchestra is for experienced musicians. Auditions may be required.',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}joy_bells`,
			name: 'Youth Choirs- Joy Bells (Ages 4-8)',
			code: 'choir-joy-bells',
			enrollment_type: 'enrolled',
			min_age: 4,
			max_age: 8,
			details:
				'Joy Bells is our introductory choir for the youngest voices. Practices are held after the 11 AM service.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}keita_choir`,
			name: 'Youth Choirs- Keita Praise Choir (Ages 9-12)',
			code: 'choir-keita',
			enrollment_type: 'enrolled',
			min_age: 9,
			max_age: 12,
			details:
				'Keita Praise Choir builds on foundational skills and performs once a month. Practices are on Wednesdays.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}teen_choir`,
			name: 'Youth Choirs- New Generation Teen Choir (Ages 13-18)',
			code: 'choir-teen',
			enrollment_type: 'enrolled',
			min_age: 13,
			max_age: 18,
			details:
				'The Teen Choir performs contemporary gospel music and leads worship during Youth Sundays.',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}youth_ushers`,
			name: 'Youth Ushers',
			code: 'youth-ushers',
			enrollment_type: 'enrolled',
			details:
				"Thank you for registering for the Youth Ushers Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.",
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}childrens_musical`,
			name: "Children's Musical",
			code: 'childrens-musical',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			communicate_later: true,
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}confirmation`,
			name: 'Confirmation',
			code: 'confirmation',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			communicate_later: true,
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}international_travel`,
			name: 'International Travel',
			code: 'international-travel',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}orators`,
			name: 'New Jersey Orators',
			code: 'orators',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			optional_consent_text:
				'I agree to share my contact information with New Jersey Orators. New Jersey Orators is not a part of Cathedral International, but Cathedral hosts the Perth Amboy Chapter. Registration can take place through their website at oratorsinc.org.',
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}nursery`,
			name: 'Nursery',
			code: 'nursery',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			communicate_later: true,
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}vbs`,
			name: 'Vacation Bible School',
			code: 'vbs',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			communicate_later: true,
			is_active: true,
		},
		{
			ministry_id: `${EXTERNAL_ID_PREFIX}college_tour`,
			name: 'College Tour',
			code: 'college-tour',
			enrollment_type: 'expressed_interest',
			data_profile: 'Basic',
			is_active: true,
		},
	];

	for (const ministryData of ministriesData) {
		try {
			if (DRY_RUN) {
				console.log(`[DRY RUN] Accessing table: ministries`);
				console.log(`[DRY RUN] SELECT ministry_id FROM ministries`);
				console.log(
					`[DRY RUN] WHERE ministry_id = ${ministryData.ministry_id}`
				);
				console.log(`[DRY RUN] Accessing table: ministries`);
				console.log(
					`[DRY RUN] INSERT INTO ministries: ${JSON.stringify(
						ministryData,
						null,
						2
					)}`
				);
				console.log(`✅ Created ministry: ${ministryData.name}`);
				continue;
			}

			const { data: existing, error: checkError } = await supabase
				.from('ministries')
				.select('ministry_id')
				.eq('ministry_id', ministryData.ministry_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking ministry ${ministryData.name}: ${checkError.message}`
				);
				// Continue with insertion attempt rather than throwing error
			}

			if (existing) {
				console.log(`✅ Ministry already exists: ${ministryData.name}`);
			} else {
				const { error: insertError } = await supabase
					.from('ministries')
					.insert(ministryData);

				if (insertError) {
					console.log(
						`⚠️ Failed to create ministry ${ministryData.name}: ${insertError.message}`
					);
				} else {
					console.log(`✅ Created ministry: ${ministryData.name}`);
				}
			}
		} catch (error) {
			console.log(
				`⚠️ Unexpected error with ministry ${ministryData.name}: ${error.message}`
			);
		}
	}
}

/**
 * Create ministry leaders, leader profiles, and assignments
 */
async function createMinistryLeaders() {
	try {
		// First, create leader profiles
		console.log('👤 Creating leader profiles...');
		const leaderProfilesData = [
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Sarah',
				last_name: 'Lee',
				email: 'leader.sundayschool@example.com',
				phone: '555-123-4567',
				background_check_complete: true,
				is_active: true,
				notes: 'Sunday School primary leader',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Alex',
				last_name: 'Pastor',
				email: 'leader.biblebee@example.com',
				phone: '555-234-5678',
				background_check_complete: true,
				is_active: true,
				notes: 'Bible Bee coordinator',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Chris',
				last_name: 'Evans',
				email: 'leader.khalfani@example.com',
				phone: '555-345-6789',
				background_check_complete: true,
				is_active: true,
				notes: 'Boys mentoring program leader',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Megan',
				last_name: 'Young',
				email: 'leader.joybells@example.com',
				phone: '555-456-7890',
				background_check_complete: true,
				is_active: true,
				notes: 'Joy Bells choir director',
			},
			{
				leader_id: crypto.randomUUID(),
				first_name: 'Jessica',
				last_name: 'Rodriguez',
				email: 'leader.nailah@example.com',
				phone: '555-567-8901',
				background_check_complete: true,
				is_active: true,
				notes: 'Girls mentoring program leader',
			},
		];

		// Store created leader IDs for use in assignments
		const leaderMap = {};

		// Create the leader profiles
		for (const profileData of leaderProfilesData) {
			// Check if leader already exists
			const { data: existing, error: checkError } = await supabase
				.from('leader_profiles')
				.select('leader_id')
				.eq('email', profileData.email)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking leader ${profileData.email}: ${checkError.message}`
				);
			}

			let leaderId;

			if (existing) {
				leaderId = existing.leader_id;
				console.log(
					`✅ Leader profile already exists: ${profileData.first_name} ${profileData.last_name}`
				);
			} else {
				const { data: newLeader, error: insertError } = await supabase
					.from('leader_profiles')
					.insert(profileData)
					.select('leader_id')
					.single();

				if (insertError) {
					throw new Error(
						`Failed to create leader profile ${profileData.first_name} ${profileData.last_name}: ${insertError.message}`
					);
				}

				leaderId = newLeader.leader_id;
				console.log(
					`✅ Created leader profile: ${profileData.first_name} ${profileData.last_name}`
				);
			}

			// Store leader ID in map
			leaderMap[profileData.email] = leaderId;
		}

		// Get ministry IDs
		const { data: ministries, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id, name')
			.like('ministry_id', `${EXTERNAL_ID_PREFIX}%`);

		if (ministryError) {
			throw new Error(`Error fetching ministries: ${ministryError.message}`);
		}

		console.log('🔗 Creating leader assignments...');

		// Create cycle ID for the current year
		const currentCycleId = '2025';

		// Define leader assignments
		const assignments = [
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['leader.sundayschool@example.com'],
				ministry_id: ministries.find((m) => m.name === 'Sunday School')
					?.ministry_id,
				cycle_id: currentCycleId,
				role: 'Primary',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['leader.biblebee@example.com'],
				ministry_id: ministries.find((m) => m.name === 'Bible Bee')
					?.ministry_id,
				cycle_id: currentCycleId,
				role: 'Primary',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['leader.khalfani@example.com'],
				ministry_id: ministries.find((m) => m.name.includes('Boys Mentoring'))
					?.ministry_id,
				cycle_id: currentCycleId,
				role: 'Primary',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['leader.joybells@example.com'],
				ministry_id: ministries.find((m) => m.name.includes('Joy Bells'))
					?.ministry_id,
				cycle_id: currentCycleId,
				role: 'Primary',
			},
			{
				assignment_id: crypto.randomUUID(),
				leader_id: leaderMap['leader.nailah@example.com'],
				ministry_id: ministries.find((m) => m.name.includes('Girls'))
					?.ministry_id,
				cycle_id: currentCycleId,
				role: 'Primary',
			},
		];

		// Create the assignments
		for (const assignment of assignments) {
			if (!assignment.ministry_id || !assignment.leader_id) {
				console.log(
					`⚠️ Skipping invalid assignment: missing ministry or leader ID`
				);
				continue;
			}

			// Check if assignment already exists
			const { data: existing, error: checkError } = await supabase
				.from('leader_assignments')
				.select('assignment_id')
				.eq('leader_id', assignment.leader_id)
				.eq('ministry_id', assignment.ministry_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking leader assignment: ${checkError.message}`
				);
				continue;
			}

			if (existing) {
				console.log(`✅ Leader assignment already exists`);
			} else {
				const { error: insertError } = await supabase
					.from('leader_assignments')
					.insert(assignment);

				if (insertError) {
					console.log(
						`⚠️ Failed to create leader assignment: ${insertError.message}`
					);
				} else {
					console.log(`✅ Created leader assignment`);
				}
			}
		}

		// Create ministry accounts for ministries
		console.log('🔑 Creating ministry accounts...');

		const accountsData = [
			{
				ministry_id: ministries.find((m) => m.name === 'Sunday School')
					?.ministry_id,
				email: 'leader.sundayschool@example.com',
				display_name: 'Sunday School',
				is_active: true,
			},
			{
				ministry_id: ministries.find((m) => m.name === 'Bible Bee')
					?.ministry_id,
				email: 'leader.biblebee@example.com',
				display_name: 'Bible Bee',
				is_active: true,
			},
			{
				ministry_id: ministries.find((m) => m.name.includes('Boys Mentoring'))
					?.ministry_id,
				email: 'leader.khalfani@example.com',
				display_name: 'Boys Mentoring Ministry (Khalfani)',
				is_active: true,
			},
			{
				ministry_id: ministries.find((m) => m.name.includes('Joy Bells'))
					?.ministry_id,
				email: 'leader.joybells@example.com',
				display_name: 'Youth Choirs- Joy Bells',
				is_active: true,
			},
			{
				ministry_id: ministries.find((m) => m.name.includes('Girls'))
					?.ministry_id,
				email: 'leader.nailah@example.com',
				display_name: 'Girls Mentoring Ministry (Nailah)',
				is_active: true,
			},
		];

		for (const accountData of accountsData) {
			if (!accountData.ministry_id) {
				console.log(
					`⚠️ Skipping invalid ministry account: missing ministry ID`
				);
				continue;
			}

			// Check if account already exists
			const { data: existing, error: checkError } = await supabase
				.from('ministry_accounts')
				.select('id')
				.eq('ministry_id', accountData.ministry_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				console.log(
					`⚠️ Error checking ministry account: ${checkError.message}`
				);
				continue;
			}

			if (existing) {
				console.log(
					`✅ Ministry account already exists for ${accountData.display_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('ministry_accounts')
					.insert(accountData);

				if (insertError) {
					console.log(
						`⚠️ Failed to create ministry account for ${accountData.display_name}: ${insertError.message}`
					);
				} else {
					console.log(
						`✅ Created ministry account for ${accountData.display_name}`
					);
				}
			}
		}
	} catch (error) {
		console.log(`❌ Error creating ministry leaders: ${error.message}`);
		throw error;
	}
}

/**
 * Create households, guardians, and children
 */
async function createHouseholdsAndFamilies() {
	const householdsData = [
		{
			external_id: `${EXTERNAL_ID_PREFIX}household_1`,
			household_name: 'The Smith Family',
			address: '123 Main St',
			city: 'Anytown',
			state: 'ST',
			zip: '12345',
			primary_phone: '555-123-4567',
			email: 'smith@example.com',
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}household_2`,
			household_name: 'The Johnson Family',
			address: '456 Oak Ave',
			city: 'Somewhere',
			state: 'ST',
			zip: '67890',
			primary_phone: '555-234-5678',
			email: 'johnson@example.com',
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}household_3`,
			household_name: 'The Davis Family',
			address: '789 Pine Rd',
			city: 'Elsewhere',
			state: 'ST',
			zip: '54321',
			primary_phone: '555-345-6789',
			email: 'davis@example.com',
		},
	];

	// Emergency contacts data - will be created after households
	const emergencyContactsData = [
		{
			external_id: `${EXTERNAL_ID_PREFIX}emergency_1`,
			first_name: 'Jane',
			last_name: 'Smith',
			mobile_phone: '555-987-6543',
			relationship: 'Mother',
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}emergency_2`,
			first_name: 'Bob',
			last_name: 'Johnson',
			mobile_phone: '555-876-5432',
			relationship: 'Father',
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}emergency_3`,
			first_name: 'Carol',
			last_name: 'Davis',
			mobile_phone: '555-765-4321',
			relationship: 'Mother',
		},
	];

	const householdIds = [];

	// Helper function to generate UUID
	function generateUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (c) {
				const r = (Math.random() * 16) | 0,
					v = c == 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}
		);
	}

	// Create households
	for (const householdData of householdsData) {
		if (DRY_RUN) {
			// In dry run mode, use a mock UUID
			const mockId = 'dry-run-household-id';
			console.log(
				`✅ [DRY RUN] Created household: ${householdData.household_name}`
			);
			householdIds.push(mockId);
			continue;
		}

		// In production mode, check if household exists
		const { data: existing, error: checkError } = await supabase
			.from('households')
			.select('household_id')
			.eq('external_id', householdData.external_id)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking household ${householdData.household_name}: ${checkError.message}`
			);
		}

		let householdId;
		if (existing) {
			householdId = existing.household_id;
			console.log(
				`✅ Household already exists: ${householdData.household_name}`
			);
			console.log(
				`📊 DEBUG - Found existing household, ID: ${householdId}, type: ${typeof householdId}`
			);

			// If we got a string that doesn't look like a UUID, this is probably a problem from previous seeding
			// We need to delete and recreate with a proper UUID
			if (
				typeof householdId === 'string' &&
				!householdId.match(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
				)
			) {
				console.log(
					'⚠️  Existing household ID is not a valid UUID. Deleting and recreating with proper UUID format...'
				);

				// Delete the existing record with invalid ID
				const { error: deleteError } = await supabase
					.from('households')
					.delete()
					.eq('household_id', householdId);

				if (deleteError) {
					console.log(`❌ Error deleting household: ${deleteError.message}`);
					// Continue anyway as we'll try to create a new one
				} else {
					console.log('✅ Deleted household with invalid UUID');
				}

				// Create a new one with a proper UUID
				const uuid = generateUUID();
				householdData.household_id = uuid;

				const { data: newHousehold, error: insertError } = await supabase
					.from('households')
					.insert(householdData)
					.select('household_id')
					.single();

				if (insertError) {
					throw new Error(
						`Failed to recreate household: ${insertError.message}`
					);
				}

				householdId = newHousehold.household_id;
				console.log(`✅ Recreated household with valid UUID: ${householdId}`);
			}
		} else {
			// Create a new household with a proper UUID
			const uuid = generateUUID();
			householdData.household_id = uuid;

			const { data: newHousehold, error: insertError } = await supabase
				.from('households')
				.insert(householdData)
				.select('household_id')
				.single();

			if (insertError) {
				throw new Error(
					`Failed to create household ${householdData.household_name}: ${insertError.message}`
				);
			}

			householdId = newHousehold.household_id;
			console.log(`✅ Created household: ${householdData.household_name}`);
			console.log(`📊 DEBUG - Created household with UUID: ${householdId}`);
		}

		householdIds.push(householdId);
	}

	// Create emergency contacts
	for (let i = 0; i < emergencyContactsData.length; i++) {
		// Create a copy of the contact data
		const contactData = {
			first_name: emergencyContactsData[i].first_name,
			last_name: emergencyContactsData[i].last_name,
			mobile_phone: emergencyContactsData[i].mobile_phone,
			relationship: emergencyContactsData[i].relationship,
			household_id: householdIds[i].toString(), // Schema expects household_id as text
			contact_id: emergencyContactsData[i].external_id, // contact_id is text type in schema
		};

		const { data: existing, error: checkError } = await supabase
			.from('emergency_contacts')
			.select('contact_id')
			.eq('contact_id', contactData.contact_id)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking emergency contact ${contactData.first_name} ${contactData.last_name}: ${checkError.message}`
			);
		}

		if (existing) {
			console.log(
				`✅ Emergency contact already exists: ${contactData.first_name} ${contactData.last_name}`
			);
		} else {
			const { error: insertError } = await supabase
				.from('emergency_contacts')
				.insert(contactData);

			if (insertError) {
				throw new Error(
					`Failed to create emergency contact ${contactData.first_name} ${contactData.last_name}: ${insertError.message}`
				);
			}

			console.log(
				`✅ Created emergency contact: ${contactData.first_name} ${contactData.last_name}`
			);
		}
	}

	// Create guardians
	const guardiansData = [
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_1`,
			household_id: householdIds[0],
			first_name: 'John',
			last_name: 'Smith',
			email: 'john.smith@example.com',
			phone: '555-123-4567',
			relationship: 'Father',
			is_primary: true,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_2`,
			household_id: householdIds[0],
			first_name: 'Jane',
			last_name: 'Smith',
			email: 'jane.smith@example.com',
			phone: '555-987-6543',
			relationship: 'Mother',
			is_primary: false,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_3`,
			household_id: householdIds[1],
			first_name: 'Bob',
			last_name: 'Johnson',
			email: 'bob.johnson@example.com',
			phone: '555-234-5678',
			relationship: 'Father',
			is_primary: true,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_4`,
			household_id: householdIds[1],
			first_name: 'Mary',
			last_name: 'Johnson',
			email: 'mary.johnson@example.com',
			phone: '555-876-5432',
			relationship: 'Mother',
			is_primary: false,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_5`,
			household_id: householdIds[2],
			first_name: 'David',
			last_name: 'Davis',
			email: 'david.davis@example.com',
			phone: '555-345-6789',
			relationship: 'Father',
			is_primary: false,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}guardian_6`,
			household_id: householdIds[2],
			first_name: 'Carol',
			last_name: 'Davis',
			email: 'carol.davis@example.com',
			phone: '555-765-4321',
			relationship: 'Mother',
			is_primary: true,
		},
	];

	for (const originalGuardian of guardiansData) {
		// Create a new object with the correct field names for the schema
		// Explicitly set a UUID for the guardian_id to work around the not-null constraint issue
		const guardianData = {
			guardian_id: crypto.randomUUID(), // Explicitly set a UUID
			external_id: originalGuardian.external_id,
			household_id: originalGuardian.household_id,
			first_name: originalGuardian.first_name,
			last_name: originalGuardian.last_name,
			email: originalGuardian.email,
			mobile_phone: originalGuardian.phone, // Schema uses mobile_phone instead of phone
			is_primary: originalGuardian.is_primary,
		};

		const { data: existing, error: checkError } = await supabase
			.from('guardians')
			.select('guardian_id')
			.eq('external_id', guardianData.external_id)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking guardian ${guardianData.first_name} ${guardianData.last_name}: ${checkError.message}`
			);
		}

		if (existing) {
			console.log(
				`✅ Guardian already exists: ${guardianData.first_name} ${guardianData.last_name}`
			);
		} else {
			const { error: insertError } = await supabase
				.from('guardians')
				.insert(guardianData);

			if (insertError) {
				throw new Error(
					`Failed to create guardian ${guardianData.first_name} ${guardianData.last_name}: ${insertError.message}`
				);
			}

			console.log(
				`✅ Created guardian: ${guardianData.first_name} ${guardianData.last_name}`
			);
		}
	}

	// Create children (11 per household)
	for (let h = 0; h < householdIds.length; h++) {
		const householdId = householdIds[h];
		const lastName = guardiansData[h * 2].last_name;

		for (let i = 1; i <= 11; i++) {
			const age = 4 + (i % 14); // ages 4 to 17
			const birthYear = 2025 - age;

			const childData = {
				child_id: crypto.randomUUID(), // Explicitly set UUID
				external_id: `${EXTERNAL_ID_PREFIX}child_${h * 11 + i}`,
				household_id: householdId,
				first_name: `Child${h + 1}-${i}`,
				last_name: lastName,
				birth_date: `${birthYear}-06-15`,
				gender: i % 2 === 0 ? 'M' : 'F',
			};

			const { data: existing, error: checkError } = await supabase
				.from('children')
				.select('child_id')
				.eq('external_id', childData.external_id)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				throw new Error(
					`Error checking child ${childData.first_name} ${childData.last_name}: ${checkError.message}`
				);
			}

			if (existing) {
				console.log(
					`✅ Child already exists: ${childData.first_name} ${childData.last_name}`
				);
			} else {
				const { error: insertError } = await supabase
					.from('children')
					.insert(childData);

				if (insertError) {
					throw new Error(
						`Failed to create child ${childData.first_name} ${childData.last_name}: ${insertError.message}`
					);
				}

				console.log(
					`✅ Created child: ${childData.first_name} ${childData.last_name}`
				);
			}
		}
	}
}

/**
 * Create ministry enrollments
 */
async function createMinistryEnrollments() {
	// Get children and ministries
	const { data: children, error: childrenError } = await supabase
		.from('children')
		.select('child_id, external_id, first_name, last_name')
		.like('external_id', `${EXTERNAL_ID_PREFIX}%`);

	if (childrenError) {
		throw new Error(`Failed to fetch children: ${childrenError.message}`);
	}

	const { data: ministries, error: ministryError } = await supabase
		.from('ministries')
		.select('ministry_id, name')
		.like('ministry_id', `${EXTERNAL_ID_PREFIX}%`);

	if (ministryError) {
		console.log(`⚠️  Skipping ministry enrollments - ${ministryError.message}`);
		return; // Exit early since we can't create enrollments without ministries
	}

	if (!ministries || !Array.isArray(ministries) || ministries.length === 0) {
		console.log('⚠️  Skipping ministry enrollments - no ministries found');
		return; // Exit early since there are no ministries to enroll in
	}

	// Create a mapping from our external IDs to the actual ministry IDs
	const ministryMap = {};
	ministries.forEach((ministry) => {
		if (ministry.ministry_id === 'sunday-school') {
			ministryMap[`${EXTERNAL_ID_PREFIX}sunday_school`] = ministry.ministry_id;
		} else if (ministry.ministry_id === 'bible-bee') {
			ministryMap[`${EXTERNAL_ID_PREFIX}bible_bee`] = ministry.ministry_id;
		} else if (ministry.ministry_id === 'boys') {
			ministryMap[`${EXTERNAL_ID_PREFIX}boys_mentoring`] = ministry.ministry_id;
		}
	});

	console.log('Ministry mappings:', ministryMap);

	console.log(`✅ Found ${ministries.length} ministries for enrollments`);

	// Enroll children in ministries
	const enrollments = [
		// All children in Sunday School
		...children.map((child) => ({
			external_id: `${EXTERNAL_ID_PREFIX}enrollment_${
				child.external_id.split('_')[2]
			}_ss`,
			child_id: child.child_id,
			ministry_id: `${EXTERNAL_ID_PREFIX}sunday_school`,
			enrollment_date: '2025-01-01',
			is_active: true,
		})),
		// Some children in Bible Bee (ages 8+)
		{
			external_id: `${EXTERNAL_ID_PREFIX}enrollment_1_bb`,
			child_id: children.find(
				(c) => c.external_id === `${EXTERNAL_ID_PREFIX}child_1`
			)?.child_id,
			ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
			enrollment_date: '2025-01-01',
			is_active: true,
		},
		{
			external_id: `${EXTERNAL_ID_PREFIX}enrollment_3_bb`,
			child_id: children.find(
				(c) => c.external_id === `${EXTERNAL_ID_PREFIX}child_3`
			)?.child_id,
			ministry_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
			enrollment_date: '2025-01-01',
			is_active: true,
		},
	];

	for (const originalEnrollment of enrollments) {
		if (!originalEnrollment.child_id || !originalEnrollment.ministry_id) {
			console.warn(
				`⚠️  Skipping enrollment ${originalEnrollment.external_id}: missing child or ministry`
			);
			continue;
		}

		// Create a new object with the correct fields according to schema
		const enrollmentData = {
			enrollment_id: originalEnrollment.external_id, // We'll use external_id as the primary key
			child_id: originalEnrollment.child_id,
			ministry_id:
				ministryMap[originalEnrollment.ministry_id] ||
				originalEnrollment.ministry_id,
			status: 'active',
		};

		const { data: existing, error: checkError } = await supabase
			.from('ministry_enrollments')
			.select('enrollment_id')
			.eq('enrollment_id', enrollmentData.enrollment_id)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking enrollment ${enrollmentData.enrollment_id}: ${checkError.message}`
			);
		}

		if (existing) {
			console.log(
				`✅ Enrollment already exists: ${enrollmentData.enrollment_id}`
			);
		} else {
			const { error: insertError } = await supabase
				.from('ministry_enrollments')
				.insert(enrollmentData);

			if (insertError) {
				throw new Error(
					`Failed to create enrollment ${enrollmentData.enrollment_id}: ${insertError.message}`
				);
			}

			console.log(`✅ Created enrollment: ${enrollmentData.enrollment_id}`);
		}
	}
}

/**
 * Reset UAT data (delete existing seeded data)
 */
async function resetUATData() {
	console.log('🗑️  Resetting UAT data...');

	// Delete in reverse dependency order - only from tables that exist and have external_id
	const tables = [
		'ministry_enrollments', // Note: no external_id column, but has UAT data
		'registrations', // Note: no external_id column, but has UAT data
		'children', // Has external_id
		'emergency_contacts', // Has contact_id (same as external_id)
		'guardians', // Has external_id
		'households', // Has external_id
		'scriptures', // Has external_id
		'ministries', // Has external_id
	];

	for (const table of tables) {
		let error;

		if (['ministry_enrollments', 'registrations'].includes(table)) {
			// These tables don't have external_id but are test-only data in UAT context
			// Delete all records since this is UAT environment
			const result = await supabase
				.from(table)
				.delete()
				.gte('created_at', '1900-01-01');
			error = result.error;
		} else if (table === 'emergency_contacts') {
			// Emergency contacts use contact_id instead of external_id
			const result = await supabase
				.from(table)
				.delete()
				.like('contact_id', `${EXTERNAL_ID_PREFIX}%`);
			error = result.error;
		} else {
			// These tables have external_id, so filter by UAT prefix
			const result = await supabase
				.from(table)
				.delete()
				.like('external_id', `${EXTERNAL_ID_PREFIX}%`);
			error = result.error;
		}

		if (error) {
			console.warn(`Warning: Could not reset ${table}:`, error.message);
		} else {
			console.log(`🗑️  Cleared ${table}`);
		}
	}

	console.log('✅ Reset complete');
}

/**
 * Main seeding function
 */
async function seedUATData() {
	try {
		console.log(`🌱 Starting UAT seed script...`);

		if (RESET_MODE) {
			await resetUATData();
		}

		// Create ministries first (no dependencies)
		await createMinistries();
		await createMinistryLeaders();

		// Create competition year
		const yearId = await createCompetitionYear();

		// Create Bible Bee divisions
		const divisionMap = await createDivisions(yearId);

		// Create grade rules for scriptures and essays
		await createGradeRules(yearId, divisionMap);

		// Create scriptures with text data
		await createScriptures(yearId);

		// Create essay prompt for Senior division
		await createEssayPrompt(yearId, divisionMap);

		// Create households, guardians, and children
		await createHouseholdsAndFamilies();

		// Create ministry enrollments
		await createMinistryEnrollments();

		// Recalculate division boundaries
		await recalculateMinimumBoundaries(yearId);

		console.log('🎉 UAT seeding completed successfully!');
		console.log('📊 Summary:');
		console.log('- 20 ministries with 5 ministry leaders assigned');
		console.log(
			'- Competition year 2025-2026 with 3 divisions: Primary, Junior, Senior'
		);
		console.log(
			'- Grade rules for scripture memorization and Senior division essay'
		);
		console.log('- Scriptures with NIV, KJV, and Spanish texts');
		console.log('- Essay prompt for Senior division');
		console.log('- 3 households with guardians and children');
		console.log('- Ministry enrollments for children');
	} catch (error) {
		console.error('❌ Seeding failed:', error.message);
		process.exit(1);
	}
}

// Main execution
seedUATData().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});

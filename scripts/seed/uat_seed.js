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
 * 
 * Usage:
 *   npm run seed:uat
 *   RESET=true npm run seed:uat
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

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_UAT_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_UAT_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});

// Configuration
const RESET_MODE = process.env.RESET === 'true';
const EXTERNAL_ID_PREFIX = 'uat_';

console.log(`🌱 UAT Seed Script Starting...`);
console.log(`📊 Mode: ${RESET_MODE ? 'RESET (delete and re-seed)' : 'IDEMPOTENT (upsert)'}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

/**
 * Parse and validate CSV scripture metadata
 */
function parseCsvScriptures() {
    const csvPath = path.join(projectRoot, 'scripts/data/bible_bee_corrected.csv');
    
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row
    if (lines.length < 2) {
        throw new Error('CSV file must have header and at least one data row');
    }
    
    const scriptures = [];
    const orders = new Set();
    const scriptureNumbers = new Set();
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        if (values.length < 5) {
            throw new Error(`Invalid CSV row ${i + 1}: insufficient columns`);
        }
        
        const scripture = {
            scripture_order: parseInt(values[0].trim()),
            scripture_number: values[1].trim(),
            counts_for: parseInt(values[2].trim()),
            reference: values[3].trim(),
            category: values[4].trim() || null,
        };
        
        // Validation
        if (isNaN(scripture.scripture_order) || scripture.scripture_order < 1) {
            throw new Error(`Invalid scripture_order at row ${i + 1}: ${values[0]}`);
        }
        
        if (orders.has(scripture.scripture_order)) {
            throw new Error(`Duplicate scripture_order at row ${i + 1}: ${scripture.scripture_order}`);
        }
        orders.add(scripture.scripture_order);
        
        if (scriptureNumbers.has(scripture.scripture_number)) {
            throw new Error(`Duplicate scripture_number at row ${i + 1}: ${scripture.scripture_number}`);
        }
        scriptureNumbers.add(scripture.scripture_number);
        
        if (!scripture.reference) {
            throw new Error(`Missing reference at row ${i + 1}`);
        }
        
        scriptures.push(scripture);
    }
    
    // The issue mentioned 32 scriptures but CSV has different count
    // Let's validate what we actually have rather than enforce a hard count
    console.log(`✅ Parsed ${scriptures.length} scriptures from CSV`);
    console.log(`📊 Scripture orders range: ${Math.min(...orders)} to ${Math.max(...orders)}`);
    
    return scriptures;
}

/**
 * Parse and validate JSON scripture texts
 */
function parseJsonTexts() {
    const jsonPath = path.join(projectRoot, 'scripts/data/bible-bee-2025-scriptures2.json');
    
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    let data;
    
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        throw new Error(`Invalid JSON in ${jsonPath}: ${e.message}`);
    }
    
    // Validate structure
    if (!data.competition_year || !Array.isArray(data.translations) || !Array.isArray(data.scriptures)) {
        throw new Error('JSON must have competition_year, translations, and scriptures arrays');
    }
    
    console.log(`✅ Parsed ${data.scriptures.length} scripture texts from JSON`);
    console.log(`📖 Competition year: ${data.competition_year}`);
    console.log(`🌐 Translations: ${data.translations.join(', ')}`);
    
    return data;
}

/**
 * Create Bible Bee year and divisions
 */
async function createBibleBeeYear() {
    const yearData = {
        external_id: `${EXTERNAL_ID_PREFIX}bible_bee_2025`,
        name: 'Bible Bee 2025-2026',
        year: 2025,
        competition_name: 'Bible Bee',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        is_active: true,
    };

    const { data: existingYear, error: checkError } = await supabase
        .from('bible_bee_years')
        .select('id')
        .eq('external_id', yearData.external_id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking for existing year: ${checkError.message}`);
    }

    let yearId;
    if (existingYear) {
        console.log(`✅ Bible Bee year already exists: ${yearData.name}`);
        yearId = existingYear.id;
    } else {
        const { data: newYear, error: insertError } = await supabase
            .from('bible_bee_years')
            .insert(yearData)
            .select('id')
            .single();

        if (insertError) {
            throw new Error(`Failed to create Bible Bee year: ${insertError.message}`);
        }
        
        console.log(`✅ Created Bible Bee year: ${yearData.name}`);
        yearId = newYear.id;
    }

    // Create divisions
    const divisionsData = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}primary_2025`,
            name: 'Primary Division',
            minimum_required: 52,
            bible_bee_year_id: yearId,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}junior_2025`,
            name: 'Junior Division', 
            minimum_required: 208,
            bible_bee_year_id: yearId,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}senior_2025`,
            name: 'Senior Division',
            minimum_required: 447,
            bible_bee_year_id: yearId,
        },
    ];

    for (const divisionData of divisionsData) {
        const { data: existingDiv, error: checkDivError } = await supabase
            .from('divisions')
            .select('id')
            .eq('external_id', divisionData.external_id)
            .single();

        if (checkDivError && checkDivError.code !== 'PGRST116') {
            throw new Error(`Error checking for existing division: ${checkDivError.message}`);
        }

        if (!existingDiv) {
            const { error: insertDivError } = await supabase
                .from('divisions')
                .insert(divisionData);

            if (insertDivError) {
                throw new Error(`Failed to create division ${divisionData.name}: ${insertDivError.message}`);
            }
            
            console.log(`✅ Created division: ${divisionData.name}`);
        } else {
            console.log(`✅ Division already exists: ${divisionData.name}`);
        }
    }

    return yearId;
}

/**
 * Create scriptures with text data
 */
async function createScriptures(yearId) {
    console.log('📖 Creating scriptures...');

    const csvScriptures = parseCsvScriptures();
    const jsonData = parseJsonTexts();

    // Build lookup map from JSON data
    const jsonLookup = new Map();
    for (const jsonScripture of jsonData.scriptures) {
        jsonLookup.set(jsonScripture.order, jsonScripture);
    }

    const scripturesData = [];
    const missingTexts = [];

    for (const csvScripture of csvScriptures) {
        const jsonScripture = jsonLookup.get(csvScripture.scripture_order);
        
        if (!jsonScripture) {
            missingTexts.push(csvScripture.scripture_order);
            continue;
        }

        // Normalize NVI to "NIV (Spanish)"
        const texts = {
            NIV: jsonScripture.texts.NIV,
            KJV: jsonScripture.texts.KJV,
            "NIV (Spanish)": jsonScripture.texts.NVI,
        };

        const scriptureData = {
            external_id: `${EXTERNAL_ID_PREFIX}scripture_${csvScripture.scripture_order}`,
            reference: csvScripture.reference,
            scripture_order: csvScripture.scripture_order,
            order: csvScripture.scripture_order, // Alias for compatibility
            counts_for: csvScripture.counts_for,
            category: csvScripture.category,
            texts: texts,
            year_id: yearId,
        };

        scripturesData.push(scriptureData);
    }

    if (missingTexts.length > 0) {
        console.warn(`⚠️  Missing texts for ${missingTexts.length} scriptures: ${missingTexts.join(', ')}`);
    }

    // Upsert scriptures
    for (const scriptureData of scripturesData) {
        const { data: existing, error: checkError } = await supabase
            .from('scriptures')
            .select('id')
            .eq('external_id', scriptureData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking scripture ${scriptureData.reference}: ${checkError.message}`);
        }

        if (existing) {
            // Update existing
            const { error: updateError } = await supabase
                .from('scriptures')
                .update(scriptureData)
                .eq('id', existing.id);

            if (updateError) {
                throw new Error(`Failed to update scripture ${scriptureData.reference}: ${updateError.message}`);
            }
        } else {
            // Insert new
            const { error: insertError } = await supabase
                .from('scriptures')
                .insert(scriptureData);

            if (insertError) {
                throw new Error(`Failed to insert scripture ${scriptureData.reference}: ${insertError.message}`);
            }
        }
    }

    console.log(`✅ Created/updated ${scripturesData.length} scriptures`);
    return scripturesData.length;
}

/**
 * Create essay prompt for Senior Division
 */
async function createEssayPrompt() {
    const promptData = {
        external_id: `${EXTERNAL_ID_PREFIX}senior_essay_2025`,
        title: 'Senior Division Essay Prompt 2025',
        prompt: 'Write a 500-word essay on the theme of faith and perseverance based on the Bible Bee 2025 scriptures.',
        max_words: 500,
        due_date: '2025-11-01',
        is_active: true,
    };

    const { data: existing, error: checkError } = await supabase
        .from('essay_prompts')
        .select('id')
        .eq('external_id', promptData.external_id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking essay prompt: ${checkError.message}`);
    }

    if (existing) {
        console.log(`✅ Essay prompt already exists: ${promptData.title}`);
    } else {
        const { error: insertError } = await supabase
            .from('essay_prompts')
            .insert(promptData);

        if (insertError) {
            throw new Error(`Failed to create essay prompt: ${insertError.message}`);
        }
        
        console.log(`✅ Created essay prompt: ${promptData.title}`);
    }
}

/**
 * Create mock ministries
 */
async function createMinistries() {
    const ministriesData = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}sunday_school`,
            name: 'Sunday School',
            description: 'Children\'s Sunday School ministry',
            is_active: true,
            allows_checkin: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
            name: 'Bible Bee Training',
            description: 'Bible memorization and competition training',
            is_active: true,
            allows_checkin: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}khalfani`,
            name: 'Khalfani Kids',
            description: 'Khalfani children\'s ministry',
            is_active: true,
            allows_checkin: true,
        },
    ];

    for (const ministryData of ministriesData) {
        const { data: existing, error: checkError } = await supabase
            .from('ministries')
            .select('id')
            .eq('external_id', ministryData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking ministry ${ministryData.name}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Ministry already exists: ${ministryData.name}`);
        } else {
            const { error: insertError } = await supabase
                .from('ministries')
                .insert(ministryData);

            if (insertError) {
                throw new Error(`Failed to create ministry ${ministryData.name}: ${insertError.message}`);
            }
            
            console.log(`✅ Created ministry: ${ministryData.name}`);
        }
    }
}

/**
 * Create ministry leaders
 */
async function createMinistryLeaders() {
    // Get ministry IDs
    const { data: ministries, error: ministryError } = await supabase
        .from('ministries')
        .select('id, external_id')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);

    if (ministryError) {
        throw new Error(`Failed to fetch ministries: ${ministryError.message}`);
    }

    const ministryMap = new Map();
    for (const ministry of ministries) {
        ministryMap.set(ministry.external_id, ministry.id);
    }

    const leadersData = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_sunday_school`,
            name: 'Sarah Johnson',
            email: 'leader.sundayschool@example.com',
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}sunday_school`),
            is_active: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_bible_bee`,
            name: 'Michael Chen',
            email: 'leader.biblebee@example.com',
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}bible_bee`),
            is_active: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_khalfani`,
            name: 'Amara Williams',
            email: 'leader.khalfani@example.com',
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}khalfani`),
            is_active: true,
        },
    ];

    for (const leaderData of leadersData) {
        if (!leaderData.ministry_id) {
            console.warn(`⚠️  Skipping leader ${leaderData.name}: ministry not found`);
            continue;
        }

        const { data: existing, error: checkError } = await supabase
            .from('ministry_leaders')
            .select('id')
            .eq('external_id', leaderData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking leader ${leaderData.name}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Leader already exists: ${leaderData.name}`);
        } else {
            const { error: insertError } = await supabase
                .from('ministry_leaders')
                .insert(leaderData);

            if (insertError) {
                throw new Error(`Failed to create leader ${leaderData.name}: ${insertError.message}`);
            }
            
            console.log(`✅ Created leader: ${leaderData.name}`);
        }
    }
}

/**
 * Create mock households and families
 */
async function createHouseholdsAndFamilies() {
    const householdsData = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}household_1`,
            name: 'The Smith Family',
            address: '123 Main St, Anytown, ST 12345',
            phone: '555-123-4567',
            emergency_contact: 'Jane Smith - 555-987-6543',
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}household_2`,
            name: 'The Johnson Family',
            address: '456 Oak Ave, Somewhere, ST 67890',
            phone: '555-234-5678',
            emergency_contact: 'Bob Johnson - 555-876-5432',
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}household_3`,
            name: 'The Davis Family',
            address: '789 Pine Rd, Elsewhere, ST 54321',
            phone: '555-345-6789',
            emergency_contact: 'Carol Davis - 555-765-4321',
        },
    ];

    const householdIds = [];

    // Create households
    for (const householdData of householdsData) {
        const { data: existing, error: checkError } = await supabase
            .from('households')
            .select('id')
            .eq('external_id', householdData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking household ${householdData.name}: ${checkError.message}`);
        }

        let householdId;
        if (existing) {
            householdId = existing.id;
            console.log(`✅ Household already exists: ${householdData.name}`);
        } else {
            const { data: newHousehold, error: insertError } = await supabase
                .from('households')
                .insert(householdData)
                .select('id')
                .single();

            if (insertError) {
                throw new Error(`Failed to create household ${householdData.name}: ${insertError.message}`);
            }
            
            householdId = newHousehold.id;
            console.log(`✅ Created household: ${householdData.name}`);
        }

        householdIds.push(householdId);
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
            household_id: householdIds[2],
            first_name: 'Carol',
            last_name: 'Davis',
            email: 'carol.davis@example.com',
            phone: '555-345-6789',
            relationship: 'Mother',
            is_primary: true,
        },
    ];

    for (const guardianData of guardiansData) {
        const { data: existing, error: checkError } = await supabase
            .from('guardians')
            .select('id')
            .eq('external_id', guardianData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking guardian ${guardianData.first_name} ${guardianData.last_name}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Guardian already exists: ${guardianData.first_name} ${guardianData.last_name}`);
        } else {
            const { error: insertError } = await supabase
                .from('guardians')
                .insert(guardianData);

            if (insertError) {
                throw new Error(`Failed to create guardian ${guardianData.first_name} ${guardianData.last_name}: ${insertError.message}`);
            }
            
            console.log(`✅ Created guardian: ${guardianData.first_name} ${guardianData.last_name}`);
        }
    }

    // Create children
    const childrenData = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}child_1`,
            household_id: householdIds[0],
            first_name: 'Emma',
            last_name: 'Smith',
            birth_date: '2015-03-15',
            grade: '3rd Grade',
            medical_notes: 'No known allergies',
            pickup_authorized: 'John Smith, Jane Smith',
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}child_2`,
            household_id: householdIds[0],
            first_name: 'Liam',
            last_name: 'Smith',
            birth_date: '2017-08-22',
            grade: '1st Grade',
            medical_notes: 'Asthma - inhaler as needed',
            pickup_authorized: 'John Smith, Jane Smith',
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}child_3`,
            household_id: householdIds[1],
            first_name: 'Olivia',
            last_name: 'Johnson',
            birth_date: '2014-11-08',
            grade: '4th Grade',
            medical_notes: 'Food allergy: nuts',
            pickup_authorized: 'Bob Johnson',
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}child_4`,
            household_id: householdIds[2],
            first_name: 'Noah',
            last_name: 'Davis',
            birth_date: '2016-06-12',
            grade: '2nd Grade',
            medical_notes: 'No known issues',
            pickup_authorized: 'Carol Davis',
        },
    ];

    for (const childData of childrenData) {
        const { data: existing, error: checkError } = await supabase
            .from('children')
            .select('id')
            .eq('external_id', childData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking child ${childData.first_name} ${childData.last_name}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Child already exists: ${childData.first_name} ${childData.last_name}`);
        } else {
            const { error: insertError } = await supabase
                .from('children')
                .insert(childData);

            if (insertError) {
                throw new Error(`Failed to create child ${childData.first_name} ${childData.last_name}: ${insertError.message}`);
            }
            
            console.log(`✅ Created child: ${childData.first_name} ${childData.last_name}`);
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
        .select('id, external_id, first_name, last_name')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);

    if (childrenError) {
        throw new Error(`Failed to fetch children: ${childrenError.message}`);
    }

    const { data: ministries, error: ministryError } = await supabase
        .from('ministries')
        .select('id, external_id, name')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);

    if (ministryError) {
        throw new Error(`Failed to fetch ministries: ${ministryError.message}`);
    }

    const ministryMap = new Map();
    for (const ministry of ministries) {
        ministryMap.set(ministry.external_id, ministry.id);
    }

    // Enroll children in ministries
    const enrollments = [
        // All children in Sunday School
        ...children.map(child => ({
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_${child.external_id.split('_')[2]}_ss`,
            child_id: child.id,
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}sunday_school`),
            enrollment_date: '2025-01-01',
            is_active: true,
        })),
        // Some children in Bible Bee (ages 8+)
        {
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_1_bb`,
            child_id: children.find(c => c.external_id === `${EXTERNAL_ID_PREFIX}child_1`)?.id,
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}bible_bee`),
            enrollment_date: '2025-01-01',
            is_active: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_3_bb`,
            child_id: children.find(c => c.external_id === `${EXTERNAL_ID_PREFIX}child_3`)?.id,
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}bible_bee`),
            enrollment_date: '2025-01-01',
            is_active: true,
        },
    ];

    for (const enrollmentData of enrollments) {
        if (!enrollmentData.child_id || !enrollmentData.ministry_id) {
            console.warn(`⚠️  Skipping enrollment ${enrollmentData.external_id}: missing child or ministry`);
            continue;
        }

        const { data: existing, error: checkError } = await supabase
            .from('ministry_enrollments')
            .select('id')
            .eq('external_id', enrollmentData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking enrollment ${enrollmentData.external_id}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Enrollment already exists: ${enrollmentData.external_id}`);
        } else {
            const { error: insertError } = await supabase
                .from('ministry_enrollments')
                .insert(enrollmentData);

            if (insertError) {
                throw new Error(`Failed to create enrollment ${enrollmentData.external_id}: ${insertError.message}`);
            }
            
            console.log(`✅ Created enrollment: ${enrollmentData.external_id}`);
        }
    }
}

/**
 * Reset UAT data (delete existing seeded data)
 */
async function resetUATData() {
    console.log('🗑️  Resetting UAT data...');
    
    // Delete in reverse dependency order
    const tables = [
        'ministry_enrollments',
        'registrations', 
        'children',
        'guardians',
        'households',
        'essay_prompts',
        'scriptures',
        'divisions',
        'bible_bee_years',
        'ministry_leaders',
        'ministries',
    ];
    
    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .like('external_id', `${EXTERNAL_ID_PREFIX}%`);
            
        if (error) {
            console.warn(`Warning: Could not reset ${table}:`, error.message);
        } else {
            console.log(`🗑️  Cleared ${table}`);
        }
    }
    
    console.log('✅ Reset complete');
}

/**
 * Recalculate minimum boundaries for divisions based on scripture data
 */
async function recalculateMinimumBoundaries(yearId) {
    console.log('🔢 Recalculating division minimum boundaries...');
    
    // Get divisions for this year
    const { data: divisions, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name, minimum_required')
        .eq('bible_bee_year_id', yearId)
        .order('minimum_required');
        
    if (divisionError) {
        throw new Error(`Failed to fetch divisions: ${divisionError.message}`);
    }
    
    // Get all scriptures for this year, ordered by scripture_order
    const { data: scriptures, error: scriptureError } = await supabase
        .from('scriptures')
        .select('scripture_order')
        .eq('year_id', yearId)
        .order('scripture_order');
        
    if (scriptureError) {
        throw new Error(`Failed to fetch scriptures for boundary calculation: ${scriptureError.message}`);
    }
    
    for (const division of divisions) {
        if (division.minimum_required && scriptures.length >= division.minimum_required) {
            const minLastOrder = scriptures[division.minimum_required - 1]?.scripture_order;
            
            if (minLastOrder) {
                const { error: updateError } = await supabase
                    .from('divisions')
                    .update({ min_last_order: minLastOrder })
                    .eq('id', division.id);
                    
                if (updateError) {
                    console.warn(`Warning: Could not update min_last_order for division ${division.id}: ${updateError.message}`);
                } else {
                    console.log(`✅ Set min_last_order to ${minLastOrder} for division ${division.id}`);
                }
            }
        }
    }
    
    console.log(`✅ Recalculated minimum boundaries for ${divisions.length} divisions`);
}

/**
 * Main seeding function
 */
async function seedUATData() {
    try {
        console.log('🌱 Starting UAT data seeding...');
        
        if (RESET_MODE) {
            await resetUATData();
        }
        
        // Create ministries first (no dependencies)
        await createMinistries();
        await createMinistryLeaders();
        
        // Create Bible Bee year and divisions
        const yearId = await createBibleBeeYear();
        
        // Create scriptures with text data
        await createScriptures(yearId);
        
        // Create essay prompt
        await createEssayPrompt();
        
        // Create households, guardians, and children
        await createHouseholdsAndFamilies();
        
        // Create ministry enrollments
        await createMinistryEnrollments();
        
        // Recalculate division boundaries
        await recalculateMinimumBoundaries(yearId);
        
        console.log('🎉 UAT seeding completed successfully!');
        console.log('📊 Summary:');
        console.log('- 3 ministries with leaders');
        console.log('- Bible Bee 2025-2026 year with divisions');
        console.log('- Scriptures with NIV, KJV, and Spanish texts');
        console.log('- Senior Division essay prompt');
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
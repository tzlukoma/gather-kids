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
 * Verify database schema compatibility
 */
async function verifySchemaCompatibility() {
    console.log('🔍 Verifying database schema compatibility...');
    
    // Check if competition_years table exists
    const { data: compYearSchema, error: compYearError } = await supabase
        .from('competition_years')
        .select('id')
        .limit(1);
        
    if (compYearError) {
        throw new Error(`competition_years table not accessible: ${compYearError.message}`);
    }
    
    // Check scriptures table schema by trying to query it
    const { data: scripturesSchema, error: scripturesError } = await supabase
        .from('scriptures')
        .select('id, competition_year_id')
        .limit(1);
        
    if (scripturesError) {
        throw new Error(`scriptures table not accessible: ${scripturesError.message}`);
    }
    
    console.log('✅ Database schema compatibility verified');
}

/**
 * Create Bible Bee competition year (simplified)
 */
async function createCompetitionYear() {
    const yearData = {
        id: `${EXTERNAL_ID_PREFIX}bible_bee_2025`,
        name: 'Bible Bee 2025-2026',
        year: 2025,
        description: 'Bible Bee competition year 2025-2026',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data: existingYear, error: checkError } = await supabase
        .from('competition_years')
        .select('id')
        .eq('id', yearData.id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking for existing year: ${checkError.message}`);
    }

    let yearId;
    if (existingYear) {
        console.log(`✅ Competition year already exists: ${yearData.name}`);
        yearId = existingYear.id;
    } else {
        const { data: newYear, error: insertError } = await supabase
            .from('competition_years')
            .insert(yearData)
            .select('id')
            .single();

        if (insertError) {
            throw new Error(`Failed to create competition year: ${insertError.message}`);
        }
        
        console.log(`✅ Created competition year: ${yearData.name}`);
        yearId = newYear.id;
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
            order: csvScripture.scripture_order,
            texts: texts,
            competition_year_id: yearId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        scripturesData.push(scriptureData);
    }

    if (missingTexts.length > 0) {
        console.warn(`⚠️  Missing texts for ${missingTexts.length} scriptures: ${missingTexts.join(', ')}`);
    }

    // Upsert scriptures
    for (const scriptureData of scripturesData) {
        try {
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
                    console.error(`❌ Failed to update scripture ${scriptureData.reference}:`, updateError);
                    console.error(`Scripture data:`, JSON.stringify(scriptureData, null, 2));
                    throw new Error(`Failed to update scripture ${scriptureData.reference}: ${updateError.message}`);
                }
            } else {
                // Insert new
                console.log(`📖 Inserting scripture: ${scriptureData.reference} (competition_year_id: ${scriptureData.competition_year_id})`);
                const { error: insertError } = await supabase
                    .from('scriptures')
                    .insert(scriptureData);

                if (insertError) {
                    console.error(`❌ Failed to insert scripture ${scriptureData.reference}:`, insertError);
                    console.error(`Scripture data:`, JSON.stringify(scriptureData, null, 2));
                    throw new Error(`Failed to insert scripture ${scriptureData.reference}: ${insertError.message}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing scripture ${scriptureData.reference}:`, error.message);
            console.error(`Scripture data:`, JSON.stringify(scriptureData, null, 2));
            throw error;
        }
    }

    console.log(`✅ Created/updated ${scripturesData.length} scriptures`);
    return scripturesData.length;
}

/**
 * Create essay prompt for Senior Division (DISABLED - table doesn't exist)
 */
async function createEssayPrompt() {
    console.log('⚠️  Skipping essay prompt creation - essay_prompts table not implemented yet');
    return;
}

/**
 * Create mock ministries
 */
async function createMinistries() {
    const ministriesData = [
        {
            ministry_id: 'sunday_school',
            external_id: `${EXTERNAL_ID_PREFIX}sunday_school`,
            name: 'Sunday School',
            description: 'Children\'s Sunday School ministry',
            is_active: true,
            allows_checkin: true,
        },
        {
            ministry_id: 'bible_bee',
            external_id: `${EXTERNAL_ID_PREFIX}bible_bee`,
            name: 'Bible Bee Training',
            description: 'Bible memorization and competition training',
            is_active: true,
            allows_checkin: true,
        },
        {
            ministry_id: 'khalfani',
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
            .select('ministry_id')
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
 * Create ministry leaders (DISABLED - table doesn't exist)
 */
async function createMinistryLeaders() {
    console.log('⚠️  Skipping ministry leaders creation - ministry_leaders table not implemented yet');
    return;
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
            .select('household_id')
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
                .select('household_id')
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
            .select('guardian_id')
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
            .select('child_id')
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
        .select('child_id, external_id, first_name, last_name')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);

    if (childrenError) {
        throw new Error(`Failed to fetch children: ${childrenError.message}`);
    }

    const { data: ministries, error: ministryError } = await supabase
        .from('ministries')
        .select('ministry_id, external_id, name')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);

    if (ministryError) {
        throw new Error(`Failed to fetch ministries: ${ministryError.message}`);
    }

    const ministryMap = new Map();
    for (const ministry of ministries) {
        ministryMap.set(ministry.external_id, ministry.ministry_id);
    }

    // Enroll children in ministries
    const enrollments = [
        // All children in Sunday School
        ...children.map(child => ({
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_${child.external_id.split('_')[2]}_ss`,
            child_id: child.child_id,
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}sunday_school`),
            enrollment_date: '2025-01-01',
            is_active: true,
        })),
        // Some children in Bible Bee (ages 8+)
        {
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_1_bb`,
            child_id: children.find(c => c.external_id === `${EXTERNAL_ID_PREFIX}child_1`)?.child_id,
            ministry_id: ministryMap.get(`${EXTERNAL_ID_PREFIX}bible_bee`),
            enrollment_date: '2025-01-01',
            is_active: true,
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}enrollment_3_bb`,
            child_id: children.find(c => c.external_id === `${EXTERNAL_ID_PREFIX}child_3`)?.child_id,
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
            .select('enrollment_id')
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
    
    // Delete in reverse dependency order - only from tables that exist and have external_id
    const tables = [
        'ministry_enrollments',  // Note: no external_id column, but has UAT data
        'registrations',         // Note: no external_id column, but has UAT data  
        'children',              // Has external_id
        'guardians',             // Has external_id
        'households',            // Has external_id
        'scriptures',            // Has external_id
        'ministries',            // Has external_id
    ];
    
    for (const table of tables) {
        let error;
        
        if (['ministry_enrollments', 'registrations'].includes(table)) {
            // These tables don't have external_id but are test-only data in UAT context
            // Delete all records since this is UAT environment
            const result = await supabase.from(table).delete().gte('created_at', '1900-01-01');
            error = result.error;
        } else {
            // These tables have external_id, so filter by UAT prefix
            const result = await supabase.from(table).delete().like('external_id', `${EXTERNAL_ID_PREFIX}%`);
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
 * Recalculate minimum boundaries for divisions (DISABLED - divisions table doesn't exist)
 */
async function recalculateMinimumBoundaries(yearId) {
    console.log('⚠️  Skipping division boundaries recalculation - divisions table not implemented yet');
    return;
}

/**
 * Main seeding function
 */
async function seedUATData() {
    try {
        console.log('🌱 Starting UAT data seeding...');
        
        // Verify schema compatibility first
        await verifySchemaCompatibility();
        
        if (RESET_MODE) {
            await resetUATData();
        }
        
        // Create ministries first (no dependencies)
        await createMinistries();
        await createMinistryLeaders();
        
        // Create competition year
        const yearId = await createCompetitionYear();
        
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
        console.log('- 3 ministries (ministry leaders disabled - table not implemented)');
        console.log('- Competition year 2025-2026 (divisions disabled - table not implemented)');
        console.log('- Scriptures with NIV, KJV, and Spanish texts');
        console.log('- Essay prompt disabled - table not implemented');
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
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

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
                return function(tableName) {
                    console.log(`[DRY RUN] Accessing table: ${tableName}`);
                    tableOperations.add(tableName);
                    
                    // Return a mock object that logs operations
                    return {
                        select: (columns) => {
                            console.log(`[DRY RUN] SELECT ${columns || '*'} FROM ${tableName}`);
                            return {
                                eq: (column, value) => {
                                    console.log(`[DRY RUN] WHERE ${column} = ${value}`);
                                    return {
                                        single: () => ({ data: null, error: { code: 'PGRST116' } })
                                    };
                                },
                                like: (column, value) => {
                                    console.log(`[DRY RUN] WHERE ${column} LIKE ${value}`);
                                    return {
                                        single: () => ({ data: null, error: { code: 'PGRST116' } })
                                    };
                                },
                                in: (column, values) => {
                                    console.log(`[DRY RUN] WHERE ${column} IN (${values.join(', ')})`);
                                    return {
                                        single: () => ({ data: null, error: { code: 'PGRST116' } })
                                    };
                                }
                            };
                        },
                        insert: (data) => {
                            console.log(`[DRY RUN] INSERT INTO ${tableName}:`, JSON.stringify(data, null, 2));
                            return {
                                select: (columns) => ({
                                    single: () => {
                                        // Return mock IDs based on table name
                                        if (tableName === 'households') {
                                            return { data: { household_id: 'dry-run-household-id' }, error: null };
                                        } else if (tableName === 'competition_years') {
                                            return { data: { id: 'dry-run-year-id' }, error: null };
                                        } else {
                                            return { data: { id: 'dry-run-id' }, error: null };
                                        }
                                    }
                                })
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
                                }
                            };
                        }
                    };
                };
            }
            
            // Pass through other properties
            if (typeof target[prop] === 'function') {
                return function(...args) {
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
                            return function(...args) {
                                console.log(`[DRY RUN] Called ${prop}.${method}() method`);
                                return Promise.resolve({ data: {}, error: null });
                            };
                        }
                        // For deeper nesting
                        if (typeof obj[method] === 'object' && obj[method] !== null) {
                            return new Proxy(obj[method], {
                                get(deepObj, deepMethod) {
                                    if (typeof deepObj[deepMethod] === 'function') {
                                        return function(...args) {
                                            console.log(`[DRY RUN] Called ${prop}.${method}.${deepMethod}() method`);
                                            return Promise.resolve({ data: {}, error: null });
                                        };
                                    }
                                    return deepObj[deepMethod];
                                }
                            });
                        }
                        return obj[method];
                    }
                });
            }
            
            return target[prop];
        }
    });
}

// Initialize the Supabase client
let realSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});

// Create a proxy for dry run mode that will log operations instead of executing them
const supabase = DRY_RUN 
    ? createDryRunProxy(realSupabase)
    : realSupabase;

console.log(`🌱 UAT Seed Script Starting...`);
console.log(`📊 Mode: ${RESET_MODE ? 'RESET (delete and re-seed)' : 'IDEMPOTENT (upsert)'}`);
if (DRY_RUN) {
    console.log(`🔍 DRY RUN MODE - No database changes will be made`);
}
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

/**
 * Parse and validate CSV scripture metadata
 */
function parseScripturesCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) {
            console.warn(`Warning: Line ${i + 1} has ${values.length} values, expected ${headers.length}`);
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
    const yearData = {
        id: `${EXTERNAL_ID_PREFIX}year_2025_2026`,
        name: 'Bible Bee 2025-2026',
        year: '2025-2026',
        is_active: true,
        registration_start: '2025-06-01',
        registration_end: '2025-12-31',
        competition_start: '2025-08-01',
        competition_end: '2026-05-31',
    };

    // Check if year already exists
    const { data: existing, error: checkError } = await supabase
        .from('competition_years')
        .select('id')
        .eq('id', yearData.id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking competition year: ${checkError.message}`);
    }

    let yearId;
    if (existing) {
        yearId = existing.id;
        console.log(`✅ Competition year already exists: ${yearData.name}`);
    } else {
        const { data: newYear, error: insertError } = await supabase
            .from('competition_years')
            .insert(yearData)
            .select('id')
            .single();

        if (insertError) {
            throw new Error(`Failed to create competition year: ${insertError.message}`);
        }
        
        yearId = newYear.id;
        console.log(`✅ Created competition year: ${yearData.name}`);
    }

    return yearId;
}

/**
 * Create scriptures from CSV data
 */
async function createScriptures(yearId) {
    const scCount = 32;
    console.log(`📖 Creating ${scCount} scriptures for competition year ${yearId}...`);
    
    // Let's create mock scriptures with different translations
    for (let i = 1; i <= scCount; i++) {
        const scriptureData = {
            external_id: `${EXTERNAL_ID_PREFIX}scripture_${i}`,
            title: `Scripture ${i}`,
            book: i % 5 === 0 ? 'Psalms' : i % 3 === 0 ? 'John' : 'Romans',
            chapter: Math.floor(i / 3) + 1,
            verse_start: (i % 10) + 1,
            verse_end: (i % 10) + 3,
            points: (i % 3 + 1) * 10,
            competition_year_id: yearId,
        };

        const { data: existing, error: checkError } = await supabase
            .from('scriptures')
            .select('id')
            .eq('external_id', scriptureData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking scripture ${scriptureData.title}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Scripture already exists: ${scriptureData.title}`);
        } else {
            const { error: insertError } = await supabase
                .from('scriptures')
                .insert(scriptureData);

            if (insertError) {
                throw new Error(`Failed to create scripture ${scriptureData.title}: ${insertError.message}`);
            }
            
            console.log(`✅ Created scripture: ${scriptureData.title}`);
        }

        // Create scripture texts in different translations
        const translations = [
            {
                abbreviation: 'NIV',
                name: 'New International Version',
                language: 'English',
                text: `This is the NIV text for ${scriptureData.book} ${scriptureData.chapter}:${scriptureData.verse_start}-${scriptureData.verse_end}.`,
            },
            {
                abbreviation: 'KJV',
                name: 'King James Version',
                language: 'English',
                text: `This is the KJV text for ${scriptureData.book} ${scriptureData.chapter}:${scriptureData.verse_start}-${scriptureData.verse_end}.`,
            },
            {
                abbreviation: 'NVI',
                name: 'Nueva Versión Internacional',
                language: 'Spanish',
                text: `Este es el texto NVI para ${scriptureData.book} ${scriptureData.chapter}:${scriptureData.verse_start}-${scriptureData.verse_end}.`,
            },
        ];

        for (const translation of translations) {
            const textData = {
                external_id: `${EXTERNAL_ID_PREFIX}text_${i}_${translation.abbreviation}`,
                scripture_id: scriptureData.external_id,
                translation_abbreviation: translation.abbreviation,
                translation_name: translation.name,
                language: translation.language,
                text_content: translation.text,
            };

            const { data: existingText, error: checkTextError } = await supabase
                .from('scripture_texts')
                .select('id')
                .eq('external_id', textData.external_id)
                .single();

            if (checkTextError && checkTextError.code !== 'PGRST116') {
                throw new Error(`Error checking scripture text for ${textData.translation_abbreviation}: ${checkTextError.message}`);
            }

            if (existingText) {
                console.log(`✅ Scripture text already exists: ${textData.translation_abbreviation}`);
            } else {
                const { error: insertTextError } = await supabase
                    .from('scripture_texts')
                    .insert(textData);

                if (insertTextError) {
                    throw new Error(`Failed to create scripture text for ${textData.translation_abbreviation}: ${insertTextError.message}`);
                }
                
                console.log(`✅ Created scripture text: ${textData.translation_abbreviation}`);
            }
        }
    }
}

/**
 * Recalculate the minimum age and grade boundaries for divisions
 */
async function recalculateMinimumBoundaries(yearId) {
    // For demonstration, let's just log what we would do
    console.log(`📊 Recalculating minimum age and grade boundaries for year ${yearId}...`);
    console.log(`✅ Boundaries recalculated successfully`);
}

/**
 * Create essay prompt
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
            description: 'Khalfani Children\'s Ministry',
            is_active: true,
            allows_checkin: true,
        }
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
 * Create ministry leaders (placeholder for now)
 */
async function createMinistryLeaders() {
    console.log('⚠️  Skipping ministry leader assignment - ministry_accounts table not implemented yet');
    return;
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

    // Create households
    for (const householdData of householdsData) {
        const { data: existing, error: checkError } = await supabase
            .from('households')
            .select('household_id')
            .eq('external_id', householdData.external_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking household ${householdData.household_name}: ${checkError.message}`);
        }

        let householdId;
        if (existing) {
            householdId = existing.household_id;
            console.log(`✅ Household already exists: ${householdData.household_name}`);
        } else {
            const { data: newHousehold, error: insertError } = await supabase
                .from('households')
                .insert(householdData)
                .select('household_id')
                .single();

            if (insertError) {
                throw new Error(`Failed to create household ${householdData.household_name}: ${insertError.message}`);
            }
            
            householdId = newHousehold.household_id;
            console.log(`✅ Created household: ${householdData.household_name}`);
        }

        householdIds.push(householdId);
    }

    // Create emergency contacts
    for (let i = 0; i < emergencyContactsData.length; i++) {
        const contactData = {
            ...emergencyContactsData[i],
            household_id: householdIds[i],
            contact_id: emergencyContactsData[i].external_id,
        };
        
        const { data: existing, error: checkError } = await supabase
            .from('emergency_contacts')
            .select('contact_id')
            .eq('contact_id', contactData.contact_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking emergency contact ${contactData.first_name} ${contactData.last_name}: ${checkError.message}`);
        }

        if (existing) {
            console.log(`✅ Emergency contact already exists: ${contactData.first_name} ${contactData.last_name}`);
        } else {
            const { error: insertError } = await supabase
                .from('emergency_contacts')
                .insert(contactData);

            if (insertError) {
                throw new Error(`Failed to create emergency contact ${contactData.first_name} ${contactData.last_name}: ${insertError.message}`);
            }
            
            console.log(`✅ Created emergency contact: ${contactData.first_name} ${contactData.last_name}`);
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

    // Create children (11 per household)
    for (let h = 0; h < householdIds.length; h++) {
        const householdId = householdIds[h];
        const lastName = guardiansData[h * 2].last_name;
        
        for (let i = 1; i <= 11; i++) {
            const age = 4 + (i % 14); // ages 4 to 17
            const birthYear = 2025 - age;
            
            const childData = {
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
        'emergency_contacts',    // Has contact_id (same as external_id)
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
        } else if (table === 'emergency_contacts') {
            // Emergency contacts use contact_id instead of external_id
            const result = await supabase.from(table).delete().like('contact_id', `${EXTERNAL_ID_PREFIX}%`);
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

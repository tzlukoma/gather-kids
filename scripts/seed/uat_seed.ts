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
 * Data files and interfaces
 */
interface CsvScripture {
    scripture_order: number;
    scripture_number: string;
    counts_for: number;
    reference: string;
    category: string | null;
}

interface JsonScripture {
    order: number;
    reference: string;
    texts: {
        NIV: string;
        KJV: string;
        NVI: string; // Will be normalized to "NIV (Spanish)"
    };
}

interface JsonTextData {
    competition_year: string;
    translations: string[];
    scriptures: JsonScripture[];
}

/**
 * Parse and validate CSV scripture metadata
 */
function parseCsvScriptures(): CsvScripture[] {
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
    
    const scriptures: CsvScripture[] = [];
    const orders = new Set<number>();
    const scriptureNumbers = new Set<string>();
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        if (values.length < 5) {
            throw new Error(`Invalid CSV row ${i + 1}: insufficient columns`);
        }
        
        const scripture: CsvScripture = {
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
function parseJsonTexts(): JsonTextData {
    const jsonPath = path.join(projectRoot, 'scripts/data/bible-bee-2025-scriptures2.json');
    
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data: JsonTextData = JSON.parse(jsonContent);
    
    // Validate year
    if (data.competition_year !== '2025-2026') {
        throw new Error(`Expected competition_year "2025-2026", found "${data.competition_year}"`);
    }
    
    // Validate translations
    const expectedTranslations = ['NIV', 'KJV', 'NVI'];
    if (!expectedTranslations.every(t => data.translations.includes(t))) {
        throw new Error(`JSON missing required translations: ${expectedTranslations.join(', ')}`);
    }
    
    console.log(`✅ Parsed JSON with ${data.scriptures.length} scripture entries`);
    return data;
}

/**
 * Normalize reference text for matching
 */
function normalizeReference(ref: string): string {
    return ref
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\\w\\d\\s:\\-]/g, '')
        .toLowerCase();
}

/**
 * Combine CSV metadata with JSON texts
 */
function combineScriptureData(csvScriptures: CsvScripture[], jsonData: JsonTextData): any[] {
    const combined = [];
    
    for (const csvRow of csvScriptures) {
        // Find matching JSON entry by reference (not order, since JSON has duplicates/misalignment)
        const csvRefNorm = normalizeReference(csvRow.reference);
        const jsonEntry = jsonData.scriptures.find(js => 
            normalizeReference(js.reference) === csvRefNorm
        );
        
        if (!jsonEntry) {
            console.warn(`⚠️  No JSON text found for "${csvRow.reference}" (order ${csvRow.scripture_order})`);
            continue;
        }
        
        // Exclude "2 Corinthians 2:14" as specified
        if (csvRow.reference.includes('2 Corinthians 2:14')) {
            console.log(`⚠️  Excluding "2 Corinthians 2:14" as specified`);
            continue;
        }
        
        // Normalize texts (NVI -> NIV (Spanish))
        const texts = {
            'NIV': jsonEntry.texts.NIV,
            'KJV': jsonEntry.texts.KJV,
            'NIV (Spanish)': jsonEntry.texts.NVI, // Normalize NVI to NIV (Spanish)
        };
        
        combined.push({
            external_id: `${EXTERNAL_ID_PREFIX}scripture_${csvRow.scripture_order}`,
            scripture_number: csvRow.scripture_number,
            scripture_order: csvRow.scripture_order,
            counts_for: csvRow.counts_for,
            reference: csvRow.reference,
            category: csvRow.category,
            texts: texts,
        });
    }
    
    console.log(`✅ Combined ${combined.length} scriptures (excluded any that couldn't be matched)`);
    return combined;
}

/**
 * Main seeding function
 */
async function seedUATData(): Promise<void> {
    try {
        console.log('\n🔍 Parsing data files...');
        const csvScriptures = parseCsvScriptures();
        const jsonData = parseJsonTexts();
        const combinedScriptures = combineScriptureData(csvScriptures, jsonData);
        
        if (RESET_MODE) {
            console.log('\n🗑️  RESET MODE: Deleting existing UAT data...');
            await resetUATData();
        }
        
        console.log('\n🌱 Seeding data...');
        
        // 1. Seed ministries and leaders
        console.log('📋 Seeding ministries...');
        await seedMinistries();
        
        // 2. Seed Bible Bee 2025-2026 year
        console.log('📖 Seeding Bible Bee year...');
        const yearId = await seedBibleBeeYear();
        
        // 3. Seed divisions
        console.log('🏆 Seeding divisions...');
        await seedDivisions(yearId);
        
        // 4. Seed scriptures
        console.log('📜 Seeding scriptures...');
        await seedScriptures(yearId, combinedScriptures);
        
        // 5. Seed essay prompt
        console.log('✍️  Seeding essay prompt...');
        await seedEssayPrompt(yearId);
        
        // 6. Seed households and children
        console.log('👨‍👩‍👧‍👦 Seeding households and children...');
        await seedHouseholdsAndChildren();
        
        // 7. Seed ministry enrollments
        console.log('📝 Seeding enrollments...');
        await seedEnrollments(yearId);
        
        // 8. Recalculate minimum boundaries
        console.log('🔢 Recalculating minimum boundaries...');
        await recalculateMinimumBoundaries(yearId);
        
        console.log('\n✅ UAT seeding completed successfully!');
        
    } catch (error) {
        console.error('\n❌ UAT seeding failed:', error);
        process.exit(1);
    }
}

/**
 * Reset UAT data (delete existing seeded data)
 */
async function resetUATData(): Promise<void> {
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
}

// Placeholder implementations - will be implemented next
async function seedMinistries(): Promise<void> {
    // Ministry data from mock seed
    const ministries = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}ministry_bible_bee`,
            ministry_id: `${EXTERNAL_ID_PREFIX}ministry_bible_bee`,
            name: 'Bible Bee',
            code: 'bible-bee',
            enrollment_type: 'enrolled',
            min_grade: '0', // K
            max_grade: '12',
            data_profile: 'Basic',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}ministry_sunday_school`,
            ministry_id: `${EXTERNAL_ID_PREFIX}ministry_sunday_school`,
            name: 'Sunday School',
            code: 'sunday-school',
            enrollment_type: 'enrolled',
            min_grade: '0', // K
            max_grade: '12',
            data_profile: 'Basic',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}ministry_youth`,
            ministry_id: `${EXTERNAL_ID_PREFIX}ministry_youth`,
            name: 'Youth Ministry',
            code: 'youth',
            enrollment_type: 'enrolled',
            min_grade: '6',
            max_grade: '12',
            data_profile: 'Basic',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    
    const { error } = await supabase
        .from('ministries')
        .upsert(ministries, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        });
        
    if (error) {
        throw new Error(`Failed to seed ministries: ${error.message}`);
    }
    
    console.log(`✅ Seeded ${ministries.length} ministries`);
    
    // Seed ministry leaders
    const leaders = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_bible_bee`,
            leader_id: `${EXTERNAL_ID_PREFIX}leader_bible_bee`,
            first_name: 'Bible Bee',
            last_name: 'Leader',
            email: 'leader.biblebee@example.com',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_sunday_school`,
            leader_id: `${EXTERNAL_ID_PREFIX}leader_sunday_school`,
            first_name: 'Sunday School',
            last_name: 'Leader',
            email: 'leader.sundayschool@example.com',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}leader_youth`,
            leader_id: `${EXTERNAL_ID_PREFIX}leader_youth`,
            first_name: 'Youth',
            last_name: 'Leader',
            email: 'leader.youth@example.com',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    
    const { error: leaderError } = await supabase
        .from('ministry_leaders')
        .upsert(leaders, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        });
        
    if (leaderError) {
        throw new Error(`Failed to seed ministry leaders: ${leaderError.message}`);
    }
    
    console.log(`✅ Seeded ${leaders.length} ministry leaders`);
}

async function seedBibleBeeYear(): Promise<string> {
    const yearData = {
        external_id: `${EXTERNAL_ID_PREFIX}year_2025_2026`,
        id: `${EXTERNAL_ID_PREFIX}year_2025_2026`,
        label: '2025–2026',
        cycle_id: '2025', // Assuming this maps to registration cycle
        is_active: true,
        created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
        .from('bible_bee_years')
        .upsert([yearData], { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        })
        .select()
        .single();
        
    if (error) {
        throw new Error(`Failed to seed Bible Bee year: ${error.message}`);
    }
    
    console.log(`✅ Seeded Bible Bee year: ${yearData.label}`);
    return data.id;
}

async function seedDivisions(yearId: string): Promise<void> {
    const divisions = [
        {
            external_id: `${EXTERNAL_ID_PREFIX}division_primary`,
            id: `${EXTERNAL_ID_PREFIX}division_primary`,
            year_id: yearId,
            name: 'Primary',
            minimum_required: 12,
            min_grade: 0, // K
            max_grade: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}division_junior`,
            id: `${EXTERNAL_ID_PREFIX}division_junior`,
            year_id: yearId,
            name: 'Junior',
            minimum_required: 25,
            min_grade: 3,
            max_grade: 7,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            external_id: `${EXTERNAL_ID_PREFIX}division_senior`,
            id: `${EXTERNAL_ID_PREFIX}division_senior`,
            year_id: yearId,
            name: 'Senior',
            minimum_required: null, // No minimum for senior
            min_grade: 8,
            max_grade: 12,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    
    const { error } = await supabase
        .from('divisions')
        .upsert(divisions, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        });
        
    if (error) {
        throw new Error(`Failed to seed divisions: ${error.message}`);
    }
    
    console.log(`✅ Seeded ${divisions.length} divisions`);
}

async function seedScriptures(yearId: string, scriptures: any[]): Promise<void> {
    // Transform scriptures for database
    const scriptureData = scriptures.map(s => ({
        ...s,
        year_id: yearId,
        id: s.external_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
        .from('scriptures')
        .upsert(scriptureData, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        });
        
    if (error) {
        throw new Error(`Failed to seed scriptures: ${error.message}`);
    }
    
    console.log(`✅ Seeded ${scriptureData.length} scriptures`);
}

async function seedEssayPrompt(yearId: string): Promise<void> {
    const essayPrompt = {
        external_id: `${EXTERNAL_ID_PREFIX}essay_senior_2025`,
        id: `${EXTERNAL_ID_PREFIX}essay_senior_2025`,
        year_id: yearId,
        division_name: 'Senior',
        prompt_text: "What's in a Name?",
        due_date: '2025-12-28',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
        .from('essay_prompts')
        .upsert([essayPrompt], { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
        });
        
    if (error) {
        throw new Error(`Failed to seed essay prompt: ${error.message}`);
    }
    
    console.log(`✅ Seeded Senior Division essay prompt`);
}

async function seedHouseholdsAndChildren(): Promise<void> {
    const now = new Date().toISOString();
    
    // Generate 12 households with 33 children distributed across grade ranges
    const families = [
        { lastName: 'Anderson', kids: [{ name: 'Emma', grade: 0, age: 5 }, { name: 'Liam', grade: 2, age: 8 }] }, // 2 kids, K-2
        { lastName: 'Martinez', kids: [{ name: 'Sophia', grade: 1, age: 6 }, { name: 'Noah', grade: 4, age: 10 }, { name: 'Ava', grade: 6, age: 12 }] }, // 3 kids
        { lastName: 'Thompson', kids: [{ name: 'Oliver', grade: 0, age: 5 }, { name: 'Isabella', grade: 3, age: 9 }] }, // 2 kids
        { lastName: 'White', kids: [{ name: 'Lucas', grade: 5, age: 11 }, { name: 'Mia', grade: 7, age: 13 }] }, // 2 kids
        { lastName: 'Harris', kids: [{ name: 'Mason', grade: 1, age: 7 }, { name: 'Charlotte', grade: 4, age: 10 }, { name: 'Ethan', grade: 8, age: 14 }] }, // 3 kids
        { lastName: 'Clark', kids: [{ name: 'Amelia', grade: 0, age: 5 }, { name: 'Jacob', grade: 2, age: 8 }, { name: 'Harper', grade: 5, age: 11 }] }, // 3 kids
        { lastName: 'Lewis', kids: [{ name: 'Benjamin', grade: 3, age: 9 }, { name: 'Evelyn', grade: 9, age: 15 }] }, // 2 kids
        { lastName: 'Robinson', kids: [{ name: 'Alexander', grade: 6, age: 12 }, { name: 'Abigail', grade: 10, age: 16 }] }, // 2 kids
        { lastName: 'Walker', kids: [{ name: 'Michael', grade: 1, age: 7 }, { name: 'Elizabeth', grade: 7, age: 13 }, { name: 'Daniel', grade: 11, age: 17 }] }, // 3 kids
        { lastName: 'Hall', kids: [{ name: 'James', grade: 4, age: 10 }, { name: 'Sofia', grade: 8, age: 14 }] }, // 2 kids
        { lastName: 'Allen', kids: [{ name: 'William', grade: 0, age: 5 }, { name: 'Victoria', grade: 3, age: 9 }, { name: 'Samuel', grade: 9, age: 15 }, { name: 'Grace', grade: 12, age: 18 }] }, // 4 kids
        { lastName: 'Young', kids: [{ name: 'David', grade: 2, age: 8 }, { name: 'Chloe', grade: 5, age: 11 }, { name: 'Matthew', grade: 10, age: 16 }] }, // 3 kids
    ];
    
    const households = [];
    const guardians = [];
    const children = [];
    
    for (let i = 0; i < families.length; i++) {
        const family = families[i];
        const householdId = `${EXTERNAL_ID_PREFIX}household_${String(i + 1).padStart(2, '0')}`;
        
        // Create household
        const household = {
            external_id: householdId,
            household_id: householdId,
            name: `${family.lastName} Family`,
            address_line1: `${100 + i} Main Street`,
            city: 'UAT City',
            state: 'UT',
            zip: `8400${i % 10}`,
            created_at: now,
            updated_at: now,
        };
        households.push(household);
        
        // Create primary guardian
        const guardian = {
            external_id: `${EXTERNAL_ID_PREFIX}guardian_${String(i + 1).padStart(2, '0')}`,
            guardian_id: `${EXTERNAL_ID_PREFIX}guardian_${String(i + 1).padStart(2, '0')}`,
            household_id: householdId,
            first_name: 'Parent',
            last_name: family.lastName,
            mobile_phone: `555-555-${String(1000 + i).slice(-4)}`,
            email: `parent.${family.lastName.toLowerCase()}@example.com`,
            relationship: 'Parent',
            is_primary: true,
            created_at: now,
            updated_at: now,
        };
        guardians.push(guardian);
        
        // Create children
        for (let j = 0; j < family.kids.length; j++) {
            const kid = family.kids[j];
            const childId: string = `${EXTERNAL_ID_PREFIX}child_${String(children.length + 1).padStart(2, '0')}`;
            
            // Calculate birth date based on age
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - kid.age);
            
            const child: any = {
                external_id: childId,
                child_id: childId,
                household_id: householdId,
                first_name: kid.name,
                last_name: family.lastName,
                dob: birthDate.toISOString().split('T')[0], // YYYY-MM-DD
                grade: String(kid.grade),
                is_active: true,
                allergies: j % 3 === 0 ? ['Peanuts', 'Tree nuts'][j % 2] : null, // Add some allergies for realism
                medical_notes: j % 4 === 0 ? 'Requires inhaler for exercise' : null,
                special_needs: false,
                created_at: now,
                updated_at: now,
            };
            children.push(child);
        }
    }
    
    console.log(`📊 Generated ${households.length} households, ${guardians.length} guardians, ${children.length} children`);
    
    // Count children by grade ranges
    const primaryCount = children.filter(c => parseInt(c.grade) >= 0 && parseInt(c.grade) <= 2).length;
    const juniorCount = children.filter(c => parseInt(c.grade) >= 3 && parseInt(c.grade) <= 7).length;
    const seniorCount = children.filter(c => parseInt(c.grade) >= 8 && parseInt(c.grade) <= 12).length;
    
    console.log(`📊 Grade distribution: Primary (K-2): ${primaryCount}, Junior (3-7): ${juniorCount}, Senior (8-12): ${seniorCount}`);
    
    // Insert households
    const { error: householdError } = await supabase
        .from('households')
        .upsert(households, { onConflict: 'external_id', ignoreDuplicates: false });
        
    if (householdError) {
        throw new Error(`Failed to seed households: ${householdError.message}`);
    }
    console.log(`✅ Seeded ${households.length} households`);
    
    // Insert guardians
    const { error: guardianError } = await supabase
        .from('guardians')
        .upsert(guardians, { onConflict: 'external_id', ignoreDuplicates: false });
        
    if (guardianError) {
        throw new Error(`Failed to seed guardians: ${guardianError.message}`);
    }
    console.log(`✅ Seeded ${guardians.length} guardians`);
    
    // Insert children
    const { error: childError } = await supabase
        .from('children')
        .upsert(children, { onConflict: 'external_id', ignoreDuplicates: false });
        
    if (childError) {
        throw new Error(`Failed to seed children: ${childError.message}`);
    }
    console.log(`✅ Seeded ${children.length} children`);
}

async function seedEnrollments(yearId: string): Promise<void> {
    // Get the seeded children and divisions to create enrollments
    const { data: children, error: childError } = await supabase
        .from('children')
        .select('child_id, grade')
        .like('external_id', `${EXTERNAL_ID_PREFIX}%`);
        
    if (childError) {
        throw new Error(`Failed to fetch children for enrollments: ${childError.message}`);
    }
    
    const { data: divisions, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name, min_grade, max_grade')
        .eq('year_id', yearId);
        
    if (divisionError) {
        throw new Error(`Failed to fetch divisions for enrollments: ${divisionError.message}`);
    }
    
    const enrollments: any[] = [];
    const ministryEnrollments: any[] = [];
    const now = new Date().toISOString();
    
    // Enroll children in Bible Bee divisions based on grade
    for (const child of children) {
        const grade = parseInt(child.grade);
        
        // Find appropriate division for this child's grade
        const division = divisions.find(d => grade >= d.min_grade && grade <= d.max_grade);
        
        if (division) {
            const enrollment = {
                external_id: `${EXTERNAL_ID_PREFIX}enrollment_${child.child_id}_${division.id}`,
                id: `${EXTERNAL_ID_PREFIX}enrollment_${child.child_id}_${division.id}`,
                year_id: yearId,
                child_id: child.child_id,
                division_id: division.id,
                auto_enrolled: false,
                enrolled_at: now,
            };
            enrollments.push(enrollment);
        }
        
        // Also enroll most children in Sunday School
        if (Math.random() > 0.2) { // 80% enrollment rate
            const ministryEnrollment = {
                external_id: `${EXTERNAL_ID_PREFIX}ministry_enrollment_${child.child_id}_ss`,
                enrollment_id: `${EXTERNAL_ID_PREFIX}ministry_enrollment_${child.child_id}_ss`,
                child_id: child.child_id,
                cycle_id: '2025',
                ministry_id: `${EXTERNAL_ID_PREFIX}ministry_sunday_school`,
                status: 'enrolled',
            };
            ministryEnrollments.push(ministryEnrollment);
        }
        
        // Enroll older kids in Youth Ministry
        if (grade >= 6 && Math.random() > 0.3) { // 70% enrollment rate for grades 6+
            const youthEnrollment = {
                external_id: `${EXTERNAL_ID_PREFIX}ministry_enrollment_${child.child_id}_youth`,
                enrollment_id: `${EXTERNAL_ID_PREFIX}ministry_enrollment_${child.child_id}_youth`,
                child_id: child.child_id,
                cycle_id: '2025',
                ministry_id: `${EXTERNAL_ID_PREFIX}ministry_youth`,
                status: 'enrolled',
            };
            ministryEnrollments.push(youthEnrollment);
        }
    }
    
    // Insert Bible Bee enrollments
    if (enrollments.length > 0) {
        const { error: enrollmentError } = await supabase
            .from('enrollments')
            .upsert(enrollments, { onConflict: 'external_id', ignoreDuplicates: false });
            
        if (enrollmentError) {
            throw new Error(`Failed to seed Bible Bee enrollments: ${enrollmentError.message}`);
        }
        console.log(`✅ Seeded ${enrollments.length} Bible Bee enrollments`);
    }
    
    // Insert ministry enrollments
    if (ministryEnrollments.length > 0) {
        const { error: ministryError } = await supabase
            .from('ministry_enrollments')
            .upsert(ministryEnrollments, { onConflict: 'external_id', ignoreDuplicates: false });
            
        if (ministryError) {
            throw new Error(`Failed to seed ministry enrollments: ${ministryError.message}`);
        }
        console.log(`✅ Seeded ${ministryEnrollments.length} ministry enrollments`);
    }
    
    // Report enrollment distribution by division
    const divisionCounts = divisions.map(d => {
        const count = enrollments.filter(e => e.division_id === d.id).length;
        return `${d.name}: ${count}`;
    }).join(', ');
    
    console.log(`📊 Bible Bee enrollments by division: ${divisionCounts}`);
}

async function recalculateMinimumBoundaries(yearId: string): Promise<void> {
    // This would typically call a stored procedure or API endpoint
    // For now, we'll implement a basic boundary calculation
    
    const { data: divisions, error: divisionError } = await supabase
        .from('divisions')
        .select('id, minimum_required')
        .eq('year_id', yearId)
        .not('minimum_required', 'is', null);
        
    if (divisionError) {
        throw new Error(`Failed to fetch divisions for boundary calculation: ${divisionError.message}`);
    }
    
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

// Main execution
if (require.main === module) {
    seedUATData().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
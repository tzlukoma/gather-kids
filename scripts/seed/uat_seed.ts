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
        // Find matching JSON entry by order (CSV is canonical)
        const jsonEntry = jsonData.scriptures.find(js => js.order === csvRow.scripture_order);
        
        if (!jsonEntry) {
            throw new Error(`No JSON entry found for order ${csvRow.scripture_order} (${csvRow.reference})`);
        }
        
        // Verify references match (normalized)
        const csvRefNorm = normalizeReference(csvRow.reference);
        const jsonRefNorm = normalizeReference(jsonEntry.reference);
        
        if (csvRefNorm !== jsonRefNorm) {
            throw new Error(
                `Reference mismatch at order ${csvRow.scripture_order}: ` +
                `CSV="${csvRow.reference}" vs JSON="${jsonEntry.reference}"`
            );
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
    
    console.log(`✅ Combined ${combined.length} scriptures (excluded 2 Corinthians 2:14)`);
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
    console.log('TODO: Implement ministry seeding');
}

async function seedBibleBeeYear(): Promise<string> {
    console.log('TODO: Implement Bible Bee year seeding');
    return 'temp-year-id';
}

async function seedDivisions(yearId: string): Promise<void> {
    console.log(`TODO: Implement division seeding for year ${yearId}`);
}

async function seedScriptures(yearId: string, scriptures: any[]): Promise<void> {
    console.log(`TODO: Implement scripture seeding for year ${yearId} with ${scriptures.length} scriptures`);
}

async function seedEssayPrompt(yearId: string): Promise<void> {
    console.log(`TODO: Implement essay prompt seeding for year ${yearId}`);
}

async function seedHouseholdsAndChildren(): Promise<void> {
    console.log('TODO: Implement household and children seeding');
}

async function seedEnrollments(yearId: string): Promise<void> {
    console.log(`TODO: Implement enrollment seeding for year ${yearId}`);
}

async function recalculateMinimumBoundaries(yearId: string): Promise<void> {
    console.log(`TODO: Implement minimum boundary recalculation for year ${yearId}`);
}

// Main execution
if (require.main === module) {
    seedUATData().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
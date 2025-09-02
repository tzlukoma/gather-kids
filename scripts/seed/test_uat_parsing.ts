/**
 * Simple test to check if our UAT seeding functions work
 */

import fs from 'fs';
import path from 'path';

// Test just the parsing functions to see if TypeScript compiles
const projectRoot = path.resolve(__dirname, '../..');

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
        NVI: string;
    };
}

interface JsonTextData {
    competition_year: string;
    translations: string[];
    scriptures: JsonScripture[];
}

function normalizeReference(ref: string): string {
    return ref
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\\w\\d\\s:\\-]/g, '')
        .toLowerCase();
}

function parseCsvScriptures(): CsvScripture[] {
    const csvPath = path.join(projectRoot, 'scripts/data/bible_bee_corrected.csv');
    
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    const scriptures: CsvScripture[] = [];
    const orders = new Set<number>();
    
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
        
        orders.add(scripture.scripture_order);
        scriptures.push(scripture);
    }
    
    console.log(`✅ Parsed ${scriptures.length} scriptures from CSV`);
    return scriptures;
}

function parseJsonTexts(): JsonTextData {
    const jsonPath = path.join(projectRoot, 'scripts/data/bible-bee-2025-scriptures2.json');
    
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data: JsonTextData = JSON.parse(jsonContent);
    
    console.log(`✅ Parsed JSON with ${data.scriptures.length} scripture entries`);
    return data;
}

function combineScriptureData(csvScriptures: CsvScripture[], jsonData: JsonTextData): any[] {
    const combined = [];
    
    for (const csvRow of csvScriptures) {
        // Find matching JSON entry by reference
        const csvRefNorm = normalizeReference(csvRow.reference);
        const jsonEntry = jsonData.scriptures.find(js => 
            normalizeReference(js.reference) === csvRefNorm
        );
        
        if (!jsonEntry) {
            console.warn(`⚠️  No JSON text found for "${csvRow.reference}"`);
            continue;
        }
        
        // Exclude "2 Corinthians 2:14" as specified
        if (csvRow.reference.includes('2 Corinthians 2:14')) {
            console.log(`⚠️  Excluding "2 Corinthians 2:14" as specified`);
            continue;
        }
        
        const texts = {
            'NIV': jsonEntry.texts.NIV,
            'KJV': jsonEntry.texts.KJV,
            'NIV (Spanish)': jsonEntry.texts.NVI,
        };
        
        combined.push({
            external_id: `uat_scripture_${csvRow.scripture_order}`,
            scripture_number: csvRow.scripture_number,
            scripture_order: csvRow.scripture_order,
            counts_for: csvRow.counts_for,
            reference: csvRow.reference,
            category: csvRow.category,
            texts: texts,
        });
    }
    
    console.log(`✅ Combined ${combined.length} scriptures`);
    return combined;
}

async function testParsing() {
    try {
        console.log('🔍 Testing TypeScript parsing...');
        
        const csvScriptures = parseCsvScriptures();
        const jsonData = parseJsonTexts();
        const combined = combineScriptureData(csvScriptures, jsonData);
        
        console.log('\n📊 Sample scripture data:');
        console.log(JSON.stringify(combined[0], null, 2));
        
        console.log('\n✅ TypeScript parsing test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ TypeScript parsing test failed:', error);
        process.exit(1);
    }
}

testParsing();
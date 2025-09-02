/**
 * Simple test to validate CSV and JSON parsing logic
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

function parseCsvScriptures() {
    const csvPath = path.join(projectRoot, 'scripts/data/bible_bee_corrected.csv');
    
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📄 CSV has ${lines.length} lines (including header)`);
    console.log(`📄 Header: ${lines[0]}`);
    console.log(`📄 First data row: ${lines[1]}`);
    console.log(`📄 Last data row: ${lines[lines.length - 1]}`);
    
    const scriptures = [];
    const orders = new Set();
    
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
        
        orders.add(scripture.scripture_order);
        scriptures.push(scripture);
    }
    
    console.log(`✅ Parsed ${scriptures.length} scriptures from CSV`);
    console.log(`📊 Orders: ${Math.min(...orders)} to ${Math.max(...orders)}`);
    
    return scriptures;
}

function parseJsonTexts() {
    const jsonPath = path.join(projectRoot, 'scripts/data/bible-bee-2025-scriptures2.json');
    
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);
    
    console.log(`📖 JSON competition year: ${data.competition_year}`);
    console.log(`📖 JSON translations: ${data.translations.join(', ')}`);
    console.log(`📖 JSON scriptures count: ${data.scriptures.length}`);
    
    // Check for the excluded scripture
    const excluded = data.scriptures.find(s => s.reference.includes('2 Corinthians 2:14'));
    if (excluded) {
        console.log(`⚠️  Found excluded scripture: ${excluded.reference} (order ${excluded.order})`);
    }
    
    // Check for duplicate orders
    const orders = data.scriptures.map(s => s.order);
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
    if (duplicateOrders.length > 0) {
        console.log(`⚠️  Found duplicate orders: ${[...new Set(duplicateOrders)].join(', ')}`);
    }
    
    return data;
}

function testParsing() {
    try {
        console.log('🔍 Testing CSV parsing...');
        const csvScriptures = parseCsvScriptures();
        
        console.log('\n🔍 Testing JSON parsing...');
        const jsonData = parseJsonTexts();
        
        console.log('\n🔗 Testing reference matching by reference text...');
        let matchCount = 0;
        let mismatches = [];
        
        for (const csvRow of csvScriptures) {
            // Match by reference text, not order
            const csvRefNorm = csvRow.reference.toLowerCase().replace(/\s+/g, ' ').trim();
            const jsonEntry = jsonData.scriptures.find(js => 
                js.reference.toLowerCase().replace(/\s+/g, ' ').trim() === csvRefNorm
            );
            
            if (!jsonEntry) {
                mismatches.push(`No JSON text found for "${csvRow.reference}" (order ${csvRow.scripture_order})`);
                continue;
            }
            
            matchCount++;
        }
        
        console.log(`✅ Matched references: ${matchCount}/${csvScriptures.length}`);
        
        if (mismatches.length > 0) {
            console.log(`⚠️  Missing JSON texts:`);
            mismatches.slice(0, 5).forEach(mm => console.log(`   ${mm}`));
            if (mismatches.length > 5) {
                console.log(`   ... and ${mismatches.length - 5} more`);
            }
        }
        
        console.log('\n✅ Parsing test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Parsing test failed:', error.message);
        process.exit(1);
    }
}

testParsing();
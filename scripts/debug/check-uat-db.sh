#!/bin/bash

# Script to run the Bible Bee check against the UAT database
# This loads UAT environment variables from .env.uat and then runs the check script

# Set up error handling
set -e

echo "🔄 Loading environment variables from .env.uat..."

# Source the .env.uat file to load environment variables
if [ -f ".env.uat" ]; then
  source .env.uat
  echo "✅ UAT environment variables loaded from .env.uat"
else
  echo "❌ ERROR: .env.uat file not found!"
  exit 1
fi

# Create a temporary script that uses the UAT environment
cat > scripts/debug/temp-check-uat.js << 'EOL'
#!/usr/bin/env node
/**
 * Debug Script: Query and Display Bible Bee Data from UAT Database
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables from process.env (loaded by the shell script)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log connection info
console.log('📊 UAT Environment Info:');
console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Not set'}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set (partially hidden: ' + serviceRoleKey.substring(0, 10) + '...)' : '❌ Not set'}`);

// Validate environment
if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ ERROR: Missing required Supabase configuration.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Helper function to run a query and display results
async function queryTable(tableName, limit = 10) {
  console.log(`\n📋 Querying ${tableName} table...`);
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(limit);
    
  if (error) {
    console.error(`❌ Error querying ${tableName}: ${error.message}`);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`✅ Found ${data.length} records in ${tableName}`);
    
    // Show sample data structure
    console.log('📊 Sample Record Fields:');
    console.log(JSON.stringify(Object.keys(data[0]), null, 2));
    
    // Print first record
    console.log('📄 First Record:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log(`⚠️ No data found in ${tableName} table`);
  }
  
  return data;
}

// Main function
async function main() {
  try {
    console.log('🔍 UAT Bible Bee Data Debug Query');
    
    // Verify connection to Supabase
    try {
      const { error: healthCheckError } = await supabase
        .from('ministries')
        .select('count')
        .limit(1);
        
      if (healthCheckError) {
        console.error(`❌ FATAL ERROR: Cannot connect to UAT Supabase: ${healthCheckError.message}`);
        console.error('Please check your environment variables and network connection.');
        process.exit(1);
      }
      console.log('✅ Connection to UAT Supabase verified');
    } catch (err) {
      console.error(`❌ FATAL ERROR: Cannot connect to UAT Supabase: ${err.message}`);
      console.error('Please check your environment variables and network connection.');
      process.exit(1);
    }
    
    // 1. Check Bible Bee ministry
    console.log('\n🔍 Checking Bible Bee Ministry...');
    const ministries = await queryTable('ministries');
    
    if (ministries) {
      const bibleBeeMinistry = ministries.find(m => 
        m.name?.toLowerCase().includes('bible bee') || 
        m.code?.toLowerCase().includes('bible-bee') || 
        (m.ministry_id && m.ministry_id.toLowerCase().includes('bible_bee'))
      );
      
      if (bibleBeeMinistry) {
        console.log(`✅ Bible Bee ministry found: ${JSON.stringify(bibleBeeMinistry)}`);
      } else {
        console.log('❌ Bible Bee ministry NOT found in ministries table');
        console.log('Available ministries:');
        ministries.forEach(m => console.log(`  - ${m.name || 'unnamed'} (${m.ministry_id || m.id || 'no id'})`));
      }
    }
    
    // 2. Check Bible Bee Year
    console.log('\n🔍 Checking Bible Bee Years...');
    await queryTable('bible_bee_years');
    
    // 3. Check Divisions
    console.log('\n🔍 Checking Divisions...');
    await queryTable('divisions');
    
    // 4. Check Grade Rules
    console.log('\n🔍 Checking Grade Rules...');
    await queryTable('grade_rules');
    
    // 5. Check Essay Prompts
    console.log('\n🔍 Checking Essay Prompts...');
    await queryTable('essay_prompts');
    
    // 6. Check Competition Years 
    console.log('\n🔍 Checking Competition Years...');
    await queryTable('competition_years');
    
    console.log('\n✅ UAT Bible Bee data check complete');
    
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
EOL

# Make the temporary script executable
chmod +x scripts/debug/temp-check-uat.js

echo "🔄 Running Bible Bee data check against UAT database..."

# Run the script with environment variables from .env.uat
node scripts/debug/temp-check-uat.js

# Clean up temporary script
rm scripts/debug/temp-check-uat.js

echo "✅ UAT data check complete."

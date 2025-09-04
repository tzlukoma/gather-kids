#!/usr/bin/env node
/**
 * Debug Script: Test which database adapter is being used
 * 
 * This script creates a database adapter instance using the 
 * same logic as the application and prints the type.
 */

import { createDatabaseAdapter } from '../lib/database/factory.js';
import { getFlag } from '../lib/featureFlags.js';

// Print environment variables
console.log('📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- NEXT_PUBLIC_DATABASE_MODE: ${process.env.NEXT_PUBLIC_DATABASE_MODE}`);
console.log(`- NEXT_PUBLIC_SHOW_DEMO_FEATURES: ${process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES}`);
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'}`);
console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY is set: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}`);

// Print the result of feature flag check
console.log('\n📊 Feature Flag Check:');
const databaseMode = getFlag('DATABASE_MODE');
console.log(`- DATABASE_MODE feature flag: "${databaseMode}"`);

// Create the adapter
console.log('\n📊 Creating Database Adapter:');
try {
  const adapter = createDatabaseAdapter();
  console.log(`- Created adapter of type: ${adapter.constructor.name}`);
  
  // Check if it's the expected type
  if (adapter.constructor.name === 'SupabaseAdapter') {
    console.log('✅ Success: Using Supabase Adapter as expected');
    
    // Test the adapter connection
    console.log('\n📊 Testing Supabase Connection:');
    adapter.listMinistries().then(ministries => {
      console.log(`- Fetched ${ministries.length} ministries from Supabase`);
      
      // Print the first ministry if available
      if (ministries.length > 0) {
        console.log('- First ministry:', ministries[0]);
      } else {
        console.log('⚠️ No ministries found in the database');
      }
      
      // Check for Bible Bee ministry
      const bibleBeeMinistry = ministries.find(m => 
        m.name?.toLowerCase().includes('bible bee') || 
        m.code?.toLowerCase().includes('bible-bee') || 
        (m.ministry_id && m.ministry_id.toLowerCase().includes('bible_bee'))
      );
      
      if (bibleBeeMinistry) {
        console.log('✅ Found Bible Bee ministry:', bibleBeeMinistry);
      } else {
        console.log('⚠️ Bible Bee ministry NOT found');
      }
    }).catch(err => {
      console.error('❌ Error connecting to Supabase:', err.message);
    });
  } else {
    console.log('❌ Error: Using IndexedDB Adapter instead of Supabase Adapter');
    console.log('This indicates the feature flag logic is not working as expected');
  }
} catch (error) {
  console.error('❌ Error creating adapter:', error.message);
}

// Provide advice
console.log('\n📝 Recommendations:');
console.log('1. Check that .env.local is not overriding .env.uat values');
console.log('2. Clear browser localStorage and cookies');
console.log('3. Try starting the application with FORCE_SUPABASE=true:');
console.log('   FORCE_SUPABASE=true npm run dev:uat');
console.log('4. Check browser console for any database adapter initialization messages');

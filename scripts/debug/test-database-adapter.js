#!/usr/bin/env node
/**
 * Debug Script: Test which database adapter is being used
 *
 * This script creates a database adapter instance using the
 * same logic as the application and prints the type.
 * Note: Demo mode has been removed. The app always uses SupabaseAdapter.
 */

import { createDatabaseAdapter } from '../lib/database/factory.js';

// Print environment variables
console.log('📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(
	`- NEXT_PUBLIC_SUPABASE_URL: ${
		process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
	}`
);
console.log(
	`- NEXT_PUBLIC_SUPABASE_ANON_KEY is set: ${
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'
	}`
);

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
		adapter
			.listMinistries()
			.then((ministries) => {
				console.log(`- Fetched ${ministries.length} ministries from Supabase`);

				// Print the first ministry if available
				if (ministries.length > 0) {
					console.log('- First ministry:', ministries[0]);
				} else {
					console.log('⚠️ No ministries found in the database');
				}

				// Check for Bible Bee ministry
				const bibleBeeMinistry = ministries.find(
					(m) =>
						m.name?.toLowerCase().includes('bible bee') ||
						m.code?.toLowerCase().includes('bible-bee') ||
						(m.ministry_id && m.ministry_id.toLowerCase().includes('bible_bee'))
				);

				if (bibleBeeMinistry) {
					console.log('✅ Found Bible Bee ministry:', bibleBeeMinistry);
				} else {
					console.log('⚠️ Bible Bee ministry NOT found');
				}
			})
			.catch((err) => {
				console.error('❌ Error connecting to Supabase:', err.message);
			});
	} else {
		console.log(
			'❌ Error: Not using SupabaseAdapter — check your Supabase configuration'
		);
	}
} catch (error) {
	console.error('❌ Error creating adapter:', error.message);
	console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
}

// Provide advice
console.log('\n📝 Recommendations:');
console.log('1. Check that NEXT_PUBLIC_SUPABASE_URL is set in .env.local');
console.log('2. Check that NEXT_PUBLIC_SUPABASE_ANON_KEY is set in .env.local');
console.log('3. Clear browser localStorage and cookies if seeing stale data');
console.log('4. Check browser console for any adapter initialization messages');

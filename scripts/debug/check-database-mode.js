#!/usr/bin/env node
/**
 * Debug Script: Check which database adapter is being used by the application
 * Note: Demo mode has been removed. The app always uses SupabaseAdapter.
 */

import { createDatabaseAdapter } from '../lib/database/factory';

// Check feature flags and environment
console.log('🔍 Database Mode Diagnostics');
console.log('\n📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(
	`- NEXT_PUBLIC_SUPABASE_URL: ${
		process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'
	}`
);
console.log(
	`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'
	}`
);

// Create adapter and check its type
try {
	const adapter = createDatabaseAdapter();
	console.log('\n📊 Database Adapter:');
	console.log(`- Adapter type: ${adapter.constructor.name}`);
	console.log(
		`- Using Supabase: ${
			adapter.constructor.name === 'SupabaseAdapter' ? '✅ Yes' : '❌ No'
		}`
	);
} catch (error) {
	console.error('\n❌ Error creating database adapter:', error.message);
}

// Check browser storage
console.log(
	'\n📊 Browser Storage Info (not accessible in Node.js environment):'
);
console.log(
	'- To check Supabase session tokens in browser, add this code to a React component:'
);
console.log(`
useEffect(() => {
  const supabaseTokens = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
  console.log('- Supabase tokens:', supabaseTokens.length > 0 ? '✅ Present' : '❌ Missing');
}, []);
`);

console.log('\n✅ Database diagnostics complete');

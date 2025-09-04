#!/usr/bin/env node
/**
 * Debug Script: Check which database adapter is being used by the application
 */

import { createDatabaseAdapter } from '../lib/database/factory';
import { getFlag } from '../lib/featureFlags';

// Check feature flags and environment
console.log('🔍 Database Mode Diagnostics');
console.log('\n📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(
	`- NEXT_PUBLIC_DATABASE_MODE: ${process.env.NEXT_PUBLIC_DATABASE_MODE}`
);
console.log(
	`- NEXT_PUBLIC_SHOW_DEMO_FEATURES: ${process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES}`
);
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

// Check feature flag result
const databaseMode = getFlag('DATABASE_MODE');
console.log('\n📊 Feature Flag Result:');
console.log(`- DATABASE_MODE flag resolves to: ${databaseMode}`);

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
	'- To check browser storage, add this code to the React component:'
);
console.log(`
useEffect(() => {
  console.log('Local Storage Auth Check:');
  console.log('- gatherkids-user:', localStorage.getItem('gatherkids-user') ? '✅ Present' : '❌ Missing');
  
  // Check for Supabase tokens
  const supabaseTokens = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
  console.log('- Supabase tokens:', supabaseTokens.length > 0 ? '✅ Present' : '❌ Missing');
}, []);
`);

console.log('\n✅ Database diagnostics complete');

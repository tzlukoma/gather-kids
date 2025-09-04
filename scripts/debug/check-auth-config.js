#!/usr/bin/env node
/**
 * Debug Script: Check authentication configuration
 *
 * This script shows which authentication provider is configured
 * and helps diagnose auth-related issues.
 */

import { getFlag } from '../lib/featureFlags';

// Check environment variables
console.log('🔒 Authentication Configuration Check');
console.log('\n📊 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(
	`- NEXT_PUBLIC_AUTH_PROVIDER: ${
		process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'Not set (default)'
	}`
);
console.log(
	`- NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED: ${process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED}`
);
console.log(
	`- NEXT_PUBLIC_LOGIN_MAGIC_ENABLED: ${process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED}`
);
console.log(
	`- NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED: ${process.env.NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED}`
);
console.log(
	`- NEXT_PUBLIC_SHOW_DEMO_FEATURES: ${process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES}`
);

// Check feature flags
console.log('\n📊 Feature Flag Results:');
console.log(`- LOGIN_PASSWORD_ENABLED: ${getFlag('LOGIN_PASSWORD_ENABLED')}`);
console.log(`- LOGIN_MAGIC_ENABLED: ${getFlag('LOGIN_MAGIC_ENABLED')}`);
console.log(`- LOGIN_GOOGLE_ENABLED: ${getFlag('LOGIN_GOOGLE_ENABLED')}`);
console.log(`- SHOW_DEMO_FEATURES: ${getFlag('SHOW_DEMO_FEATURES')}`);

// Check how isDemo() would evaluate
console.log('\n📊 Demo Mode Check:');
console.log(`- DATABASE_MODE: ${getFlag('DATABASE_MODE')}`);
console.log(
	`- App would use demo mode: ${
		getFlag('DATABASE_MODE') === 'demo' ? '✅ Yes' : '❌ No'
	}`
);

// Check Supabase configuration
console.log('\n📊 Supabase Configuration:');
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

// Browser localStorage instructions
console.log('\n📊 Browser Storage Check:');
console.log(
	'To check browser storage, run this JavaScript in your browser console:'
);
console.log(`
// Authentication Check
console.group('🔒 Auth Storage Check');
console.log('localStorage.gatherkids-user:', localStorage.getItem('gatherkids-user') ? '✅ Present' : '❌ Missing');

// Parse and show user data if it exists
const userJson = localStorage.getItem('gatherkids-user');
if (userJson) {
  try {
    const userData = JSON.parse(userJson);
    console.log('User Role:', userData?.metadata?.role || 'Not set');
    console.log('User ID:', userData?.uid || 'Not set');
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
}

// Check Supabase auth tokens
const supabaseTokens = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
console.log('Supabase tokens:', supabaseTokens.length > 0 ? '✅ Present' : '❌ Missing');
if (supabaseTokens.length > 0) {
  console.log('Supabase token keys:', supabaseTokens);
}
console.groupEnd();
`);

console.log('\n✅ Authentication configuration check complete');

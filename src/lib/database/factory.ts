import { SupabaseAdapter } from './supabase-adapter';
import { IndexedDBAdapter } from './indexed-db-adapter';
import type { DatabaseAdapter } from './types';
import { getFlag } from '../featureFlags';
import { supabase } from '../supabaseClient';

export function createDatabaseAdapter(): DatabaseAdapter {
	// Use feature flag system to determine database mode
	const mode = getFlag('DATABASE_MODE');
	
	console.log('createDatabaseAdapter: Initializing with mode', {
		mode,
		isClient: typeof window !== 'undefined',
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
		hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'
	});

	if (mode === 'supabase') {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			console.error('❌ Supabase configuration missing for UAT environment:', {
				supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
				supabaseKey: supabaseKey ? 'SET' : 'MISSING',
				NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
				NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
				mode: mode
			});
			console.error('Please set the following environment variables for UAT:');
			console.error('- NEXT_PUBLIC_SUPABASE_URL');
			console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
			// Fallback to demo mode if Supabase config is missing
			console.log('Falling back to IndexedDB adapter due to missing Supabase config');
			return new IndexedDBAdapter();
		}

		console.log('Creating Supabase adapter for live mode', {
			url: supabaseUrl
		});
		// Use the authenticated Supabase client instead of creating a new one
		return new SupabaseAdapter(supabaseUrl, supabaseKey, supabase);
	}

	// Default to IndexedDB for demo mode
	console.log('Creating IndexedDB adapter for demo mode');
	return new IndexedDBAdapter();
}

// Create a singleton instance
export const db = createDatabaseAdapter();

// Expose adapter globally for debug instrumentation (client-side only)
if (typeof window !== 'undefined') {
	(window as any).gatherKidsDbAdapter = db;
}
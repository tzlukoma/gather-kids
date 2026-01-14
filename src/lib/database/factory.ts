import { SupabaseAdapter } from './supabase-adapter';
import { IndexedDBAdapter } from './indexed-db-adapter';
import type { DatabaseAdapter } from './types';
import { getFlag } from '../featureFlags';
// Don't import supabase at top level - it will be dynamically imported when needed

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
		
		// For SSR, create a server-side client without browser storage
		// For client-side, use the browser client
		if (typeof window === 'undefined') {
			// Server-side: create a new client without browser storage
			const { createClient } = require('@supabase/supabase-js');
			const serverClient = createClient(supabaseUrl, supabaseKey);
			return new SupabaseAdapter(supabaseUrl, supabaseKey, serverClient);
		} else {
			// Client-side: use the browser client (lazy-loaded)
			// Dynamically import to avoid SSR issues
			try {
				const { supabase } = require('../supabaseClient');
				return new SupabaseAdapter(supabaseUrl, supabaseKey, supabase);
			} catch (error) {
				console.warn('Failed to load browser Supabase client, creating server client:', error);
				// Fallback to server client if browser client fails
				const { createClient } = require('@supabase/supabase-js');
				const serverClient = createClient(supabaseUrl, supabaseKey);
				return new SupabaseAdapter(supabaseUrl, supabaseKey, serverClient);
			}
		}
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
import { SupabaseAdapter } from './supabase-adapter';
import type { DatabaseAdapter } from './types';
// Don't import supabase at top level - it will be dynamically imported when needed

export function createDatabaseAdapter(): DatabaseAdapter {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		if (process.env.NODE_ENV === 'test') {
			// In tests, @/lib/database/factory is mocked at the test level.
			// Return a stub so module load succeeds before mocks are applied.
			return {} as DatabaseAdapter;
		}
		throw new Error(
			'Supabase configuration is required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
		);
	}

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

// Create a singleton instance
export const db = createDatabaseAdapter();

// Expose adapter globally for debug instrumentation (client-side only)
if (typeof window !== 'undefined') {
	(window as any).gatherKidsDbAdapter = db;
}

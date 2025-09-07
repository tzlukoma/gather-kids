import { SupabaseAdapter } from './supabase-adapter';
import { IndexedDBAdapter } from './indexed-db-adapter';
import type { DatabaseAdapter } from './types';
import { getFlag } from '../featureFlags';

export function createDatabaseAdapter(): DatabaseAdapter {
	// Use feature flag system to determine database mode
	const mode = getFlag('DATABASE_MODE');

	if (mode === 'supabase') {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			console.error(
				'Supabase URL and key are required when using Supabase mode'
			);
			// Fallback to demo mode if Supabase config is missing
			return new IndexedDBAdapter();
		}

		console.log('Creating Supabase adapter for live mode');
		return new SupabaseAdapter(supabaseUrl, supabaseKey);
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
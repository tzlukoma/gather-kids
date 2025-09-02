import { SupabaseAdapter } from './supabase-adapter';
import { IndexedDBAdapter } from './indexed-db-adapter';
import type { DatabaseAdapter } from './types';

export function createDatabaseAdapter(): DatabaseAdapter {
	// Determine which adapter to use based on environment
	const mode = process.env.NEXT_PUBLIC_DATABASE_MODE || 'demo';

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

		return new SupabaseAdapter(supabaseUrl, supabaseKey);
	}

	// Default to IndexedDB for demo mode
	return new IndexedDBAdapter();
}

// Create a singleton instance
export const db = createDatabaseAdapter();
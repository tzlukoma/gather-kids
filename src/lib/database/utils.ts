import { getFlag } from '../featureFlags';

/**
 * Check if the application is running in Supabase mode
 */
export function isSupabaseMode(): boolean {
	// Use feature flag system to determine database mode
	return getFlag('DATABASE_MODE') === 'supabase';
}
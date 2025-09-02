/**
 * Check if the application is running in Supabase mode
 */
export function isSupabaseMode(): boolean {
	// Check if running in browser environment
	if (typeof window === 'undefined') {
		return process.env.NEXT_PUBLIC_DATABASE_MODE === 'supabase';
	}

	// Browser environment
	return process.env.NEXT_PUBLIC_DATABASE_MODE === 'supabase';
}
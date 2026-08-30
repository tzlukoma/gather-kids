/** True when the app is wired to the CI/local dummy Supabase URL (no live backend). */
export function isOfflineSupabase(): boolean {
	return (
		process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('dummy.supabase.co') ?? false
	);
}

export function isMailhogTestMode(): boolean {
	return (
		process.env.SMTP_HOST === 'localhost' ||
		process.env.NODE_ENV === 'test'
	);
}

/** Guard for in-memory test auth APIs used by MailHog e2e runs. */
export function isTestAuthApiEnabled(): boolean {
	return isOfflineSupabase() && isMailhogTestMode();
}

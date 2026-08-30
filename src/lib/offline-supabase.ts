import { AuthRole, type BaseUser } from '@/lib/auth-types';

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

/** In-memory guest used by dummy magic-link and password e2e auth. */
export function createOfflineSessionUser(
	email: string
): Omit<BaseUser, 'assignedMinistryIds'> {
	return {
		uid: `test-${email.replace(/[^a-z0-9]/gi, '-')}`,
		displayName: email.split('@')[0] || 'User',
		email,
		is_active: true,
		metadata: {
			role: AuthRole.GUEST,
		},
	};
}

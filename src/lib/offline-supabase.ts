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

const OFFLINE_SESSION_KEY = 'gk-offline-session-user';

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

export function persistOfflineSessionUser(user: BaseUser): void {
	if (typeof window === 'undefined') return;
	sessionStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(user));
}

export function readOfflineSessionUser(): BaseUser | null {
	if (typeof window === 'undefined') return null;
	const raw = sessionStorage.getItem(OFFLINE_SESSION_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as BaseUser;
	} catch {
		return null;
	}
}

export function clearOfflineSessionUser(): void {
	if (typeof window === 'undefined') return;
	sessionStorage.removeItem(OFFLINE_SESSION_KEY);
}

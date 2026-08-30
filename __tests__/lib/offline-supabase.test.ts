import { AuthRole } from '@/lib/auth-types';
import {
	clearOfflineSessionUser,
	createOfflineSessionUser,
	isOfflineSupabase,
	isTestAuthApiEnabled,
	persistOfflineSessionUser,
	readOfflineSessionUser,
} from '@/lib/offline-supabase';

describe('offline supabase helpers', () => {
	const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const originalSmtp = process.env.SMTP_HOST;

	afterEach(() => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
		process.env.SMTP_HOST = originalSmtp;
	});

	it('detects dummy supabase URLs', () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		expect(isOfflineSupabase()).toBe(true);
	});

	it('does not treat live supabase as offline', () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
		expect(isOfflineSupabase()).toBe(false);
	});

	it('enables test auth only for dummy supabase plus MailHog', () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		process.env.SMTP_HOST = 'localhost';
		expect(isTestAuthApiEnabled()).toBe(true);
	});

	it('builds a guest session user for dummy magic-link login', () => {
		expect(createOfflineSessionUser('parent@example.com')).toEqual({
			uid: 'test-parent-example-com',
			displayName: 'parent',
			email: 'parent@example.com',
			is_active: true,
			metadata: { role: AuthRole.GUEST },
		});
	});

	it('round-trips a dummy session through sessionStorage', () => {
		const user = {
			...createOfflineSessionUser('parent@example.com'),
			assignedMinistryIds: [],
		};
		persistOfflineSessionUser(user);
		expect(readOfflineSessionUser()).toEqual(user);
		clearOfflineSessionUser();
		expect(readOfflineSessionUser()).toBeNull();
	});
});

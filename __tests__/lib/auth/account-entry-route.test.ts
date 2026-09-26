import {
	accountEntryRegistrationRoute,
	getPasswordStatus,
} from '@/lib/auth/account-entry-route';

const NOW = Date.parse('2026-09-26T18:00:00Z');
const minutesAgo = (minutes: number) =>
	new Date(NOW - minutes * 60 * 1000).toISOString();

describe('getPasswordStatus', () => {
	it('trusts the recorded flag, whatever the account age', () => {
		expect(
			getPasswordStatus(
				{ user_metadata: { has_password: true }, created_at: minutesAgo(1) },
				NOW
			)
		).toBe('has_password');
	});

	// Supabase gives magic-link accounts a random password, so the account's
	// age is the only sign that this link created it.
	it('treats an account younger than a magic link as passwordless', () => {
		expect(getPasswordStatus({ user_metadata: {}, created_at: minutesAgo(5) }, NOW)).toBe(
			'no_password'
		);
	});

	it('cannot tell for older accounts without the flag', () => {
		expect(
			getPasswordStatus({ user_metadata: {}, created_at: minutesAgo(61) }, NOW)
		).toBe('unknown');
		expect(getPasswordStatus({ user_metadata: {} }, NOW)).toBe('unknown');
	});
});

describe('accountEntryRegistrationRoute', () => {
	it('sends people who already have a password straight to registration', () => {
		expect(accountEntryRegistrationRoute('has_password')).toBe('/register');
	});

	it('requires password creation only when there is definitely none', () => {
		expect(accountEntryRegistrationRoute('no_password')).toBe(
			'/onboarding?next=/register'
		);
	});

	it('offers a skippable password step when it cannot tell', () => {
		expect(accountEntryRegistrationRoute('unknown')).toBe(
			'/onboarding?next=/register&password=optional'
		);
	});
});

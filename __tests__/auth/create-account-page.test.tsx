import { getFlag } from '@/lib/featureFlags';

describe('CreateAccountPage Feature Flag Logic', () => {
	it('should have password auth enabled when LOGIN_PASSWORD_ENABLED is true', () => {
		process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED = 'true';
		expect(getFlag('LOGIN_PASSWORD_ENABLED')).toBe(true);
		delete process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED;
	});

	it('password auth disabled when LOGIN_PASSWORD_ENABLED is not set', () => {
		delete process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED;
		expect(getFlag('LOGIN_PASSWORD_ENABLED')).toBe(false);
	});
});

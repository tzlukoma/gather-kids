import { getFlag, isDemo } from '@/lib/featureFlags';

describe('CreateAccountPage Feature Flag Logic (demo mode removed)', () => {
	it('isDemo() always returns false', () => {
		expect(isDemo()).toBe(false);
	});

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

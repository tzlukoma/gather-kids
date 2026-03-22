import { getFlag, isDemo } from '@/lib/featureFlags';

describe('Feature Flags (demo mode removed)', () => {
    it('isDemo() always returns false', () => {
        expect(isDemo()).toBe(false);
    });

    it('unknown flag name returns false (default case)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getFlag('UNKNOWN_FLAG' as any)).toBe(false);
    });

    it('LOGIN_MAGIC_ENABLED returns false when not set', () => {
        delete process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED;
        expect(getFlag('LOGIN_MAGIC_ENABLED')).toBe(false);
    });

    it('LOGIN_MAGIC_ENABLED returns true when set to "true"', () => {
        process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED = 'true';
        expect(getFlag('LOGIN_MAGIC_ENABLED')).toBe(true);
        delete process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED;
    });

    it('LOGIN_PASSWORD_ENABLED returns true when set', () => {
        process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED = 'true';
        expect(getFlag('LOGIN_PASSWORD_ENABLED')).toBe(true);
        delete process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED;
    });
});

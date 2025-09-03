import { getFlag, isDemo } from '@/lib/featureFlags';

// Mock environment variables
const originalEnv = process.env;

describe('Feature Flags with SHOW_DEMO_FEATURES', () => {
    beforeEach(() => {
        // Reset environment variables
        process.env = { ...originalEnv };
        delete process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES;
        delete process.env.NEXT_PUBLIC_DATABASE_MODE;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('SHOW_DEMO_FEATURES flag', () => {
        it('should return true when NEXT_PUBLIC_SHOW_DEMO_FEATURES is "true"', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'true';
            expect(getFlag('SHOW_DEMO_FEATURES')).toBe(true);
        });

        it('should return false when NEXT_PUBLIC_SHOW_DEMO_FEATURES is "false"', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'false';
            expect(getFlag('SHOW_DEMO_FEATURES')).toBe(false);
        });

        it('should return false when NEXT_PUBLIC_SHOW_DEMO_FEATURES is not set', () => {
            expect(getFlag('SHOW_DEMO_FEATURES')).toBe(false);
        });
    });

    describe('DATABASE_MODE flag when demo features are disabled', () => {
        it('should force supabase mode when NEXT_PUBLIC_SHOW_DEMO_FEATURES is false', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'false';
            expect(getFlag('DATABASE_MODE')).toBe('supabase');
            expect(isDemo()).toBe(false);
        });

        it('should respect DATABASE_MODE setting when demo features are enabled', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'true';
            process.env.NEXT_PUBLIC_DATABASE_MODE = 'demo';
            expect(getFlag('DATABASE_MODE')).toBe('demo');
            expect(isDemo()).toBe(true);
        });

        it('should default to demo mode when demo features are enabled and DATABASE_MODE not set', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'true';
            expect(getFlag('DATABASE_MODE')).toBe('demo');
            expect(isDemo()).toBe(true);
        });

        it('should allow supabase mode when demo features are enabled', () => {
            process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES = 'true';
            process.env.NEXT_PUBLIC_DATABASE_MODE = 'supabase';
            expect(getFlag('DATABASE_MODE')).toBe('supabase');
            expect(isDemo()).toBe(false);
        });
    });
});
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}));

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
	redirect: (...args: unknown[]) => {
		mockRedirect(...args);
		throw new Error('NEXT_REDIRECT');
	},
}));

jest.mock('@/lib/flags', () => ({
	getBoolean: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
	createServerClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
	cookies: jest.fn(() =>
		Promise.resolve({
			getAll: () => [],
		})
	),
}));

jest.mock('@/components/gatherKids/registration-wizard', () => ({
	__esModule: true,
	default: () => <div data-testid="register-wizard">Wizard</div>,
}));

jest.mock('@/app/register/page-legacy', () => ({
	__esModule: true,
	default: () => <div data-testid="register-legacy">Legacy</div>,
}));

import { createServerClient } from '@supabase/ssr';
import { getBoolean } from '@/lib/flags';
import { isOfflineSupabase } from '@/lib/offline-supabase';
import RegisterPage, {
	getRegisterPageContext,
	isWizardFlagOverrideEnabled,
} from '@/app/register/page';

const mockGetBoolean = getBoolean as jest.MockedFunction<typeof getBoolean>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<
	typeof createServerClient
>;

function mockSupabaseUser(user: { id: string; user_metadata?: { role?: string } } | null) {
	mockCreateServerClient.mockReturnValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user } }),
		},
	} as ReturnType<typeof createServerClient>);
}

describe('register page server wrapper', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
		delete process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE;
		mockGetBoolean.mockResolvedValue(false);
		mockSupabaseUser(null);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('returns legacy when Supabase env is missing', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-legacy')).toBeInTheDocument();
		expect(mockGetBoolean).not.toHaveBeenCalled();
	});

	it('returns legacy when flag evaluation fails closed', async () => {
		mockGetBoolean.mockRejectedValue(new Error('posthog down'));

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-legacy')).toBeInTheDocument();
	});

	it('returns legacy when gathersystem_registration is false', async () => {
		mockGetBoolean.mockResolvedValue(false);
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'GUARDIAN' } });

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-legacy')).toBeInTheDocument();
	});

	it('renders wizard for authenticated user when flag is true', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'GUARDIAN' } });

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-wizard')).toBeInTheDocument();
	});

	it('redirects signed-out live users to login with next=/register when flag is true', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser(null);

		await expect(RegisterPage()).rejects.toThrow('NEXT_REDIRECT');
		expect(mockRedirect).toHaveBeenCalledWith('/login?next=%2Fregister');
	});

	it('allows signed-out offline users to reach the wizard client gate', async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser(null);

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-wizard')).toBeInTheDocument();
		expect(mockRedirect).not.toHaveBeenCalled();
	});

	it('passes only opaque userId and role to flag evaluation', async () => {
		mockSupabaseUser({
			id: '11111111-2222-3333-4444-555555555555',
			user_metadata: { role: 'GUARDIAN' },
		});

		await getRegisterPageContext();

		expect(mockGetBoolean).toHaveBeenCalledWith(
			'gathersystem_registration',
			false,
			{
				userId: '11111111-2222-3333-4444-555555555555',
				role: 'GUARDIAN',
			}
		);

		const contextArg = mockGetBoolean.mock.calls[0][2];
		expect(contextArg).not.toHaveProperty('email');
		expect(contextArg).not.toHaveProperty('name');
		expect(contextArg).not.toHaveProperty('householdId');
		expect(contextArg).not.toHaveProperty('childId');
	});

	it('honours GATHERSYSTEM_REGISTRATION_OVERRIDE for e2e and local smoke', async () => {
		process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE = 'true';
		mockGetBoolean.mockResolvedValue(false);
		mockSupabaseUser({ id: 'user-abc' });

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-wizard')).toBeInTheDocument();
		expect(isWizardFlagOverrideEnabled()).toBe(true);
	});

	it('ignores GATHERSYSTEM_REGISTRATION_OVERRIDE in production', async () => {
		const env = process.env as Record<string, string | undefined>;
		const previousNodeEnv = env.NODE_ENV;
		env.NODE_ENV = 'production';
		process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE = 'true';
		mockGetBoolean.mockResolvedValue(false);
		mockSupabaseUser({ id: 'user-abc' });

		const page = await RegisterPage();
		render(page);

		expect(screen.getByTestId('register-legacy')).toBeInTheDocument();
		expect(isWizardFlagOverrideEnabled()).toBe(false);

		env.NODE_ENV = previousNodeEnv;
	});

	it('detects dummy Supabase URLs as offline', () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		expect(isOfflineSupabase()).toBe(true);
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
		expect(isOfflineSupabase()).toBe(false);
	});
});

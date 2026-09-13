import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}));

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

jest.mock('@/components/auth/protected-route', () => ({
	ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="protected-route">{children}</div>
	),
}));

jest.mock('@/components/gatherKids/check-in-content-legacy', () => ({
	CheckInContentLegacy: () => <div data-testid="check-in-legacy">Legacy</div>,
}));

jest.mock('@/components/gatherKids/check-in-content-gathersystem', () => ({
	CheckInContentGatherSystem: () => (
		<div data-testid="check-in-gathersystem">GatherSystem</div>
	),
}));

import { createServerClient } from '@supabase/ssr';
import { getBoolean } from '@/lib/flags';
import CheckInPage, {
	getGatherSystemDoorFlag,
} from '@/app/(admin)/check-in/page';

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

describe('check-in page GatherSystem door gate', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
		mockGetBoolean.mockResolvedValue(false);
		mockSupabaseUser(null);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('returns legacy when Supabase env is missing (no flag call)', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		await expect(getGatherSystemDoorFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();
		expect(mockCreateServerClient).not.toHaveBeenCalled();

		const page = await CheckInPage();
		render(page);
		expect(screen.getByTestId('check-in-legacy')).toBeInTheDocument();
	});

	it('returns legacy when flag evaluation fails closed', async () => {
		mockGetBoolean.mockRejectedValue(new Error('posthog down'));
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		await expect(getGatherSystemDoorFlag()).resolves.toBe(false);

		const page = await CheckInPage();
		render(page);
		expect(screen.getByTestId('check-in-legacy')).toBeInTheDocument();
	});

	it('renders GatherSystem when gathersystem_door is true', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		const page = await CheckInPage();
		render(page);

		expect(screen.getByTestId('check-in-gathersystem')).toBeInTheDocument();
		expect(mockGetBoolean).toHaveBeenCalledWith('gathersystem_door', false, {
			userId: 'user-abc',
			role: 'ADMIN',
		});
	});
});

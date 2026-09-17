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

jest.mock('@/components/gatherKids/admin-dashboard-legacy', () => ({
	AdminDashboardLegacy: () => (
		<div data-testid="admin-dashboard-legacy">Legacy</div>
	),
}));

jest.mock('@/components/gatherKids/admin-dashboard-gathersystem', () => ({
	AdminDashboardGatherSystem: () => (
		<div data-testid="admin-dashboard-gathersystem">GatherSystem</div>
	),
}));

import { createServerClient } from '@supabase/ssr';
import { getBoolean } from '@/lib/flags';
import { getGatherSystemAdminFlag } from '@/lib/flags/get-gathersystem-admin-flag';
import AdminOverviewPage from '@/app/(admin)/admin-overview/page';

const mockGetBoolean = getBoolean as jest.MockedFunction<typeof getBoolean>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<
	typeof createServerClient
>;

function mockSupabaseUser(
	user: { id: string; user_metadata?: { role?: string } } | null
) {
	mockCreateServerClient.mockReturnValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user } }),
		},
	} as ReturnType<typeof createServerClient>);
}

describe('admin-overview page GatherSystem admin gate', () => {
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

		await expect(getGatherSystemAdminFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();
		expect(mockCreateServerClient).not.toHaveBeenCalled();

		const page = await AdminOverviewPage();
		render(page);
		expect(screen.getByTestId('admin-dashboard-legacy')).toBeInTheDocument();
	});

	it('returns legacy when flag evaluation fails closed', async () => {
		mockGetBoolean.mockRejectedValue(new Error('posthog down'));
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		await expect(getGatherSystemAdminFlag()).resolves.toBe(false);

		const page = await AdminOverviewPage();
		render(page);
		expect(screen.getByTestId('admin-dashboard-legacy')).toBeInTheDocument();
	});

	it('renders GatherSystem dashboard when gathersystem_admin is true', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		const page = await AdminOverviewPage();
		render(page);

		expect(
			screen.getByTestId('admin-dashboard-gathersystem')
		).toBeInTheDocument();
		expect(mockGetBoolean).toHaveBeenCalledWith('gathersystem_admin', false, {
			userId: 'user-abc',
			role: 'ADMIN',
		});
	});
});

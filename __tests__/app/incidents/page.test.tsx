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

jest.mock('@/components/gatherKids/incidents-content-legacy', () => ({
	IncidentsContentLegacy: () => (
		<div data-testid="incidents-legacy">Legacy</div>
	),
}));

jest.mock('@/components/gatherKids/incidents-content-gathersystem', () => ({
	IncidentsContentGatherSystem: () => (
		<div data-testid="incidents-gathersystem">GatherSystem</div>
	),
}));

import { createServerClient } from '@supabase/ssr';
import { getBoolean } from '@/lib/flags';
import { getGatherSystemIncidentsFlag } from '@/lib/flags/get-gathersystem-incidents-flag';
import IncidentsPage from '@/app/(admin)/incidents/page';

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

describe('incidents page GatherSystem gate', () => {
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

		await expect(getGatherSystemIncidentsFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();

		render(await IncidentsPage());
		expect(screen.getByTestId('incidents-legacy')).toBeInTheDocument();
	});

	it('returns legacy when there is no session, without evaluating the flag', async () => {
		mockSupabaseUser(null);
		mockGetBoolean.mockResolvedValue(true);

		await expect(getGatherSystemIncidentsFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();

		render(await IncidentsPage());
		expect(screen.getByTestId('incidents-legacy')).toBeInTheDocument();
	});

	it('returns legacy when flag evaluation fails closed', async () => {
		mockGetBoolean.mockRejectedValue(new Error('posthog down'));
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		await expect(getGatherSystemIncidentsFlag()).resolves.toBe(false);

		render(await IncidentsPage());
		expect(screen.getByTestId('incidents-legacy')).toBeInTheDocument();
	});

	it('renders GatherSystem incidents when the flag is true', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser({ id: 'user-abc', user_metadata: { role: 'ADMIN' } });

		render(await IncidentsPage());

		expect(screen.getByTestId('incidents-gathersystem')).toBeInTheDocument();
		expect(mockGetBoolean).toHaveBeenCalledWith(
			'gathersystem_incidents',
			false,
			{ userId: 'user-abc', role: 'ADMIN' }
		);
	});
});

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

// The chrome itself reads the session, branding and pathname; this suite is
// about the gate, so it stands in for the whole client layout and reports which
// side of the flag it was handed.
jest.mock('@/components/gatherKids/guardian-layout-client', () => ({
	__esModule: true,
	default: ({
		children,
		useGatherSystemGuardian,
	}: {
		children: React.ReactNode;
		useGatherSystemGuardian?: boolean;
	}) => (
		<div
			data-testid="guardian-layout-client"
			data-gathersystem={String(useGatherSystemGuardian)}>
			{children}
		</div>
	),
}));

import { createServerClient } from '@supabase/ssr';
import { getBoolean } from '@/lib/flags';
import GuardianLayout, {
	getGatherSystemGuardianFlag,
} from '@/app/household/layout';

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
	} as unknown as ReturnType<typeof createServerClient>);
}

async function renderLayout() {
	const layout = await GuardianLayout({ children: <p>household page</p> });
	render(layout);
	return screen.getByTestId('guardian-layout-client');
}

describe('household layout GatherSystem guardian gate', () => {
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

	it('stays legacy when Supabase env is missing, without asking the flag', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		await expect(getGatherSystemGuardianFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();
		expect(mockCreateServerClient).not.toHaveBeenCalled();

		const shell = await renderLayout();
		expect(shell).toHaveAttribute('data-gathersystem', 'false');
	});

	it('stays legacy when there is no session', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser(null);

		await expect(getGatherSystemGuardianFlag()).resolves.toBe(false);

		const shell = await renderLayout();
		expect(shell).toHaveAttribute('data-gathersystem', 'false');
	});

	it('stays legacy when flag evaluation fails closed', async () => {
		mockGetBoolean.mockRejectedValue(new Error('posthog down'));
		mockSupabaseUser({ id: 'guardian-abc', user_metadata: { role: 'GUARDIAN' } });

		await expect(getGatherSystemGuardianFlag()).resolves.toBe(false);

		const shell = await renderLayout();
		expect(shell).toHaveAttribute('data-gathersystem', 'false');
	});

	it('hands the shell the GatherSystem answer when the flag is on', async () => {
		mockGetBoolean.mockResolvedValue(true);
		mockSupabaseUser({ id: 'guardian-abc', user_metadata: { role: 'GUARDIAN' } });

		const shell = await renderLayout();

		expect(shell).toHaveAttribute('data-gathersystem', 'true');
		expect(mockGetBoolean).toHaveBeenCalledWith('gathersystem_guardian', false, {
			userId: 'guardian-abc',
			role: 'GUARDIAN',
		});
	});

	it('still renders the page inside the shell', async () => {
		const shell = await renderLayout();
		expect(shell).toHaveTextContent('household page');
	});
});

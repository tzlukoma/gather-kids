jest.mock('server-only', () => ({}));

jest.mock('@supabase/ssr', () => ({
	createServerClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
	cookies: jest.fn(() =>
		Promise.resolve({
			getAll: () => [{ name: 'sb-access-token', value: 'test' }],
		})
	),
}));

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';
import { isOfflineSupabase } from '@/lib/offline-supabase';

const mockCreateServerClient = createServerClient as jest.MockedFunction<
	typeof createServerClient
>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function mockSupabaseUser(
	user: {
		id: string;
		email?: string;
		user_metadata?: { role?: string; full_name?: string };
	} | null
) {
	mockCreateServerClient.mockReturnValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user } }),
		},
	} as ReturnType<typeof createServerClient>);
}

describe('getFlagEvalContext', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
		mockSupabaseUser(null);
		mockCookies.mockResolvedValue({
			getAll: () => [{ name: 'sb-access-token', value: 'test' }],
		} as Awaited<ReturnType<typeof cookies>>);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('returns canEvaluateFlags false without creating a client when Supabase env is missing', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		const context = await getFlagEvalContext();

		expect(context).toEqual({
			userId: undefined,
			role: undefined,
			isOffline: false,
			canEvaluateFlags: false,
		});
		expect(mockCreateServerClient).not.toHaveBeenCalled();
	});

	it('uses a getAll-only cookie adapter for getUser()', async () => {
		mockSupabaseUser({ id: 'user-1' });

		await getFlagEvalContext();

		expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
		const cookieAdapter = mockCreateServerClient.mock.calls[0][2]?.cookies as {
			getAll?: () => unknown;
			setAll?: unknown;
			get?: unknown;
			set?: unknown;
			remove?: unknown;
		};
		expect(cookieAdapter).toBeDefined();
		expect(typeof cookieAdapter.getAll).toBe('function');
		expect(cookieAdapter.setAll).toBeUndefined();
		expect(cookieAdapter.get).toBeUndefined();
		expect(cookieAdapter.set).toBeUndefined();
		expect(cookieAdapter.remove).toBeUndefined();
	});

	it('returns opaque userId and role only (no email, name, household, or child ids)', async () => {
		mockSupabaseUser({
			id: '11111111-2222-3333-4444-555555555555',
			email: 'guardian@example.com',
			user_metadata: { role: 'GUARDIAN', full_name: 'Test Guardian' },
		});

		const context = await getFlagEvalContext();

		expect(context).toEqual({
			userId: '11111111-2222-3333-4444-555555555555',
			role: 'GUARDIAN',
			isOffline: false,
			canEvaluateFlags: true,
		});
		expect(context).not.toHaveProperty('email');
		expect(context).not.toHaveProperty('name');
		expect(context).not.toHaveProperty('householdId');
		expect(context).not.toHaveProperty('childId');
		expect(Object.keys(context).sort()).toEqual(
			['canEvaluateFlags', 'isOffline', 'role', 'userId'].sort()
		);
	});

	it('reports offline when Supabase URL is the dummy host', async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		mockSupabaseUser(null);

		const context = await getFlagEvalContext();

		expect(context.isOffline).toBe(true);
		expect(context.canEvaluateFlags).toBe(true);
		expect(isOfflineSupabase()).toBe(true);
	});
});

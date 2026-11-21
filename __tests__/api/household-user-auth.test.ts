/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const HOUSEHOLD_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const EXISTING_USER_ID = '11111111-1111-1111-1111-111111111111';
const NEW_USER_ID = '22222222-2222-2222-2222-222222222222';

const mockGetUser = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();

let dbResults: Array<{ data?: unknown; error?: unknown }> = [];

function nextDbResult() {
	return dbResults.shift() ?? { data: null, error: null };
}

function mockBuilder() {
	const b: any = {
		select: jest.fn(() => b),
		eq: jest.fn(() => b),
		order: jest.fn(() => b),
		maybeSingle: jest.fn(() => Promise.resolve(nextDbResult())),
		single: jest.fn(() => Promise.resolve(nextDbResult())),
		delete: jest.fn(() => b),
		insert: jest.fn(() => b),
		then: (onFulfilled: any, onRejected: any) =>
			Promise.resolve(nextDbResult()).then(onFulfilled, onRejected),
	};
	return b;
}

const mockFrom = jest.fn(() => mockBuilder());

jest.mock('next/headers', () => ({
	cookies: jest.fn(async () => ({ getAll: () => [] })),
}));

jest.mock('@supabase/ssr', () => ({
	createServerClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			admin: {
				getUserById: mockGetUserById,
				updateUserById: mockUpdateUserById,
			},
		},
		from: mockFrom,
	})),
}));

const session = (user: unknown) => ({ data: { user }, error: null });
const ctx = () => ({ params: Promise.resolve({ householdId: HOUSEHOLD_ID }) });

function getRequest() {
	return new NextRequest(
		`http://localhost:9002/api/households/${HOUSEHOLD_ID}/user`,
		{ method: 'GET' }
	);
}

function putRequest(userId: string) {
	return new NextRequest(
		`http://localhost:9002/api/households/${HOUSEHOLD_ID}/user`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user_id: userId }),
		}
	);
}

describe('/api/households/[householdId]/user authorization', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		dbResults = [];
		process.env = {
			...OLD_ENV,
			NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
			NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
			SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
		};

		mockGetUserById.mockImplementation((userId: string) => {
			const user =
				userId === EXISTING_USER_ID
					? {
							id: EXISTING_USER_ID,
							email: 'existing@example.com',
							user_metadata: { full_name: 'Existing Guardian', role: 'GUARDIAN' },
					  }
					: {
							id: userId,
							email: 'new@example.com',
							user_metadata: {
								full_name: 'New User',
								role: 'GUARDIAN',
								household_id: HOUSEHOLD_ID,
							},
					  };
			return Promise.resolve({ data: { user }, error: null });
		});

		mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	async function loadRoute() {
		return import('@/app/api/households/[householdId]/user/route');
	}

	it('GET rejects unauthenticated, GUARDIAN, and forged user_metadata ADMIN callers', async () => {
		const { GET } = await loadRoute();
		for (const user of [
			null,
			{ id: 'guardian', app_metadata: { role: 'GUARDIAN' }, user_metadata: {} },
			{ id: 'attacker', app_metadata: {}, user_metadata: { role: 'ADMIN' } },
		]) {
			mockGetUser.mockResolvedValue(session(user));
			const res = await GET(getRequest(), ctx());
			expect(res.status).toBe(403);
		}
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it('GET returns the household user for a real ADMIN', async () => {
		mockGetUser.mockResolvedValue(
			session({ id: 'admin', app_metadata: { role: 'ADMIN' }, user_metadata: {} })
		);
		dbResults = [
			{
				data: [{ auth_user_id: EXISTING_USER_ID, created_at: '2024-01-01T00:00:00Z' }],
				error: null,
			},
		];
		const { GET } = await loadRoute();
		const res = await GET(getRequest(), ctx());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			user: {
				id: EXISTING_USER_ID,
				email: 'existing@example.com',
				name: 'Existing Guardian',
			},
		});
	});

	it('PUT rejects an unauthenticated caller before touching user_households or auth.admin', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
		const { PUT } = await loadRoute();
		const res = await PUT(putRequest(NEW_USER_ID), ctx());
		expect(res.status).toBe(403);
		expect(mockFrom).not.toHaveBeenCalled();
		expect(mockGetUserById).not.toHaveBeenCalled();
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});

	it('PUT rejects a signed-in GUARDIAN and a forged ADMIN in user_metadata', async () => {
		const { PUT } = await loadRoute();
		for (const user of [
			{ id: 'guardian', app_metadata: { role: 'GUARDIAN' }, user_metadata: {} },
			{ id: 'attacker', app_metadata: {}, user_metadata: { role: 'ADMIN' } },
		]) {
			mockGetUser.mockResolvedValue(session(user));
			const res = await PUT(putRequest(NEW_USER_ID), ctx());
			expect(res.status).toBe(403);
		}
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});

	it('PUT allows a real ADMIN to rebind the household user', async () => {
		mockGetUser.mockResolvedValue(
			session({ id: 'admin', app_metadata: { role: 'ADMIN' }, user_metadata: {} })
		);
		dbResults = [
			{ data: { auth_user_id: EXISTING_USER_ID }, error: null },
			{ error: null },
			{ data: null, error: null },
			{ data: { auth_user_id: NEW_USER_ID, household_id: HOUSEHOLD_ID }, error: null },
		];
		const { PUT } = await loadRoute();
		const res = await PUT(putRequest(NEW_USER_ID), ctx());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.user).toMatchObject({ id: NEW_USER_ID, email: 'new@example.com' });
		expect(mockUpdateUserById).toHaveBeenCalledWith(
			NEW_USER_ID,
			expect.objectContaining({
				user_metadata: expect.objectContaining({
					role: 'GUARDIAN',
					household_id: HOUSEHOLD_ID,
				}),
			})
		);
	});

	it('fails closed with 503 when public Supabase env is missing', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
		const { PUT } = await loadRoute();
		const res = await PUT(putRequest(NEW_USER_ID), ctx());
		expect(res.status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});

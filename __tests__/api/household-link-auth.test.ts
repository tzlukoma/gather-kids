/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

/** The link table, keyed by auth user. */
let LINKS: Array<{ auth_user_id: string; household_id: string }> = [];
const inserted: Array<Record<string, unknown>> = [];

function userHouseholdsQuery() {
	let column = '';
	let value = '';
	const q: any = {
		select: jest.fn(() => q),
		eq: jest.fn((col: string, v: string) => {
			column = col;
			value = v;
			return q;
		}),
		limit: jest.fn(() =>
			Promise.resolve({
				data: LINKS.filter((l) => (l as any)[column] === value),
				error: null,
			})
		),
		maybeSingle: jest.fn(() =>
			Promise.resolve({
				data: LINKS.find((l) => (l as any)[column] === value) ?? null,
				error: null,
			})
		),
		insert: jest.fn((row: Record<string, unknown>) => {
			inserted.push(row);
			LINKS.push(row as { auth_user_id: string; household_id: string });
			return Promise.resolve({ error: null });
		}),
	};
	return q;
}

const mockFrom = jest.fn(() => userHouseholdsQuery());

jest.mock('@/lib/api-auth', () => ({ requireUser: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { requireUser } = require('@/lib/api-auth');

function post(body: unknown) {
	return new NextRequest('http://localhost:9002/api/household/link', {
		method: 'POST',
		body: typeof body === 'string' ? body : JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});
}

function signedInAs(userId: string) {
	(requireUser as jest.Mock).mockResolvedValue({
		authorized: true,
		userId,
		role: 'GUARDIAN',
	});
}

describe('POST /api/household/link', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		inserted.length = 0;
		LINKS = [{ auth_user_id: 'settled-guardian', household_id: 'hh-settled' }];
		process.env = {
			...OLD_ENV,
			NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
			SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
		};
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	async function call(body: unknown) {
		const { POST } = require('@/app/api/household/link/route');
		const response = await POST(post(body));
		return { status: response.status, body: await response.json() };
	}

	it('rejects a caller with no session', async () => {
		const { NextResponse } = require('next/server');
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		});
		const { status } = await call({ householdId: 'hh-new' });
		expect(status).toBe(401);
		expect(inserted).toHaveLength(0);
	});

	it('links a first-time caller to their new household', async () => {
		signedInAs('fresh-guardian');
		const { status, body } = await call({ householdId: 'hh-new' });
		expect(status).toBe(200);
		expect(body).toEqual({ householdId: 'hh-new', created: true });
		expect(inserted).toEqual([
			{ auth_user_id: 'fresh-guardian', household_id: 'hh-new' },
		]);
	});

	// The finding: a link that already exists must not be repointable, which is
	// what made the attendance route serve another family's rows.
	it('refuses to repoint an existing link at another household', async () => {
		signedInAs('settled-guardian');
		const { status, body } = await call({ householdId: 'hh-someone-else' });
		expect(status).toBe(409);
		expect(body.error).toMatch(/already linked/i);
		expect(inserted).toHaveLength(0);
		expect(LINKS).toContainEqual({
			auth_user_id: 'settled-guardian',
			household_id: 'hh-settled',
		});
	});

	it('is idempotent for the caller’s own household, so a retry is safe', async () => {
		signedInAs('settled-guardian');
		const { status, body } = await call({ householdId: 'hh-settled' });
		expect(status).toBe(200);
		expect(body).toEqual({ householdId: 'hh-settled', created: false });
		expect(inserted).toHaveLength(0);
	});

	it('refuses a household already claimed by someone else', async () => {
		signedInAs('fresh-guardian');
		const { status, body } = await call({ householdId: 'hh-settled' });
		expect(status).toBe(403);
		expect(body.error).toMatch(/already linked to another account/i);
		expect(inserted).toHaveLength(0);
	});

	it('never takes the auth user from the request body', async () => {
		signedInAs('fresh-guardian');
		await call({ householdId: 'hh-new', auth_user_id: 'settled-guardian' });
		expect(inserted).toEqual([
			{ auth_user_id: 'fresh-guardian', household_id: 'hh-new' },
		]);
	});

	it('requires a household id', async () => {
		signedInAs('fresh-guardian');
		for (const body of [{}, { householdId: '' }, { householdId: 42 }, 'not json']) {
			const { status } = await call(body);
			expect(status).toBe(400);
		}
		expect(inserted).toHaveLength(0);
	});

	it('fails closed when the service-role key is missing', async () => {
		signedInAs('fresh-guardian');
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { status } = await call({ householdId: 'hh-new' });
		expect(status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});

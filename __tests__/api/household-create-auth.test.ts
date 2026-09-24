/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

let LINKS: Array<{ auth_user_id: string; household_id: string }> = [];
let HOUSEHOLDS: Array<Record<string, unknown>> = [];
let insertFails = false;
let linkInsertFails = false;
const deleted: string[] = [];

function tableQuery(table: string) {
	let column = '';
	let value = '';
	const q: any = {
		select: jest.fn(() => q),
		eq: jest.fn((col: string, v: string) => {
			column = col;
			value = v;
			return q;
		}),
		maybeSingle: jest.fn(() =>
			Promise.resolve({
				data: LINKS.find((l) => (l as any)[column] === value) ?? null,
				error: null,
			})
		),
		single: jest.fn(() =>
			insertFails
				? Promise.resolve({ data: null, error: { message: 'insert failed' } })
				: Promise.resolve({
						data: { household_id: HOUSEHOLDS[HOUSEHOLDS.length - 1]?.household_id },
						error: null,
				  })
		),
		insert: jest.fn((row: Record<string, unknown>) => {
			if (table === 'households') {
				HOUSEHOLDS.push({ ...row, household_id: `server-generated-${HOUSEHOLDS.length + 1}` });
				return q;
			}
			if (linkInsertFails) return Promise.resolve({ error: { message: 'link failed' } });
			LINKS.push(row as { auth_user_id: string; household_id: string });
			return Promise.resolve({ error: null });
		}),
		delete: jest.fn(() => ({
			eq: jest.fn((_col: string, v: string) => {
				deleted.push(v);
				return Promise.resolve({ error: null });
			}),
		})),
	};
	return q;
}

const mockFrom = jest.fn((table: string) => tableQuery(table));

jest.mock('@/lib/api-auth', () => ({ requireUser: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { requireUser } = require('@/lib/api-auth');

function post(body: unknown) {
	return new NextRequest('http://localhost:9002/api/household', {
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

describe('POST /api/household', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		LINKS = [{ auth_user_id: 'settled-guardian', household_id: 'hh-settled' }];
		HOUSEHOLDS = [];
		deleted.length = 0;
		insertFails = false;
		linkInsertFails = false;
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
		const { POST } = require('@/app/api/household/route');
		const response = await POST(post(body));
		return { status: response.status, body: await response.json() };
	}

	it('rejects a caller with no session', async () => {
		const { NextResponse } = require('next/server');
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		});
		const { status } = await call({ name: 'Smith Household' });
		expect(status).toBe(401);
		expect(HOUSEHOLDS).toHaveLength(0);
		expect(LINKS).toHaveLength(1);
	});

	it('creates the household and its link together', async () => {
		signedInAs('fresh-guardian');
		const { status, body } = await call({ name: 'Smith Household', city: 'Durham' });
		expect(status).toBe(200);
		expect(body.created).toBe(true);
		expect(HOUSEHOLDS[0]).toMatchObject({ name: 'Smith Household', city: 'Durham' });
		expect(LINKS).toContainEqual({
			auth_user_id: 'fresh-guardian',
			household_id: body.householdId,
		});
	});

	// The finding this route exists for: an id chosen by the browser is what let
	// an unlinked household be claimed.
	it('ignores a household id supplied by the caller', async () => {
		signedInAs('fresh-guardian');
		const { body } = await call({ name: 'Smith Household', household_id: 'hh-victim' });
		expect(body.householdId).not.toBe('hh-victim');
		expect(HOUSEHOLDS[0]).not.toHaveProperty('household_id', 'hh-victim');
		expect(LINKS).not.toContainEqual(
			expect.objectContaining({ household_id: 'hh-victim' })
		);
	});

	it('never takes the auth user from the request body', async () => {
		signedInAs('fresh-guardian');
		const { body } = await call({ name: 'Smith', auth_user_id: 'settled-guardian' });
		expect(LINKS).toContainEqual({
			auth_user_id: 'fresh-guardian',
			household_id: body.householdId,
		});
	});

	it('returns the existing household rather than forking the family in two', async () => {
		signedInAs('settled-guardian');
		const { status, body } = await call({ name: 'A Second Registration' });
		expect(status).toBe(200);
		expect(body).toEqual({ householdId: 'hh-settled', created: false });
		expect(HOUSEHOLDS).toHaveLength(0);
	});

	it('removes the household when the link cannot be written', async () => {
		signedInAs('fresh-guardian');
		linkInsertFails = true;
		const { status } = await call({ name: 'Smith Household' });
		expect(status).toBe(500);
		// An unreachable household is the exact row this route exists to avoid.
		expect(deleted).toEqual([HOUSEHOLDS[0].household_id]);
		expect(LINKS).toHaveLength(1);
	});

	it('requires a name, and rejects a body that is not JSON', async () => {
		signedInAs('fresh-guardian');
		for (const body of [{}, { name: '' }, { name: 42 }, 'not json']) {
			const { status } = await call(body);
			expect(status).toBe(400);
		}
		expect(HOUSEHOLDS).toHaveLength(0);
	});

	it('fails closed when the service-role key is missing', async () => {
		signedInAs('fresh-guardian');
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { status } = await call({ name: 'Smith Household' });
		expect(status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});

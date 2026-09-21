/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Two households in the deployment. `guardian-1` owns `hh-1`; everything under
// `hh-2` is another family's and must never reach them.
const HOUSEHOLD_LINKS: Record<string, string> = {
	'guardian-1': 'hh-1',
	'guardian-2': 'hh-2',
};

const CHILDREN = [
	{ child_id: 'own-a', household_id: 'hh-1', is_active: true },
	{ child_id: 'own-b', household_id: 'hh-1', is_active: null },
	{ child_id: 'own-gone', household_id: 'hh-1', is_active: false },
	{ child_id: 'other-a', household_id: 'hh-2', is_active: true },
];

const ATTENDANCE = [
	{ child_id: 'own-a', check_out_at: null, date: '2026-09-21', notes: 'private' },
	{ child_id: 'own-gone', check_out_at: null, date: '2026-09-21', notes: 'private' },
	{ child_id: 'other-a', check_out_at: null, date: '2026-09-21', notes: 'private' },
	{ child_id: 'own-a', check_out_at: null, date: '2026-09-14', notes: 'private' },
];

/** Every `in('child_id', …)` the route sent to the attendance table. */
const attendanceIdFilters: string[][] = [];
/** Every column the route asked the attendance table for. */
const attendanceSelects: string[] = [];

function userHouseholdsQuery() {
	let userId = '';
	const q: any = {
		select: jest.fn(() => q),
		eq: jest.fn((_col: string, value: string) => {
			userId = value;
			return q;
		}),
		maybeSingle: jest.fn(() =>
			Promise.resolve({
				data: HOUSEHOLD_LINKS[userId]
					? { household_id: HOUSEHOLD_LINKS[userId] }
					: null,
				error: null,
			})
		),
	};
	return q;
}

function childrenQuery() {
	const q: any = {
		select: jest.fn(() => q),
		eq: jest.fn((_col: string, householdId: string) =>
			Promise.resolve({
				data: CHILDREN.filter((c) => c.household_id === householdId),
				error: null,
			})
		),
	};
	return q;
}

function attendanceQuery() {
	let date = '';
	const q: any = {
		select: jest.fn((cols: string) => {
			attendanceSelects.push(cols);
			return q;
		}),
		eq: jest.fn((_col: string, value: string) => {
			date = value;
			return q;
		}),
		in: jest.fn((_col: string, ids: string[]) => {
			attendanceIdFilters.push(ids);
			return Promise.resolve({
				data: ATTENDANCE.filter(
					(r) => r.date === date && ids.includes(r.child_id)
				).map((r) => ({ child_id: r.child_id, check_out_at: r.check_out_at })),
				error: null,
			});
		}),
	};
	return q;
}

const mockFrom = jest.fn((table: string) => {
	if (table === 'user_households') return userHouseholdsQuery();
	if (table === 'children') return childrenQuery();
	return attendanceQuery();
});

jest.mock('@/lib/api-auth', () => ({ requireUser: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { requireUser } = require('@/lib/api-auth');

function req(query = '?date=2026-09-21') {
	return new NextRequest(`http://localhost:9002/api/household/attendance${query}`);
}

function signedInAs(userId: string) {
	(requireUser as jest.Mock).mockResolvedValue({
		authorized: true,
		userId,
		role: 'GUARDIAN',
	});
}

describe('GET /api/household/attendance authorization', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		attendanceIdFilters.length = 0;
		attendanceSelects.length = 0;
		process.env = {
			...OLD_ENV,
			NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
			SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
		};
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	async function get(query?: string) {
		const { GET } = require('@/app/api/household/attendance/route');
		const response = await GET(req(query));
		return { status: response.status, body: await response.json() };
	}

	it('rejects a caller with no session', async () => {
		const { NextResponse } = require('next/server');
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		});

		const { status } = await get();
		expect(status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it("returns only the signed-in guardian's own active children", async () => {
		signedInAs('guardian-1');
		const { status, body } = await get();

		expect(status).toBe(200);
		expect(body.attendance.map((r: any) => r.child_id)).toEqual(['own-a']);
		// `own-b` is active with a null flag and is asked for; `own-gone` is not.
		expect(attendanceIdFilters[0].sort()).toEqual(['own-a', 'own-b']);
	});

	// The finding this route exists for: a browser-supplied child list must not
	// widen the read. There is no parameter to honour, so a forged one is inert.
	it('ignores childIds supplied by the caller', async () => {
		signedInAs('guardian-1');
		const { status, body } = await get(
			'?date=2026-09-21&childIds=other-a&childIds=own-gone&child_id=other-a'
		);

		expect(status).toBe(200);
		expect(attendanceIdFilters[0].sort()).toEqual(['own-a', 'own-b']);
		expect(body.attendance.map((r: any) => r.child_id)).not.toContain('other-a');
		expect(body.attendance.map((r: any) => r.child_id)).not.toContain('own-gone');
	});

	// The household itself must come from the validated session too. Deriving it
	// from anything the request carries would move the boundary back into the
	// browser by a different door than `childIds`.
	it('ignores a household or user id supplied by the caller', async () => {
		signedInAs('guardian-1');
		const { status, body } = await get(
			'?date=2026-09-21&userId=guardian-2&auth_user_id=guardian-2' +
				'&householdId=hh-2&household_id=hh-2'
		);

		expect(status).toBe(200);
		expect(attendanceIdFilters[0].sort()).toEqual(['own-a', 'own-b']);
		expect(body.attendance.map((r: any) => r.child_id)).toEqual(['own-a']);
	});

	it('scopes by the session, so two guardians get different answers', async () => {
		signedInAs('guardian-2');
		const { body } = await get();
		expect(attendanceIdFilters[0]).toEqual(['other-a']);
		expect(body.attendance.map((r: any) => r.child_id)).toEqual(['other-a']);
	});

	it('gives a signed-in user with no household an empty list, not everyone', async () => {
		signedInAs('staff-with-no-household');
		const { status, body } = await get();
		expect(status).toBe(200);
		expect(body.attendance).toEqual([]);
		expect(attendanceIdFilters).toHaveLength(0);
	});

	it('requires a well-formed date rather than scanning every day', async () => {
		signedInAs('guardian-1');
		for (const q of ['', '?date=', '?date=yesterday', "?date=2026-09-21' or '1'='1"]) {
			const { status } = await get(q);
			expect(status).toBe(400);
		}
		expect(attendanceIdFilters).toHaveLength(0);
	});

	it('returns only the two fields the presence pill needs', async () => {
		signedInAs('guardian-1');
		const { body } = await get();
		expect(attendanceSelects[0]).toBe('child_id, check_out_at');
		for (const row of body.attendance) {
			expect(Object.keys(row).sort()).toEqual(['check_out_at', 'child_id']);
		}
	});

	it('fails closed when the service-role key is missing', async () => {
		signedInAs('guardian-1');
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { status } = await get();
		expect(status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});

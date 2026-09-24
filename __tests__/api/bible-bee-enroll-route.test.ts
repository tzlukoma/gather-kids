/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

type Row = Record<string, any>;
let DB: Record<string, Row[]>;
const upserts: Array<{ table: string; row: Row; opts: Row }> = [];
const rpcCalls: Array<{ fn: string; args: Row }> = [];

/** A thenable query over DB[table] supporting the calls the route makes. */
function tableQuery(table: string) {
	const filters: Array<[string, unknown]> = [];
	let limitTo: number | undefined;
	const rows = () => {
		let out = (DB[table] ?? []).filter((r) =>
			filters.every(([col, v]) =>
				col.includes('.') ? col.split('.').reduce((o: any, k) => o?.[k], r) === v : r[col] === v
			)
		);
		if (limitTo !== undefined) out = out.slice(0, limitTo);
		return out;
	};
	const q: any = {
		select: jest.fn(() => q),
		eq: jest.fn((col: string, v: unknown) => {
			filters.push([col, v]);
			return q;
		}),
		order: jest.fn(() => q),
		limit: jest.fn((n: number) => {
			limitTo = n;
			return q;
		}),
		maybeSingle: jest.fn(() => Promise.resolve({ data: rows()[0] ?? null, error: null })),
		upsert: jest.fn((row: Row, opts: Row) => {
			upserts.push({ table, row, opts });
			const exists = (DB[table] ?? []).some(
				(r) => r.child_id === row.child_id && r.bible_bee_cycle_id === row.bible_bee_cycle_id
			);
			if (!exists) (DB[table] ??= []).push(row);
			return Promise.resolve({ error: null });
		}),
		then: (resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null }),
	};
	return q;
}

jest.mock('@/lib/api-auth', () => ({ requireUser: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		from: (table: string) => tableQuery(table),
		rpc: jest.fn((fn: string, args: Row) => {
			rpcCalls.push({ fn, args });
			return Promise.resolve({ error: null });
		}),
	})),
}));

const { requireUser } = require('@/lib/api-auth');

function post(body: unknown) {
	return new NextRequest('http://localhost:9002/api/bible-bee/enroll', {
		method: 'POST',
		body: typeof body === 'string' ? body : JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});
}

function signedInAs(userId: string, role = 'GUARDIAN') {
	(requireUser as jest.Mock).mockResolvedValue({ authorized: true, userId, role });
}

describe('POST /api/bible-bee/enroll', () => {
	const OLD_ENV = process.env;
	let POST: (req: NextRequest) => Promise<Response>;

	beforeEach(async () => {
		jest.clearAllMocks();
		upserts.length = 0;
		rpcCalls.length = 0;
		process.env = {
			...OLD_ENV,
			NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
			SUPABASE_SERVICE_ROLE_KEY: 'service-key',
		};
		DB = {
			children: [
				{ child_id: 'ch-own', household_id: 'hh-own', grade: '3rd' },
				{ child_id: 'ch-other', household_id: 'hh-other', grade: '3rd' },
				{ child_id: 'ch-no-bb', household_id: 'hh-own', grade: '3rd' },
			],
			user_households: [{ auth_user_id: 'guardian-1', household_id: 'hh-own' }],
			ministry_enrollments: [
				{ enrollment_id: 'me-1', child_id: 'ch-own', ministries: { code: 'bible-bee' } },
				{ enrollment_id: 'me-2', child_id: 'ch-other', ministries: { code: 'bible-bee' } },
				{ enrollment_id: 'me-3', child_id: 'ch-no-bb', ministries: { code: 'min_sunday_school' } },
			],
			bible_bee_cycles: [{ id: 'cycle-active', is_active: true }],
			divisions: [
				{ id: 'div-primary', bible_bee_cycle_id: 'cycle-active', min_grade: 0, max_grade: 2 },
				{ id: 'div-junior', bible_bee_cycle_id: 'cycle-active', min_grade: 3, max_grade: 5 },
			],
		};
		({ POST } = await import('@/app/api/bible-bee/enroll/route'));
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('enrolls the caller’s own child in the division the grade decides, then prepares assignments', async () => {
		signedInAs('guardian-1');
		const res = await POST(post({ childId: 'ch-own' }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ enrolled: true, cycleId: 'cycle-active', divisionId: 'div-junior' });
		expect(upserts).toHaveLength(1);
		expect(upserts[0].table).toBe('bible_bee_enrollments');
		expect(upserts[0].row).toMatchObject({
			child_id: 'ch-own',
			bible_bee_cycle_id: 'cycle-active',
			division_id: 'div-junior',
		});
		expect(upserts[0].opts).toMatchObject({ onConflict: 'bible_bee_cycle_id,child_id', ignoreDuplicates: true });
		expect(rpcCalls).toEqual([{ fn: 'ensure_student_assignments', args: { p_child_id: 'ch-own' } }]);
	});

	it('ignores a division sent by the client', async () => {
		signedInAs('guardian-1');
		await POST(post({ childId: 'ch-own', divisionId: 'div-primary', bible_bee_cycle_id: 'x' }));
		expect(upserts[0].row.division_id).toBe('div-junior');
		expect(upserts[0].row.bible_bee_cycle_id).toBe('cycle-active');
	});

	it('answers another household’s child exactly as it answers a missing one', async () => {
		signedInAs('guardian-1');
		const other = await POST(post({ childId: 'ch-other' }));
		const missing = await POST(post({ childId: 'ch-nope' }));
		expect(other.status).toBe(404);
		expect(missing.status).toBe(404);
		expect(await other.json()).toEqual(await missing.json());
		expect(upserts).toHaveLength(0);
		expect(rpcCalls).toHaveLength(0);
	});

	it('keeps an existing enrollment and reports the division actually stored', async () => {
		signedInAs('guardian-1');
		DB.bible_bee_enrollments = [
			{ child_id: 'ch-own', bible_bee_cycle_id: 'cycle-active', division_id: 'div-primary' },
		];
		const res = await POST(post({ childId: 'ch-own' }));
		expect(await res.json()).toEqual({ enrolled: true, cycleId: 'cycle-active', divisionId: 'div-primary' });
		expect(DB.bible_bee_enrollments).toHaveLength(1);
	});

	it('lets an admin enroll any child', async () => {
		signedInAs('admin-1', 'ADMIN');
		const res = await POST(post({ childId: 'ch-other' }));
		expect(res.status).toBe(200);
		expect(upserts[0].row.child_id).toBe('ch-other');
	});

	it('refuses a child who is not signed up for the Bible Bee ministry', async () => {
		signedInAs('guardian-1');
		const res = await POST(post({ childId: 'ch-no-bb' }));
		expect(res.status).toBe(409);
		expect(upserts).toHaveLength(0);
	});

	it('writes nothing when no cycle is active', async () => {
		signedInAs('guardian-1');
		DB.bible_bee_cycles = [];
		const res = await POST(post({ childId: 'ch-own' }));
		expect(await res.json()).toEqual({ enrolled: false, reason: 'no_active_cycle' });
		expect(upserts).toHaveLength(0);
	});

	it('writes nothing when no division covers the grade', async () => {
		signedInAs('guardian-1');
		DB.children[0].grade = '11th';
		const res = await POST(post({ childId: 'ch-own' }));
		expect(await res.json()).toEqual({ enrolled: false, reason: 'no_division_for_grade' });
		expect(upserts).toHaveLength(0);
	});

	it('requires a child id', async () => {
		signedInAs('guardian-1');
		expect((await POST(post({}))).status).toBe(400);
		expect((await POST(post('not json'))).status).toBe(400);
	});

	it('passes through an unauthenticated response', async () => {
		const response = new Response(null, { status: 401 });
		(requireUser as jest.Mock).mockResolvedValue({ authorized: false, response });
		expect(await POST(post({ childId: 'ch-own' }))).toBe(response);
	});
});

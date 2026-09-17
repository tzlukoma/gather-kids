/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Rows the service-role client would return. `leader-1` logged one incident;
// everything else belongs to other leaders and must never reach them.
const INCIDENT_ROWS = [
	{ child_id: 'child-own', leader_id: 'leader-1' },
	{ child_id: 'child-other', leader_id: 'leader-2' },
	{ child_id: 'child-third', leader_id: 'leader-3' },
];

const capturedIn: string[][] = [];
const capturedEq: Array<[string, string]> = [];

function makeEnrollmentQuery() {
	const query: Record<string, unknown> = {
		select: jest.fn(() => query),
		in: jest.fn((_col: string, ids: string[]) => {
			capturedIn.push(ids);
			return query;
		}),
		eq: jest.fn((col: string, value: string) => {
			capturedEq.push([col, value]);
			return query;
		}),
		then: undefined,
	};
	// Awaiting the builder resolves to the result.
	(query as { then: unknown }).then = (resolve: (v: unknown) => void) =>
		resolve({
			data: capturedIn[capturedIn.length - 1].map((id) => ({
				child_id: id,
				ministry_id: `min-for-${id}`,
			})),
			error: null,
		});
	return query;
}

const mockFrom = jest.fn((table: string) => {
	if (table === 'incidents') {
		return {
			select: jest.fn(() =>
				Promise.resolve({ data: INCIDENT_ROWS, error: null })
			),
		};
	}
	return makeEnrollmentQuery();
});

jest.mock('@/lib/api-auth', () => ({
	requireUser: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { requireUser } = require('@/lib/api-auth');

function req(url = 'http://localhost:9002/api/incidents/ministry-scope') {
	return new NextRequest(url);
}

describe('GET /api/incidents/ministry-scope authorization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		capturedIn.length = 0;
		capturedEq.length = 0;
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
	});

	it('rejects an unauthenticated caller and reads nothing', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
			}),
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		const res = await GET(req());

		expect(res.status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it('limits a MINISTRY_LEADER to children from incidents they logged', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		const res = await GET(req());
		const body = await res.json();

		expect(res.status).toBe(200);
		// Negative: the other leaders' children are never queried, so they cannot
		// appear in the response no matter what the database holds.
		expect(capturedIn[0]).toEqual(['child-own']);
		expect(capturedIn[0]).not.toContain('child-other');
		expect(capturedIn[0]).not.toContain('child-third');
		expect(body.pairs).toEqual([
			{ child_id: 'child-own', ministry_id: 'min-for-child-own' },
		]);
	});

	it('gives an ADMIN every child that has an incident', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'admin-1',
			role: 'ADMIN',
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		await GET(req());

		expect(capturedIn[0]).toEqual(['child-own', 'child-other', 'child-third']);
	});

	it('ignores child ids supplied by the caller', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		await GET(
			req(
				'http://localhost:9002/api/incidents/ministry-scope?childIds=child-other,child-third&child_id=child-other'
			)
		);

		// The scope still comes from the session, not the query string.
		expect(capturedIn[0]).toEqual(['child-own']);
	});

	it('passes a cycle filter through but never widens the child scope', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		await GET(
			req('http://localhost:9002/api/incidents/ministry-scope?cycleId=cycle-1')
		);

		expect(capturedEq).toContainEqual(['cycle_id', 'cycle-1']);
		expect(capturedIn[0]).toEqual(['child-own']);
	});

	it('returns an empty scope without querying enrollments when nothing is visible', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-with-nothing',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/ministry-scope/route');
		const res = await GET(req());
		const body = await res.json();

		expect(body.pairs).toEqual([]);
		expect(capturedIn).toHaveLength(0);
	});
});

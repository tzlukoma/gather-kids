/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const calls: Array<{ method: string; args: unknown[] }> = [];

function makeQuery() {
	const query: Record<string, unknown> = {};
	for (const method of ['select', 'eq', 'is', 'gte', 'lt', 'order']) {
		query[method] = jest.fn((...args: unknown[]) => {
			calls.push({ method, args });
			// `order` is the terminal call the route awaits.
			return method === 'order' ? Promise.resolve({ data: [], error: null }) : query;
		});
	}
	return query;
}

const mockFrom = jest.fn(() => makeQuery());

jest.mock('@/lib/api-auth', () => ({
	requireUser: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { requireUser } = require('@/lib/api-auth');

const req = (url = 'http://localhost:9002/api/incidents') => new NextRequest(url);
const eqCalls = () => calls.filter((c) => c.method === 'eq').map((c) => c.args);

describe('GET /api/incidents authorization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		calls.length = 0;
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
	});

	it('rejects an unauthenticated caller without reading incidents', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
		});

		const { GET } = await import('@/app/api/incidents/route');
		const res = await GET(req());

		expect(res.status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it('constrains a MINISTRY_LEADER to incidents they logged', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req());

		// Applied as a database predicate, so other leaders' incidents are never
		// returned to the browser at all.
		expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
	});

	it('treats a GUEST (no trusted role) as unprivileged rather than admin', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'someone',
			role: 'GUEST',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req());

		expect(eqCalls()).toContainEqual(['leader_id', 'someone']);
	});

	it('does not constrain an ADMIN', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'admin-1',
			role: 'ADMIN',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req());

		expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
	});

	it('keeps the leader constraint when filtering unacknowledged', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req('http://localhost:9002/api/incidents?unacknowledged=true'));

		expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
		expect(calls.some((c) => c.method === 'is')).toBe(true);
	});

	it('keeps the leader constraint when filtering by date', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'leader-1',
			role: 'MINISTRY_LEADER',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req('http://localhost:9002/api/incidents?date=2026-09-16'));

		expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
		expect(calls.some((c) => c.method === 'gte')).toBe(true);
	});

	it('rejects a malformed date instead of ignoring it', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'admin-1',
			role: 'ADMIN',
		});

		const { GET } = await import('@/app/api/incidents/route');
		const res = await GET(req("http://localhost:9002/api/incidents?date=not-a-date"));

		expect(res.status).toBe(400);
	});
});

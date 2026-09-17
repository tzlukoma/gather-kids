/**
 * @jest-environment node
 */


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

import { NextRequest } from 'next/server';

const eqCalls = () => calls.filter((c) => c.method === 'eq').map((c) => c.args);
const argsFor = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
const req = (url = 'http://localhost:9002/api/incidents') => new NextRequest(url);
const asUser = (role: string, userId = 'u1') =>
	(requireUser as jest.Mock).mockResolvedValue({ authorized: true, userId, role });

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

	// An admin whose `app_metadata.role` has not been backfilled resolves as
	// GUEST. That must scope them down, never up.
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

	it('does not let a guardian read other people\'s incidents', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'guardian-1',
			role: 'GUARDIAN',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET(req());

		expect(eqCalls()).toContainEqual(['leader_id', 'guardian-1']);
	});

	it('returns 503 rather than an unscoped read when the service key is absent', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'admin-1',
			role: 'ADMIN',
		});
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;

		const { GET } = await import('@/app/api/incidents/route');
		const res = await GET(req());

		expect(res.status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});

	// The day view is the deliberate exception (#430). Check-in renders an
	// incident marker per child, so a child hurt in an earlier service must stay
	// flagged to whoever hands them back at pickup, whichever leader logged it.
	// Scoping this to `leader_id` would silently remove that signal.
	describe('?date= — the door / roster view', () => {
		it('lets a MINISTRY_LEADER see the whole day, not only their own', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req('http://localhost:9002/api/incidents?date=2026-09-16'));

			expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
		});

		it('does not open the day view to a guardian', async () => {
			asUser('GUARDIAN', 'guardian-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req('http://localhost:9002/api/incidents?date=2026-09-16'));

			expect(eqCalls()).toContainEqual(['leader_id', 'guardian-1']);
		});

		it('bounds the query to that single UTC day', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req('http://localhost:9002/api/incidents?date=2026-09-16'));

			expect(argsFor('gte')).toContainEqual(['timestamp', '2026-09-16T00:00:00.000Z']);
			expect(argsFor('lt')).toContainEqual(['timestamp', '2026-09-17T00:00:00.000Z']);
		});

		it('rejects a malformed date rather than ignoring the filter', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			const res = await GET(req('http://localhost:9002/api/incidents?date=not-a-date'));

			expect(res.status).toBe(400);
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it('does not let the day view widen the plain incident list', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req());

			expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
		});
	});

	describe('?unacknowledged=true — the dashboard pending card', () => {
		it('keeps the leader constraint and filters to pending', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req('http://localhost:9002/api/incidents?unacknowledged=true'));

			expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
			expect(argsFor('is')).toContainEqual(['admin_acknowledged_at', null]);
		});

		it('does not constrain an ADMIN', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(req('http://localhost:9002/api/incidents?unacknowledged=true'));

			expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
			expect(argsFor('is')).toContainEqual(['admin_acknowledged_at', null]);
		});
	});
});

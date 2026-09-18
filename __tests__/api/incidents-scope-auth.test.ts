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
import { getServiceDayIso } from '@/lib/utils/timezone';

const eqCalls = () => calls.filter((c) => c.method === 'eq').map((c) => c.args);
const argsFor = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
const req = (url = 'http://localhost:9002/api/incidents') => new NextRequest(url);

// Computed, not hardcoded: a literal date would start failing the day it aged
// out of the live window, which is the behaviour under test, not a bug.
//
// These must be **service** days, not UTC days. Deriving them from
// `toISOString()` made the suite time-dependent: run between 8pm ET and
// midnight, `utcDay(Date.now())` is already tomorrow locally, so `TODAY` fell
// outside the route's live window and the staff carve-out tests failed for
// reasons that had nothing to do with the code under test.
const DAY_MS = 24 * 60 * 60 * 1000;
const serviceDay = (ms: number) => getServiceDayIso(new Date(ms));
const TODAY = serviceDay(Date.now());
const YESTERDAY = serviceDay(Date.now() - DAY_MS);
const TWO_DAYS_AGO = serviceDay(Date.now() - 2 * DAY_MS);
const dateReq = (d: string) => req(`http://localhost:9002/api/incidents?date=${d}`);
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
	//
	// `date` is caller-controlled, so the exception is bounded in time as well as
	// by role — otherwise a leader could walk it backwards a day at a time and
	// rebuild the history this endpoint exists to stop exposing.
	describe('?date= — the door / roster view', () => {
		it('lets a MINISTRY_LEADER see the whole day, not only their own', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(TODAY));

			expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
		});

		// 00:00 UTC is 20:00 US Eastern, which can fall mid-service. A check-in
		// screen open across that boundary asks for the previous UTC day; if that
		// dropped to `leader_id` scope the pickup marker would vanish nightly.
		it('still opens the day view across the UTC midnight boundary', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(YESTERDAY));

			expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
		});

		// The reconstruction attack: iterate `date` backwards and reassemble the
		// table. The carve-out has no child-safety justification outside the live
		// window, so outside it a leader sees only what they logged.
		it('constrains a MINISTRY_LEADER to their own incidents on a historical date', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(TWO_DAYS_AGO));

			expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
		});

		it('constrains a MINISTRY_LEADER to their own incidents on a future date', async () => {
			asUser('MINISTRY_LEADER', 'leader-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(serviceDay(Date.now() + DAY_MS)));

			expect(eqCalls()).toContainEqual(['leader_id', 'leader-1']);
		});

		// An admin already sees the unfiltered list with no parameter at all, so
		// bounding them here would protect nothing.
		it('does not time-bound an ADMIN', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(TWO_DAYS_AGO));

			expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
		});

		it('does not open the day view to a guardian', async () => {
			asUser('GUARDIAN', 'guardian-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq(TODAY));

			expect(eqCalls()).toContainEqual(['leader_id', 'guardian-1']);
		});

		// `date` is a church-local service day, not a UTC one (#447): midnight ET
		// is 04:00Z during EDT. Anchoring the window to UTC put the rollover at
		// 8pm ET, so an incident logged during an evening programme was stamped
		// with the next UTC day and fell outside the window the door screen asked
		// for — the marker disappeared mid-service.
		it('bounds the query to that single service day, in church-local time', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq('2026-09-16'));

			expect(argsFor('gte')).toContainEqual(['timestamp', '2026-09-16T04:00:00.000Z']);
			expect(argsFor('lt')).toContainEqual(['timestamp', '2026-09-17T04:00:00.000Z']);
		});

		// The regression in one assertion: 8:30pm ET on the 16th is 00:30Z on the
		// 17th, so the old UTC window for '2026-09-16' excluded it.
		it('includes an incident logged after the old UTC rollover', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq('2026-09-16'));

			const eveningIncident = '2026-09-17T00:30:00.000Z';
			const [, start] = argsFor('gte').find(([col]) => col === 'timestamp')!;
			const [, end] = argsFor('lt').find(([col]) => col === 'timestamp')!;

			expect(eveningIncident >= (start as string)).toBe(true);
			expect(eveningIncident < (end as string)).toBe(true);
		});

		// A spring-forward day is 23 hours long and a fall-back day 25, so the end
		// bound has to be the next day's local midnight rather than start + 24h.
		it('sizes a DST transition day correctly', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			await GET(dateReq('2026-03-08'));

			expect(argsFor('gte')).toContainEqual(['timestamp', '2026-03-08T05:00:00.000Z']);
			expect(argsFor('lt')).toContainEqual(['timestamp', '2026-03-09T04:00:00.000Z']);
		});

		it('rejects a malformed date rather than ignoring the filter', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			const res = await GET(dateReq('not-a-date'));

			expect(res.status).toBe(400);
			expect(mockFrom).not.toHaveBeenCalled();
		});

		// A shape check alone lets `2026-99-99` through, which parses to NaN and
		// makes `toISOString` throw — turning a bad request into a 500.
		it.each(['2026-99-99', '2026-13-01', '2026-00-10', '2026-01-32'])(
			'rejects the unparseable date %s with 400, not 500',
			async (bad) => {
				asUser('ADMIN', 'admin-1');

				const { GET } = await import('@/app/api/incidents/route');
				const res = await GET(dateReq(bad));

				expect(res.status).toBe(400);
				expect(mockFrom).not.toHaveBeenCalled();
			}
		);

		// The worse case: `2026-02-30` parses fine and silently normalises to
		// 2026-03-02, so without a round-trip check the route would answer for a
		// different day than the caller asked for, with no error at all.
		it('rejects a date that parses but normalises to a different day', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			const res = await GET(dateReq('2026-02-30'));

			expect(res.status).toBe(400);
			expect(mockFrom).not.toHaveBeenCalled();
		});

		// A real leap day must still be accepted — the round-trip check must
		// reject normalisation, not every February 29th.
		it('accepts a genuine leap day', async () => {
			asUser('ADMIN', 'admin-1');

			const { GET } = await import('@/app/api/incidents/route');
			const res = await GET(dateReq('2028-02-29'));

			expect(res.status).toBe(200);
			// EST in February, so local midnight is 05:00Z.
			expect(argsFor('gte')).toContainEqual(['timestamp', '2028-02-29T05:00:00.000Z']);
			expect(argsFor('lt')).toContainEqual(['timestamp', '2028-03-01T05:00:00.000Z']);
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

/**
 * @jest-environment node
 */


const calls: Array<{ method: string; args: unknown[] }> = [];

function makeQuery() {
	const query: Record<string, unknown> = {};
	for (const method of ['select', 'eq', 'order']) {
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
		const res = await GET();

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
		await GET();

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
		await GET();

		expect(eqCalls()).toContainEqual(['leader_id', 'someone']);
	});

	it('does not constrain an ADMIN', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'admin-1',
			role: 'ADMIN',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET();

		expect(eqCalls().some(([col]) => col === 'leader_id')).toBe(false);
	});

	it('does not let a guardian read other people\'s incidents', async () => {
		(requireUser as jest.Mock).mockResolvedValue({
			authorized: true,
			userId: 'guardian-1',
			role: 'GUARDIAN',
		});

		const { GET } = await import('@/app/api/incidents/route');
		await GET();

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
		const res = await GET();

		expect(res.status).toBe(503);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});

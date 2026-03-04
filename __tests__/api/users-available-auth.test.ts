/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockListUsers = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/lib/api-auth', () => ({
	requireAdmin: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			admin: {
				listUsers: mockListUsers,
			},
		},
		from: () => ({
			select: mockSelect.mockReturnValue({
				then: (fn: (arg: { data: unknown[]; error: null }) => unknown) =>
					Promise.resolve(fn({ data: [], error: null })),
			}),
		}),
	})),
}));

const { requireAdmin } = require('@/lib/api-auth');

describe('GET /api/users/available admin verification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
	});

	it('returns 403 when caller is not admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 }),
		});

		const { GET } = await import('@/app/api/users/available/route');
		const request = new NextRequest('http://localhost/api/users/available', { method: 'GET' });
		const res = await GET(request);

		expect(res.status).toBe(403);
		expect(mockListUsers).not.toHaveBeenCalled();
	});

	it('calls listUsers when caller is admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: true,
			user: { user_metadata: { role: 'ADMIN' } },
		});

		const { GET } = await import('@/app/api/users/available/route');
		const request = new NextRequest('http://localhost/api/users/available', { method: 'GET' });
		const res = await GET(request);

		expect(res.status).toBe(200);
		expect(mockListUsers).toHaveBeenCalled();
		const body = await res.json();
		expect(body).toHaveProperty('users');
		expect(Array.isArray(body.users)).toBe(true);
	});
});

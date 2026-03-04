/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockListUsers = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();

jest.mock('@/lib/api-auth', () => ({
	requireAdmin: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			admin: {
				listUsers: mockListUsers,
				getUserById: mockGetUserById,
				updateUserById: mockUpdateUserById,
			},
		},
	})),
}));

const { requireAdmin } = require('@/lib/api-auth');

describe('GET/POST /api/users admin verification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
		mockGetUserById.mockResolvedValue({
			data: { user: { id: 'u1', user_metadata: {} } },
			error: null,
		});
		mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
	});

	it('GET returns 403 when caller is not admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 }),
		});

		const { GET } = await import('@/app/api/users/route');
		const request = new NextRequest('http://localhost/api/users', { method: 'GET' });
		const res = await GET(request);

		expect(res.status).toBe(403);
		expect(mockListUsers).not.toHaveBeenCalled();
	});

	it('POST returns 403 when caller is not admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 }),
		});

		const { POST } = await import('@/app/api/users/route');
		const request = new NextRequest('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify({ userId: 'u1', role: 'ADMIN' }),
			headers: { 'Content-Type': 'application/json' },
		});
		const res = await POST(request);

		expect(res.status).toBe(403);
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});
});

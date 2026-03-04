/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/api-auth', () => ({
	requireAdmin: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			admin: {
				getUserById: mockGetUserById,
				updateUserById: mockUpdateUserById,
			},
		},
		from: jest.fn(() => ({
			update: mockUpdate,
		})),
	})),
}));

const { requireAdmin } = require('@/lib/api-auth');

describe('PATCH /api/users/[userId]', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		mockGetUserById.mockResolvedValue({
			data: {
				user: {
					id: 'user-123',
					user_metadata: { role: 'GUEST', full_name: 'Test' },
				},
			},
			error: null,
		});
		mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
		mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
	});

	async function patchUser(userId: string, body: Record<string, unknown>) {
		const { PATCH } = await import('@/app/api/users/[userId]/route');
		const request = new NextRequest(`http://localhost/api/users/${userId}`, {
			method: 'PATCH',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
		});
		return PATCH(request, { params: Promise.resolve({ userId }) });
	}

	it('returns 403 when caller is not admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 }),
		});

		const res = await patchUser('user-123', { role: 'ADMIN' });

		expect(res.status).toBe(403);
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});

	it('returns 400 when no fields provided', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await patchUser('user-123', {});

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/role|email_confirmed|password/i);
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});

	it('updates role via user_metadata merge', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await patchUser('user-123', { role: 'ADMIN' });

		expect(mockUpdateUserById).toHaveBeenCalledWith(
			'user-123',
			expect.objectContaining({
				user_metadata: expect.objectContaining({
					role: 'ADMIN',
					full_name: 'Test',
				}),
			})
		);
	});

	it('sets email_confirmed_at when email_confirmed is true', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await patchUser('user-123', { email_confirmed: true });

		expect(mockUpdateUserById).toHaveBeenCalledWith(
			'user-123',
			expect.objectContaining({
				email_confirmed_at: expect.any(String),
			})
		);
	});

	it('updates password when provided and length >= 8', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await patchUser('user-123', { password: 'newpassword123' });

		expect(mockUpdateUserById).toHaveBeenCalledWith(
			'user-123',
			expect.objectContaining({
				password: 'newpassword123',
			})
		);
	});

	it('handles all three fields in a single updateUserById call', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await patchUser('user-123', {
			role: 'GUARDIAN',
			email_confirmed: true,
			password: 'newpass123',
		});

		expect(mockUpdateUserById).toHaveBeenCalledTimes(1);
		const call = mockUpdateUserById.mock.calls[0][1];
		expect(call.role).toBeUndefined();
		expect(call.user_metadata?.role).toBe('GUARDIAN');
		expect(call.email_confirmed_at).toBeDefined();
		expect(call.password).toBe('newpass123');
	});

	it('syncs role change to public users table', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await patchUser('user-123', { role: 'MINISTRY_LEADER' });

		expect(mockUpdate).toHaveBeenCalled();
		const updatePayload = mockUpdate.mock.calls[0][0];
		expect(updatePayload).toEqual(expect.objectContaining({ role: 'MINISTRY_LEADER' }));
	});

	it('returns 400 for password shorter than 8 chars', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await patchUser('user-123', { password: 'short' });

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/password|8/i);
		expect(mockUpdateUserById).not.toHaveBeenCalled();
	});

	it('returns 404 when userId does not exist', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });
		mockGetUserById.mockResolvedValue({ data: { user: null }, error: { message: 'Not found' } });

		const res = await patchUser('nonexistent', { role: 'ADMIN' });

		expect(res.status).toBe(404);
		const data = await res.json();
		expect(data.error).toBeDefined();
	});
});

/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockCreateUser = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/api-auth', () => ({
	requireAdmin: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			admin: {
				createUser: mockCreateUser,
			},
		},
		from: jest.fn(() => ({
			upsert: mockUpsert,
		})),
	})),
}));

const { requireAdmin } = require('@/lib/api-auth');

describe('POST /api/users/create', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		mockCreateUser.mockResolvedValue({
			data: {
				user: {
					id: 'new-user-uuid',
					email: 'new@example.com',
					user_metadata: { role: 'GUARDIAN', full_name: 'New User' },
				},
			},
			error: null,
		});
		mockUpsert.mockResolvedValue({ data: null, error: null });
	});

	async function postCreate(body: Record<string, unknown>) {
		const { POST } = await import('@/app/api/users/create/route');
		const request = new NextRequest('http://localhost/api/users/create', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
		});
		return POST(request);
	}

	it('returns 403 when caller is not admin', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 403,
			}),
		});

		const res = await postCreate({
			email: 'u@example.com',
			password: 'password123',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(403);
		expect(requireAdmin).toHaveBeenCalled();
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it('returns 400 for missing email', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await postCreate({
			password: 'password123',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/email/i);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it('returns 400 for missing password', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await postCreate({
			email: 'u@example.com',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/password/i);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it('returns 400 for password shorter than 8 chars', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await postCreate({
			email: 'u@example.com',
			password: 'short',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/password|8/i);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it('returns 400 for invalid email format', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await postCreate({
			email: 'not-an-email',
			password: 'password123',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toMatch(/email/i);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it('creates user in Auth with correct params', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		await postCreate({
			email: 'new@example.com',
			password: 'password123',
			full_name: 'New User',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(mockCreateUser).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'new@example.com',
				password: 'password123',
				email_confirm: true,
				user_metadata: expect.objectContaining({
					role: 'GUARDIAN',
					full_name: 'New User',
				}),
			})
		);
	});

	it('upserts into public users table after Auth success', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });
		mockCreateUser.mockResolvedValue({
			data: {
				user: {
					id: 'auth-uuid-123',
					email: 'new@example.com',
					user_metadata: { role: 'ADMIN', full_name: 'Admin User' },
				},
			},
			error: null,
		});

		await postCreate({
			email: 'new@example.com',
			password: 'password123',
			full_name: 'Admin User',
			role: 'ADMIN',
			email_confirm: true,
		});

		expect(mockUpsert).toHaveBeenCalled();
		const upsertPayload = mockUpsert.mock.calls[0][0];
		expect(upsertPayload).toEqual(
			expect.objectContaining({
				user_id: 'auth-uuid-123',
				email: 'new@example.com',
				name: 'Admin User',
				role: 'ADMIN',
				is_active: true,
			})
		);
	});

	it('returns 200 with warning when Auth succeeds but DB upsert fails', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });
		mockUpsert.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const res = await postCreate({
			email: 'new@example.com',
			password: 'password123',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.success).toBe(true);
		expect(data.warning).toMatch(/database sync failed/i);
	});

	it('returns 4xx when Auth returns user already exists', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });
		mockCreateUser.mockResolvedValue({
			data: { user: null },
			error: { message: 'User already registered' },
		});

		const res = await postCreate({
			email: 'existing@example.com',
			password: 'password123',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.status).toBeLessThan(500);
		const data = await res.json();
		expect(data.error).toBeDefined();
		expect(mockUpsert).not.toHaveBeenCalled();
	});

	it('returns 200 with created user data on success', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });

		const res = await postCreate({
			email: 'new@example.com',
			password: 'password123',
			full_name: 'New User',
			role: 'GUARDIAN',
			email_confirm: true,
		});

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.success).toBe(true);
		expect(data.user).toBeDefined();
		expect(data.user.id).toBe('new-user-uuid');
		expect(data.user.email).toBe('new@example.com');
	});

	it('uses email as name when full_name is omitted', async () => {
		(requireAdmin as jest.Mock).mockResolvedValue({ authorized: true, session: {} });
		mockCreateUser.mockResolvedValue({
			data: {
				user: {
					id: 'uid',
					email: 'nobody@example.com',
					user_metadata: { role: 'GUEST', full_name: 'nobody@example.com' },
				},
			},
			error: null,
		});

		await postCreate({
			email: 'nobody@example.com',
			password: 'password123',
			role: 'GUEST',
			email_confirm: false,
		});

		expect(mockCreateUser).toHaveBeenCalledWith(
			expect.objectContaining({
				user_metadata: expect.objectContaining({
					full_name: 'nobody@example.com',
				}),
			})
		);
		const upsertPayload = mockUpsert.mock.calls[0][0];
		expect(upsertPayload.name).toBe('nobody@example.com');
	});
});

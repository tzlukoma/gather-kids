/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/offline-supabase', () => ({
	isTestAuthApiEnabled: jest.fn(() => false),
}));

jest.mock('@/lib/email-service', () => ({
	createEmailService: jest.fn(),
}));

jest.mock('@/lib/test-auth-store', () => ({
	getTestUser: jest.fn(),
	registerTestUser: jest.fn(),
	resendTestUserVerification: jest.fn(),
	verifyTestUser: jest.fn(),
}));

function jsonRequest(url: string, body: Record<string, unknown>): NextRequest {
	return new NextRequest(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('test-auth APIs when the dummy/MailHog gate is off', () => {
	it('POST /api/auth/test-login returns 503', async () => {
		const { POST } = await import('@/app/api/auth/test-login/route');
		const response = await POST(
			jsonRequest('http://localhost/api/auth/test-login', {
				email: 'test@example.com',
				password: 'secret',
			})
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: 'Test auth is not enabled',
		});
	});

	it('PUT /api/auth/test-login returns 503', async () => {
		const { PUT } = await import('@/app/api/auth/test-login/route');
		const response = await PUT(
			jsonRequest('http://localhost/api/auth/test-login', {
				email: 'test@example.com',
			})
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: 'Test auth is not enabled',
		});
	});

	it('POST /api/auth/test-signup returns 503', async () => {
		const { POST } = await import('@/app/api/auth/test-signup/route');
		const response = await POST(
			jsonRequest('http://localhost/api/auth/test-signup', {
				email: 'test@example.com',
				password: 'secret',
			})
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: 'Test signup is not enabled',
		});
	});

	it('POST /api/auth/test-verify returns 503', async () => {
		const { POST } = await import('@/app/api/auth/test-verify/route');
		const response = await POST(
			jsonRequest('http://localhost/api/auth/test-verify', {
				code: 'abc',
			})
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: 'Test auth is not enabled',
		});
	});
});

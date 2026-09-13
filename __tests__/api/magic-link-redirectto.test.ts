/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockEmailService = {
	testConnection: jest.fn().mockResolvedValue(true),
	sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
};

jest.mock('@/lib/email-service', () => ({
	createEmailService: () => mockEmailService,
}));

const mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabaseClient', () => ({
	supabase: {
		auth: {
			signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
		},
	},
}));

import { POST } from '@/app/api/auth/magic-link/route';

describe('Magic Link API redirectTo', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv, NODE_ENV: 'test' };
		process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED = 'true';
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
		process.env.SMTP_HOST = 'localhost';
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('embeds safe next path in MailHog callback URL', async () => {
		const request = new NextRequest('http://localhost:9002/api/auth/magic-link', {
			method: 'POST',
			body: JSON.stringify({ email: 'test@example.com', next: '/register' }),
			headers: { 'Content-Type': 'application/json' },
		});

		const response = await POST(request);
		expect(response.status).toBe(200);

		expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				magicLink: expect.stringContaining(
					'http://localhost:9002/auth/callback?next=%2Fregister'
				),
			})
		);

		const magicLink = mockEmailService.sendMagicLinkEmail.mock.calls[0][0]
			.magicLink as string;
		expect(magicLink).toMatch(/next=%2Fregister&code=/);
	});

	it('rejects unsafe next paths', async () => {
		const request = new NextRequest('http://localhost:9002/api/auth/magic-link', {
			method: 'POST',
			body: JSON.stringify({
				email: 'test@example.com',
				next: 'https://evil.com',
			}),
			headers: { 'Content-Type': 'application/json' },
		});

		await POST(request);

		const magicLink = mockEmailService.sendMagicLinkEmail.mock.calls[0][0]
			.magicLink as string;
		expect(magicLink).toContain('next=%2Fhousehold');
		expect(magicLink).not.toContain('evil.com');
	});

	it('passes redirect URL with next to Supabase when configured', async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';

		const request = new NextRequest(
			'https://gather-kids-abc123.vercel.app/api/auth/magic-link',
			{
				method: 'POST',
				body: JSON.stringify({ email: 'prod@example.com', next: '/register' }),
				headers: { 'Content-Type': 'application/json' },
			}
		);

		await POST(request);

		expect(mockSignInWithOtp).toHaveBeenCalledWith({
			email: 'prod@example.com',
			options: {
				emailRedirectTo:
					'https://gather-kids-abc123.vercel.app/auth/callback?next=%2Fregister',
			},
		});
	});
});

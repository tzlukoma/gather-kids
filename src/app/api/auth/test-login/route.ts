import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email-service';
import { encodeTestAuthCode } from '@/lib/test-auth-code';
import { isTestAuthApiEnabled } from '@/lib/offline-supabase';
import { getTestUser, resendTestUserVerification } from '@/lib/test-auth-store';

export async function POST(request: NextRequest) {
	if (!isTestAuthApiEnabled()) {
		return NextResponse.json(
			{ error: 'Test auth is not enabled' },
			{ status: 503 }
		);
	}

	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'Email and password are required' },
				{ status: 400 }
			);
		}

		const user = getTestUser(email);
		if (!user || user.password !== password) {
			return NextResponse.json(
				{ error: 'Invalid email or password. Please try again.' },
				{ status: 401 }
			);
		}

		if (!user.verified) {
			return NextResponse.json(
				{
					error: 'Please verify your email address before signing in.',
				},
				{ status: 403 }
			);
		}

		return NextResponse.json({
			user: {
				uid: `test-${user.email.replace(/[^a-z0-9]/gi, '-')}`,
				displayName: user.email.split('@')[0],
				email: user.email,
				is_active: true,
				metadata: {
					role: 'GUEST',
				},
			},
		});
	} catch (error) {
		console.error('Test login API error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	if (!isTestAuthApiEnabled()) {
		return NextResponse.json(
			{ error: 'Test auth is not enabled' },
			{ status: 503 }
		);
	}

	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json({ error: 'Email is required' }, { status: 400 });
		}

		if (!resendTestUserVerification(email)) {
			return NextResponse.json({ error: 'Account not found' }, { status: 404 });
		}

		const user = getTestUser(email);
		if (!user) {
			return NextResponse.json({ error: 'Account not found' }, { status: 404 });
		}

		const emailService = createEmailService();
		const requestUrl = new URL(request.url);
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
		const code = encodeTestAuthCode({
			email: user.email,
			type: 'email_verify',
			timestamp: Date.now(),
		});
		const verificationLink = `${baseUrl}/auth/callback?code=${code}&type=email_verify`;

		await emailService.sendVerificationEmail({
			to: user.email,
			verificationLink,
			appName: process.env.NEXT_PUBLIC_APP_NAME || 'gatherKids',
		});

		return NextResponse.json({ message: 'Verification email resent' });
	} catch (error) {
		console.error('Test resend verification API error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

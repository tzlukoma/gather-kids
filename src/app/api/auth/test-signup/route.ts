import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email-service';
import { encodeTestAuthCode } from '@/lib/test-auth-code';
import { isTestAuthApiEnabled } from '@/lib/offline-supabase';
import { registerTestUser } from '@/lib/test-auth-store';

export async function POST(request: NextRequest) {
	if (!isTestAuthApiEnabled()) {
		return NextResponse.json(
			{ error: 'Test signup is not enabled' },
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

		if (password.length < 6) {
			return NextResponse.json(
				{ error: 'Password must be at least 6 characters long' },
				{ status: 400 }
			);
		}

		registerTestUser(email, password);

		const emailService = createEmailService();
		const isConnected = await emailService.testConnection();
		if (!isConnected) {
			return NextResponse.json(
				{ error: 'Email service not available' },
				{ status: 503 }
			);
		}

		const requestUrl = new URL(request.url);
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
		const code = encodeTestAuthCode({
			email,
			type: 'email_verify',
			timestamp: Date.now(),
		});
		const verificationLink = `${baseUrl}/auth/callback?code=${code}&type=email_verify`;

		await emailService.sendVerificationEmail({
			to: email,
			verificationLink,
			appName: process.env.NEXT_PUBLIC_APP_NAME || 'gatherKids',
		});

		return NextResponse.json({
			message: 'Verification email sent successfully',
			email,
		});
	} catch (error) {
		console.error('Test signup API error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

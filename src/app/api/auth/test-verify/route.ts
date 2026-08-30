import { NextRequest, NextResponse } from 'next/server';
import { decodeTestAuthCode } from '@/lib/test-auth-code';
import { isTestAuthApiEnabled } from '@/lib/offline-supabase';
import { verifyTestUser } from '@/lib/test-auth-store';

export async function POST(request: NextRequest) {
	if (!isTestAuthApiEnabled()) {
		return NextResponse.json(
			{ error: 'Test auth is not enabled' },
			{ status: 503 }
		);
	}

	try {
		const { code } = await request.json();

		if (!code) {
			return NextResponse.json({ error: 'Code is required' }, { status: 400 });
		}

		const decoded = decodeTestAuthCode(code);

		if (decoded.type !== 'email_verify') {
			return NextResponse.json(
				{ error: 'Invalid verification link' },
				{ status: 400 }
			);
		}

		const verified = verifyTestUser(decoded.email);
		if (!verified) {
			return NextResponse.json({ error: 'Account not found' }, { status: 404 });
		}

		return NextResponse.json({
			message: 'Email verified successfully',
			email: decoded.email,
		});
	} catch (error) {
		console.error('Test verify API error:', error);
		return NextResponse.json(
			{ error: 'Invalid verification link' },
			{ status: 400 }
		);
	}
}

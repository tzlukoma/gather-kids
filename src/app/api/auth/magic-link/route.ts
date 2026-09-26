import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email-service';
import { resolveSafePostAuthPath } from '@/lib/authRedirect';
import { isTestAuthApiEnabled } from '@/lib/offline-supabase';

/**
 * MailHog magic links for dummy-Supabase e2e runs only.
 *
 * Live magic links are requested from the browser with
 * `supabase.auth.signInWithOtp`: /auth/callback exchanges the PKCE code with
 * the verifier the requesting browser stored, so a link requested here could
 * never be completed (and the browser client is null on the server).
 */
export async function POST(request: NextRequest) {
  if (!isTestAuthApiEnabled()) {
    return NextResponse.json(
      { error: 'Test auth is not enabled' },
      { status: 503 }
    );
  }

  try {
    const { email, next } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const postAuthPath = resolveSafePostAuthPath(
      typeof next === 'string' ? next : null,
      '/household'
    );
    const redirectToUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(postAuthPath)}`;

    try {
      const emailService = createEmailService();

      // Test connection first
      const isConnected = await emailService.testConnection();
      if (!isConnected) {
        throw new Error('Email service not available');
      }

      // Create a mock magic link for testing using the current request URL
      const code = Buffer.from(JSON.stringify({
        email,
        timestamp: Date.now(),
        type: 'magic_link'
      })).toString('base64url');

      const magicLinkUrl = new URL(redirectToUrl);
      magicLinkUrl.searchParams.set('code', code);
      magicLinkUrl.searchParams.set('type', 'magiclink');
      const magicLink = magicLinkUrl.toString();

      await emailService.sendMagicLinkEmail({
        to: email,
        magicLink: magicLink,
        appName: process.env.NEXT_PUBLIC_APP_NAME || 'gatherKids'
      });

    } catch (emailError) {
      console.error('MailHog email error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send test verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      // This intentionally does not echo the email.
      message: 'Verification email sent successfully',
    });

  } catch (error) {
    console.error('Magic link API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

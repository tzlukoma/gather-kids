import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email-service';
import { resolveSafePostAuthPath } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
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

    // Check if we're in a test environment or if magic links are enabled
    const isMagicEnabled = process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED === 'true';
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.SMTP_HOST === 'localhost';

    if (!isMagicEnabled && !isTestMode) {
      return NextResponse.json(
        { error: 'Magic link authentication is not enabled' },
        { status: 503 }
      );
    }

    // Check if Supabase is configured for live magic links
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('dummy');

    if (!isSupabaseConfigured && !isTestMode) {
      return NextResponse.json(
        { error: 'Authentication service not configured' },
        { status: 503 }
      );
    }

    // Get the current request URL to construct the redirectTo URL
    // This supports Vercel preview deployments, production, and local development
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const postAuthPath = resolveSafePostAuthPath(
      typeof next === 'string' ? next : null,
      '/household'
    );
    const redirectToUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(postAuthPath)}`;

    if (isSupabaseConfigured) {
      // Use Supabase's built-in magic link functionality
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectToUrl,
          shouldCreateUser: true,
        }
      });

      if (error) {
        console.error('Supabase magic link error:', error);
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }

    } else if (isTestMode) {
      // For testing with MailHog, send a mock magic link
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

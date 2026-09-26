import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email-service';
import { resolveSafePostAuthPath } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabaseClient';
import { getGatherSystemAccountEntryFlag } from '@/lib/flags/get-gathersystem-account-entry-flag';

export async function POST(request: NextRequest) {
  try {
    const { email, next, accountEntry } = await request.json();

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

    // The unified account entry is gated by its own flag, evaluated here on the
    // server so a client cannot unlock magic links by sending accountEntry.
    const isAccountEntryEnabled =
      accountEntry === true && (await getGatherSystemAccountEntryFlag());

    if (!isMagicEnabled && !isAccountEntryEnabled && !isTestMode) {
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
    // Account entry uses the path-only callback. Query-string callback URLs can
    // miss a path-only Supabase redirect allowlist on Preview deployments.
    const postAuthPath = resolveSafePostAuthPath(
      typeof next === 'string' ? next : null,
      '/household'
    );
    const redirectToUrl = accountEntry
      ? `${baseUrl}/auth/callback`
      : `${baseUrl}/auth/callback?next=${encodeURIComponent(postAuthPath)}`;

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

    const response = NextResponse.json({
      // This intentionally does not confirm account existence or echo email.
      message: accountEntry ? 'Check your email to continue.' : 'Verification email sent successfully',
    });
    if (accountEntry) {
      // UX-only marker consumed after an authenticated callback. It does not
      // authorize anything and is scoped to the one callback route.
      response.cookies.set('gk_account_entry_flow', '1', {
        path: '/auth/callback',
        sameSite: 'lax',
        maxAge: 10 * 60,
      });
    }
    return response;

  } catch (error) {
    console.error('Magic link API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

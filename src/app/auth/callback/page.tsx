'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, handlePKCECodeExchange } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [mounted, setMounted] = useState(false);
	const hasRun = useRef(false); // Prevent infinite loops

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted || hasRun.current || error || success) return;

		// Demo mode redirect
		if (isDemo()) {
			router.replace('/login');
			return;
		}

		hasRun.current = true;

		const handleAuthCallback = async () => {
			try {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
				const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

				if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('dummy')) {
					setError('Supabase is not properly configured for this environment.');
					return;
				}

				// Check for URL error parameters first
				const error_code = searchParams?.get('error_code') || '';
				const error_description = searchParams?.get('error_description') || '';

				if (error_code || error_description) {
					let userMessage = 'Authentication failed';

					if (error_code === 'access_denied') {
						userMessage =
							'Magic link access was denied. Please request a new one.';
					} else if (error_description?.includes('expired')) {
						userMessage =
							'The magic link has expired. Please request a new one.';
					} else if (error_description) {
						userMessage = error_description;
					}

					setError(userMessage);
					return;
				}

				// Try to use exchangeCodeForSession for PKCE flow, which is the modern approach
				let data, authError;

				try {
					// Extract the code from the URL
					const url = new URL(window.location.href);
					const code = url.searchParams.get('code');

					if (!code) {
						authError = new Error('No code parameter found in URL');
						console.error('Auth callback error: No code parameter in URL');
					} else {
						console.log('Found code in URL, exchanging for session');

						// Add more diagnostic logging for debugging
						console.log('Browser storage state:', {
							hasLocalStorage: typeof localStorage !== 'undefined',
							hasSessionStorage: typeof sessionStorage !== 'undefined',
							pkceVerifier: localStorage.getItem(
								'supabase.auth.token.code_verifier'
							),
							origin: window.location.origin,
						});

						// Use our enhanced helper function for PKCE flow
						const result = await handlePKCECodeExchange(code);
						data = result.data;
						authError = result.error;
					}
				} catch (err) {
					console.error('Error processing auth callback:', err);
					authError = err;
				}

				if (authError) {
					console.error('Auth error:', authError);

					// Enhanced detection of partial success cases
					// Check for any of these conditions that would indicate the auth actually worked:
					// 1. We have actual session data despite the error
					// 2. Supabase created auth tokens in localStorage
					// 3. We have an access_token or refresh_token in localStorage

					// Check localStorage for Supabase tokens
					const sbTokens = Object.keys(window.localStorage).filter(
						(key) => key && key.startsWith('sb-')
					);

					const hasAccessToken = sbTokens.some((key) =>
						key.includes('access_token')
					);
					const hasRefreshToken = sbTokens.some((key) =>
						key.includes('refresh_token')
					);
					const hasSupabaseTokens = sbTokens.length > 0;

					const isPartialSuccess =
						!!(data && data.session) || // We have session data
						hasAccessToken ||
						hasRefreshToken || // We have specific tokens
						hasSupabaseTokens; // Any Supabase token exists

					console.log('Auth callback partial success detection:', {
						hasSessionData: !!(data && data.session),
						hasSupabaseTokens,
						hasAccessToken,
						hasRefreshToken,
						tokenCount: sbTokens.length,
					});

					if (isPartialSuccess) {
						// This indicates the auth succeeded at the Supabase level but something went wrong with our handling
						setError(`⚠️ Almost there! 

Authentication was successful with Supabase, but there was an issue completing the process.

**Technical details:** 
${authError.message || 'Error handling the authentication response'}

**You can try:**
1. Clicking the "Continue to App" button below to proceed
2. Refreshing this page to see if you're already logged in
3. Going back to the login page if needed

This typically happens when your authentication worked but there was an issue handling the redirect.`);
					} else if (
						authError.message.includes('code verifier should be non-empty') ||
						authError.message.includes('both auth code and code verifier')
					) {
						// Check if this is a Vercel preview deployment
						const isVercelPreview =
							window.location.hostname.includes('vercel.app');

						if (authError.status === 400) {
							setError(`🔧 Browser Storage Issue

The authentication process couldn't find required verification data in your browser storage.

**Possible causes:**
• Using a different browser than where you requested the link
• Cleared browser storage or cookies between request and login
• Using private/incognito browsing mode
• Browser extensions blocking storage access

**To Fix:**
1. Try requesting a new magic link and clicking it in the same browser tab
2. Use password authentication instead
3. Try with private browsing / extensions disabled`);
						} else {
							setError(`❌ Magic Link Error

The verification code required for magic links was not found. This happens when:

• Magic link opened in a different browser than where it was requested
• Browser storage was cleared between request and click
• Private browsing mode is blocking storage
• The link has already been used

**Solutions:**
1. Request a new magic link in the same browser tab
2. Use password authentication instead
3. Try in a normal (non-private) browser window`);
						}
					} else if (authError.message.includes('expired')) {
						setError(
							'The magic link has expired. Magic links are valid for 1 hour. Please request a new one.'
						);
					} else if (
						authError.message.includes('invalid') ||
						authError.message.includes('bad_code')
					) {
						setError(
							'The magic link is invalid or has already been used. Please request a new one.'
						);
					} else {
						setError(`Authentication failed: ${authError.message}`);
					}
				} else if (data.session) {
					setSuccess(true);
					setTimeout(() => router.push('/register'), 1500);
				} else {
					setError(
						'Authentication completed but no session was created. Please try again.'
					);
				}
			} catch (err) {
				console.error('Unexpected error in auth callback:', err);
				setError(
					err instanceof Error ? err.message : 'An unexpected error occurred.'
				);
			} finally {
				setLoading(false);
			}
		};

		handleAuthCallback();
	}, [router, mounted, searchParams, error, success]);

	// Prevent hydration mismatch
	if (!mounted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<Loader2 className="h-5 w-5 animate-spin" />
							Loading...
						</CardTitle>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// Demo mode redirect
	if (isDemo()) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<AlertCircle className="h-5 w-5 text-muted-foreground" />
							Demo Mode
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						<p className="text-muted-foreground">
							Live Auth is disabled in Demo Mode.
						</p>
						<Button asChild>
							<Link href="/login">Return to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2">
						{loading && <Loader2 className="h-5 w-5 animate-spin" />}
						{success && <CheckCircle className="h-5 w-5 text-green-600" />}
						{error && <AlertCircle className="h-5 w-5 text-red-600" />}
						{loading ? 'Signing you in...' : success ? 'Success!' : 'Error'}
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center space-y-4">
					{loading && (
						<p className="text-muted-foreground">
							Please wait while we sign you in...
						</p>
					)}

					{success && (
						<div className="space-y-2">
							<p className="text-green-600">
								You've been signed in successfully!
							</p>
							<p className="text-sm text-muted-foreground">
								Redirecting to complete your setup...
							</p>
						</div>
					)}

					{error && (
						<div className="space-y-4">
							<div
								className={`${
									error.includes('⚠️ Almost there!')
										? 'text-amber-600'
										: 'text-red-600'
								} whitespace-pre-line text-sm`}>
								{error}
							</div>
							<div className="flex flex-col gap-2">
								{error.includes('⚠️ Almost there!') ? (
									<>
										<Button asChild className="bg-amber-600 hover:bg-amber-700">
											<Link href="/register">Continue to App</Link>
										</Button>
										<Button variant="outline" asChild>
											<Link href="/login">Back to Login</Link>
										</Button>
									</>
								) : (
									<>
										<Button asChild>
											<Link href="/login">Request New Magic Link</Link>
										</Button>
										<Button variant="outline" asChild>
											<Link href="/">Return Home</Link>
										</Button>
									</>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function AuthCallbackPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<CardTitle className="flex items-center justify-center gap-2">
								<Loader2 className="h-5 w-5 animate-spin" />
								Loading...
							</CardTitle>
						</CardHeader>
					</Card>
				</div>
			}>
			<AuthCallbackContent />
		</Suspense>
	);
}

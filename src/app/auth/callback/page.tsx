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
		console.log('🔍 AuthCallback: Component mounting...');
		setMounted(true);
	}, []);

	// Add a timeout to prevent users from getting stuck indefinitely
	useEffect(() => {
		if (!mounted || !loading) return;

		const timeoutTimer = setTimeout(() => {
			if (loading && !error && !success) {
				console.error('Auth callback timeout - user stuck in loading state');

				// Check if we have any Supabase tokens that might indicate partial success
				const hasSupabaseTokens = Object.keys(localStorage).some(
					(key) => key && key.startsWith('sb-')
				);

				if (hasSupabaseTokens) {
					setError(`⚠️ Authentication Partially Successful

The authentication process is taking longer than expected, but we detected that you may already be signed in.

**This can happen when:**
• The authentication worked but the redirect is delayed
• There's a temporary network issue
• The page is taking longer to load

**Please try:**
1. Click "Continue to Registration" below to proceed
2. Refresh this page to check if you're already signed in
3. Request a new magic link if needed`);
				} else {
					setError(`⏰ Authentication Timeout

The authentication process is taking longer than expected. This can happen if:

• There's a network connectivity issue
• The magic link has expired or been used
• There's a temporary server issue

**Please try:**
1. Check your internet connection
2. Request a new magic link
3. Contact support if the issue persists`);
				}
				setLoading(false);
			}
		}, 10000); // Reduced to 10 second timeout

		return () => clearTimeout(timeoutTimer);
	}, [mounted, loading, error, success]);

	useEffect(() => {
		console.log('🔍 AuthCallback: Main effect running...', {
			mounted,
			hasRun: hasRun.current,
			error,
			success,
		});
		if (!mounted || hasRun.current || error || success) return;

		// Demo mode redirect
		if (isDemo()) {
			console.log('🔍 AuthCallback: Demo mode detected, redirecting to login');
			router.replace('/login');
			return;
		}

		console.log(
			'🔍 AuthCallback: Setting hasRun to true and starting auth callback'
		);
		hasRun.current = true;

		const handleAuthCallback = async () => {
			try {
				console.log('🔍 AuthCallback: Starting handleAuthCallback...');
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
				const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

				console.log('🔍 AuthCallback: Supabase config check', {
					hasUrl: !!supabaseUrl,
					hasKey: !!supabaseAnonKey,
					isDummy: supabaseUrl?.includes('dummy'),
				});

				if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('dummy')) {
					console.log(
						'🔍 AuthCallback: Supabase not configured, setting error'
					);
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

				// Determine the intended redirect destination based on the auth context
				// Check if this is a local development environment with email confirmations disabled
				const isLocalDev =
					process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
					process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');
				const isEmailConfirmationsDisabled =
					process.env.NODE_ENV === 'development';

				// For local dev with email confirmations disabled, redirect directly to register
				// Otherwise, redirect to household first - it will handle redirecting to registration if needed
				const targetRedirect =
					isLocalDev && isEmailConfirmationsDisabled
						? '/register'
						: '/household';

				// Try to use exchangeCodeForSession for PKCE flow, which is the modern approach
				let data: any, authError: any;

				try {
					// Extract the code from the URL
					const url = new URL(window.location.href);
					const code = url.searchParams.get('code');
					const type = url.searchParams.get('type');

					if (!code) {
						authError = new Error('No code parameter found in URL');
						console.error('Auth callback error: No code parameter in URL');
					} else {
						console.log('Found code in URL, exchanging for session');

						// Check if this is an email verification link for registration
						if (type === 'magiclink') {
							try {
								// Decode the verification link using browser-compatible base64url decoding
								// Convert base64url to base64 by replacing URL-safe characters
								const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
								// Add padding if needed
								const paddedBase64 =
									base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
								// Decode using atob (browser native)
								const decodedString = atob(paddedBase64);
								const decoded = JSON.parse(decodedString);

								if (decoded.type === 'magic_link' && decoded.email) {
									console.log(
										'Processing email verification for registration:',
										decoded.email
									);

									// Redirect to registration form with verified email
									const redirectUrl = `${targetRedirect}?verified_email=${encodeURIComponent(
										decoded.email
									)}`;
									console.log('Magic link redirect to:', redirectUrl);
									router.push(redirectUrl);
									return;
								} else {
									throw new Error('Invalid email verification link format');
								}
							} catch (decodeError) {
								console.error(
									'Error decoding email verification link:',
									decodeError
								);
								authError = new Error('Invalid email verification link');
							}
						} else {
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
							console.log(
								'🔍 AuthCallback: About to exchange code for session...'
							);
							const result = await handlePKCECodeExchange(code);
							console.log('🔍 AuthCallback: PKCE exchange result:', {
								hasData: !!result.data,
								hasSession: !!result.data?.session,
								hasError: !!result.error,
								errorMessage: result.error?.message,
							});
							data = result.data;
							authError = result.error;
						}
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
1. Clicking the "Continue to Registration" button below to proceed
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
					console.log(
						`🔍 AuthCallback: Auth successful! Redirecting to ${targetRedirect} in 1.5 seconds...`
					);

					// Set up redirect with timeout fallback
					setTimeout(() => {
						console.log(
							`🔍 AuthCallback: Executing redirect to ${targetRedirect}`
						);
						console.log(
							`🔍 AuthCallback: Current URL before redirect: ${window.location.href}`
						);
						const redirectResult = router.push(targetRedirect);
						console.log(`🔍 AuthCallback: router.push result:`, redirectResult);

						// Check if redirect worked after a short delay
						setTimeout(() => {
							console.log(
								`🔍 AuthCallback: URL after redirect attempt: ${window.location.href}`
							);
							if (window.location.pathname !== targetRedirect) {
								console.warn(
									`🔍 AuthCallback: Redirect may not have worked. Expected: ${targetRedirect}, Actual: ${window.location.pathname}`
								);
								// Only show error if redirect actually failed
								setError(
									`✅ Authentication Successful!\n\nYou\'ve been successfully signed in, but the automatic redirect didn\'t work.\n\n**Please click the button below to continue:**`
								);
								setLoading(false);
							} else {
								console.log(`🔍 AuthCallback: Redirect successful!`);
								// Redirect worked, just hide the loading state
								setLoading(false);
							}
						}, 500);
					}, 1500);

					// Remove the fallback timeout since redirect is working
					// The page might take time to load but that's normal
				} else {
					// No session was created - could be due to email not yet verified or other issues
					console.log('Auth callback completed but no session created');

					// Check if this is local development with email confirmations disabled
					const isLocalDev =
						process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
						process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');

					if (isLocalDev) {
						// In local dev, try to redirect anyway as email confirmations might be disabled
						console.log(
							'Local dev detected - attempting redirect despite no session'
						);
						setSuccess(true);
						setTimeout(() => {
							console.log('Executing local dev redirect to register');
							router.push('/register');
						}, 1500);
					} else {
						setError(
							`Authentication link processed, but no active session was created.

This can happen if:
• The verification link was already used
• The link has expired 
• Email verification is still required

**Next steps:**
1. Try clicking "Continue to Registration" to check if you're already signed in
2. Check your email for additional verification messages
3. Request a new verification email if needed`
						);
					}
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
								You&apos;ve been signed in successfully!
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
									error.includes('⚠️ Almost there!') ||
									error.includes('✅ Authentication Successful!')
										? 'text-amber-600'
										: error.includes('⏰ Authentication Timeout')
										? 'text-orange-600'
										: 'text-red-600'
								} whitespace-pre-line text-sm`}>
								{error}
							</div>
							<div className="flex flex-col gap-2">
								{error.includes('⚠️ Almost there!') ||
								error.includes('✅ Authentication Successful!') ||
								error.includes('⚠️ Authentication Partially Successful') ? (
									<>
										<Button asChild className="bg-amber-600 hover:bg-amber-700">
											<Link href="/register">Continue to Registration</Link>
										</Button>
										<Button variant="outline" asChild>
											<Link href="/login">Back to Login</Link>
										</Button>
									</>
								) : error.includes('⏰ Authentication Timeout') ? (
									<>
										<Button
											asChild
											className="bg-orange-600 hover:bg-orange-700">
											<Link href="/login">Request New Magic Link</Link>
										</Button>
										<Button variant="outline" asChild>
											<Link href="/register">Try Registration Directly</Link>
										</Button>
										<Button variant="outline" asChild>
											<Link href="/">Return Home</Link>
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

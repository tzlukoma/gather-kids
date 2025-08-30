'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
						// This is the recommended method for PKCE flow in newer Supabase versions
						const result = await supabase.auth.exchangeCodeForSession(code);
						data = result.data;
						authError = result.error;
					}
				} catch (err) {
					console.error('Error processing auth callback:', err);
					authError = err;
				}

				if (authError) {
					console.error('Auth error:', authError);

					if (
						authError.message.includes('code verifier should be non-empty') ||
						authError.message.includes('both auth code and code verifier')
					) {
						if (authError.status === 400) {
							setError(`🔧 Configuration Issue

The current domain (${window.location.origin}) is not configured in your Supabase project.

**To Fix:**
1. Open your Supabase project dashboard
2. Go to Authentication → URL Configuration  
3. Add this domain to "Redirect URLs"
4. For Vercel previews: add *.vercel.app

**Alternative:** Use password authentication for preview deployments.`);
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
					setTimeout(() => router.push('/onboarding'), 1500);
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
							<div className="text-red-600 whitespace-pre-line text-sm">
								{error}
							</div>
							<div className="flex flex-col gap-2">
								<Button asChild>
									<Link href="/login">Request New Magic Link</Link>
								</Button>
								<Button variant="outline" asChild>
									<Link href="/">Return Home</Link>
								</Button>
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

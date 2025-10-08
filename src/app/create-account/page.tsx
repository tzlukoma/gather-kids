'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Church } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useBranding } from '@/contexts/branding-context';
import { supabase } from '@/lib/supabaseClient';

export default function CreateAccountPage() {
	const router = useRouter();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const { settings } = useBranding();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [needsVerification, setNeedsVerification] = useState(false);

	// Set page title based on verification state
	useEffect(() => {
		document.title = needsVerification
			? 'Check Your Email - gatherKids'
			: 'Create Account - gatherKids';
	}, [needsVerification]);

	// Redirect to login if in demo mode or password auth is disabled
	useEffect(() => {
		if (flags.isDemoMode || !flags.loginPasswordEnabled) {
			router.replace('/login');
		}
	}, [flags.isDemoMode, flags.loginPasswordEnabled, router]);

	const handleCreateAccount = async () => {
		if (!email || !password || !confirmPassword) {
			toast({
				title: 'Missing Information',
				description: 'Please fill in all fields.',
				variant: 'destructive',
			});
			return;
		}

		if (password !== confirmPassword) {
			toast({
				title: 'Password Mismatch',
				description: 'Passwords do not match.',
				variant: 'destructive',
			});
			return;
		}

		if (password.length < 6) {
			toast({
				title: 'Password Too Short',
				description: 'Password must be at least 6 characters long.',
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);

		try {
			if (!supabase) {
				throw new Error('Supabase client not available');
			}

			console.log('🔍 Create Account: Starting signup process', {
				email,
				supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
				hasSupabaseClient: !!supabase,
				timestamp: new Date().toISOString(),
			});

			// Skip connection test to avoid hanging - go directly to signup
			console.log(
				'🔍 Create Account: Skipping connection test, proceeding to signup'
			);

			const baseUrl = window.location.origin;
			console.log('🔍 Create Account: About to call supabase.auth.signUp', {
				email,
				baseUrl,
				redirectTo: `${baseUrl}/auth/callback`,
			});

			// Add timeout to prevent hanging
			const signupPromise = supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${baseUrl}/auth/callback`,
				},
			});

			console.log(
				'🔍 Create Account: Signup promise created, starting race with timeout'
			);

			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => {
					console.log('🔍 Create Account: Timeout reached, rejecting promise');
					reject(new Error('Signup request timed out after 15 seconds'));
				}, 15000);
			});

			console.log('🔍 Create Account: About to await Promise.race');
			const { data, error } = (await Promise.race([
				signupPromise,
				timeoutPromise,
			])) as any;
			console.log('🔍 Create Account: Promise.race completed');

			console.log('🔍 Create Account: Supabase signup response', {
				hasData: !!data,
				hasUser: !!data?.user,
				hasSession: !!data?.session,
				userEmail: data?.user?.email,
				error: error?.message,
				supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
				responseKeys: Object.keys(data || {}),
				sessionKeys: data?.session ? Object.keys(data.session) : null,
				userKeys: data?.user ? Object.keys(data.user) : null,
			});

			if (error) {
				throw error;
			}

			// Check if email verification is required
			// In local development with email confirmations disabled, users are automatically signed in
			const isLocalDev =
				process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
				process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');

			console.log('🔍 Create Account: Environment check', {
				isLocalDev,
				supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
				hasUser: !!data?.user,
				hasSession: !!data?.session,
			});

			// Check if we have a successful signup response
			if (data?.user) {
				console.log(
					'🔍 Create Account: User created successfully, checking session status'
				);

				// If we have a session, user is signed in - redirect to register
				if (data.session) {
					console.log(
						'🔍 Create Account: Session present, redirecting to register',
						{
							sessionExists: !!data.session,
							sessionType: typeof data.session,
							sessionKeys: data.session ? Object.keys(data.session) : null,
						}
					);
					toast({
						title: 'Account Created',
						description: 'Your account has been created successfully!',
					});
					console.log(
						'🔍 Create Account: About to call router.push("/register")'
					);

					// Check if we're already on the register page
					if (window.location.pathname === '/register') {
						console.log(
							'🔍 Create Account: Already on register page, skipping redirect'
						);
						return;
					}

					// Try router.push first
					const pushResult = router.push('/register');
					console.log(
						'🔍 Create Account: router.push("/register") called, result:',
						pushResult
					);

					// Check if navigation actually happened after a short delay
					setTimeout(() => {
						if (window.location.pathname !== '/register') {
							console.log(
								'🔍 Create Account: router.push failed, using fallback redirect'
							);
							console.log(
								'🔍 Create Account: Current pathname:',
								window.location.pathname
							);
							console.log(
								'🔍 Create Account: Document ready state:',
								document.readyState
							);
							console.log('🔍 Create Account: Router state:', router);
							window.location.href = '/register';
						} else {
							console.log(
								'🔍 Create Account: router.push succeeded, no fallback needed'
							);
						}
					}, 1000);
				}
				// If no session but we're in local dev, still redirect
				else if (isLocalDev) {
					console.log(
						'🔍 Create Account: No session but local dev, redirecting to register',
						{
							isLocalDev,
							hasSession: !!data.session,
						}
					);
					toast({
						title: 'Account Created',
						description: 'Your account has been created successfully!',
					});
					console.log(
						'🔍 Create Account: About to call router.push("/register") (local dev)'
					);

					// Check if we're already on the register page
					if (window.location.pathname === '/register') {
						console.log(
							'🔍 Create Account: Already on register page, skipping redirect (local dev)'
						);
						return;
					}

					// Try router.push first
					const pushResult = router.push('/register');
					console.log(
						'🔍 Create Account: router.push("/register") called, result:',
						pushResult,
						'(local dev)'
					);

					// Check if navigation actually happened after a short delay
					setTimeout(() => {
						if (window.location.pathname !== '/register') {
							console.log(
								'🔍 Create Account: router.push failed, using fallback redirect (local dev)'
							);
							console.log(
								'🔍 Create Account: Current pathname:',
								window.location.pathname
							);
							console.log(
								'🔍 Create Account: Document ready state:',
								document.readyState
							);
							console.log('🔍 Create Account: Router state:', router);
							window.location.href = '/register';
						} else {
							console.log(
								'🔍 Create Account: router.push succeeded, no fallback needed (local dev)'
							);
						}
					}, 1000);
				}
				// If no session and not local dev, show verification message
				else {
					console.log(
						'🔍 Create Account: No session, showing verification message'
					);
					setNeedsVerification(true);
					toast({
						title: 'Check Your Email',
						description:
							'Please check your inbox to verify your email address.',
					});
				}
			} else {
				console.log(
					'🔍 Create Account: No user in response, this should not happen'
				);
				toast({
					title: 'Account Creation Failed',
					description: 'No user data received from server.',
					variant: 'destructive',
				});
			}
		} catch (error: any) {
			console.error('🔍 Create Account: Signup error:', error);

			// Handle timeout specifically
			if (error.message?.includes('timed out')) {
				toast({
					title: 'Request Timeout',
					description:
						'The signup request is taking longer than expected. This might be due to a connection issue. Please try again.',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Account Creation Failed',
					description:
						error.message || 'Unable to create account. Please try again.',
					variant: 'destructive',
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const handleResendVerification = async () => {
		if (!email) {
			toast({
				title: 'Email Required',
				description: 'Please enter your email address.',
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			if (!supabase) {
				throw new Error('Supabase client not available');
			}

			const baseUrl = window.location.origin;
			const { error } = await supabase.auth.resend({
				type: 'signup',
				email,
				options: {
					emailRedirectTo: `${baseUrl}/auth/callback`,
				},
			});

			if (error) {
				throw error;
			}

			toast({
				title: 'Verification Email Sent',
				description: 'Please check your inbox for the verification email.',
			});
		} catch (error: any) {
			console.error('Resend error:', error);
			toast({
				title: 'Resend Failed',
				description: error.message || 'Unable to resend verification email.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	if (needsVerification) {
		return (
			<div className="flex flex-col min-h-screen bg-muted/50">
				<main className="flex-grow flex flex-col items-center justify-center p-4">
					<div className="mb-8">
						<Link
							href="/"
							className="flex items-center gap-2 font-headline text-3xl font-bold text-foreground">
							{settings.logo_url ? (
								<>
									<img
										src={settings.logo_url}
										alt={`${settings.app_name || 'gatherKids'} Logo`}
										className={`h-24 w-auto ${
											settings.use_logo_only ? '' : 'max-w-[50%]'
										} object-contain`}
									/>
									{!settings.use_logo_only && (
										<span>{settings.app_name || 'gatherKids'}</span>
									)}
								</>
							) : (
								<>
									<Church className="h-10 w-10 text-primary" />
									<span>{settings.app_name || 'gatherKids'}</span>
								</>
							)}
						</Link>
					</div>
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<CardTitle className="text-2xl font-bold font-headline">
								Check Your Email
							</CardTitle>
							<CardDescription>
								We&apos;ve sent a verification link to your email address.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>Verification Required</AlertTitle>
								<AlertDescription>
									Please check your inbox and click the verification link to
									activate your account. Once verified, you&apos;ll be able to
									continue with registration.
								</AlertDescription>
							</Alert>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="m@example.com"
								/>
							</div>
							<Button
								onClick={handleResendVerification}
								disabled={loading}
								className="w-full"
								variant="outline">
								{loading ? 'Sending...' : 'Resend Verification Email'}
							</Button>
							<div className="text-center">
								<Link href="/login" className="text-sm underline">
									Back to Sign In
								</Link>
							</div>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen bg-muted/50">
			<main className="flex-grow flex flex-col items-center justify-center p-4">
				<div className="mb-8">
					<Link
						href="/"
						className="flex items-center gap-2 font-headline text-3xl font-bold text-foreground">
						{settings.logo_url ? (
							<>
								<img
									src={settings.logo_url}
									alt={`${settings.app_name || 'gatherKids'} Logo`}
									className={`h-24 w-auto ${
										settings.use_logo_only ? '' : 'max-w-[50%]'
									} object-contain`}
								/>
								{!settings.use_logo_only && (
									<span>{settings.app_name || 'gatherKids'}</span>
								)}
							</>
						) : (
							<>
								<Church className="h-10 w-10 text-primary" />
								<span>{settings.app_name || 'gatherKids'}</span>
							</>
						)}
					</Link>
				</div>
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold font-headline">
							Create Account
						</CardTitle>
						<CardDescription>
							Create an account to register your family
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="At least 6 characters"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm Password</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder="Confirm your password"
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleCreateAccount}
							disabled={loading}
							className="w-full">
							{loading ? 'Creating Account...' : 'Create Account'}
						</Button>
						<div className="text-center text-sm">
							Already have an account?{' '}
							<Link href="/login" className="underline">
								Sign In
							</Link>
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}

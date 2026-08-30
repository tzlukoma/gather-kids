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
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Info,
	Church,
	AlertTriangle,
	Eye,
	EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { ForgotPasswordDialog } from '@/components/auth/forgot-password-dialog';
import { AuthRole } from '@/lib/auth-types';
import { isOfflineSupabase } from '@/lib/offline-supabase';
import { supabase } from '@/lib/supabaseClient';
import { getPostLoginRoute } from '@/lib/auth-utils';
import { resolveGuardianPostLoginRoute } from '@/lib/dal';

export default function LoginPage() {
	const router = useRouter();
	const { login } = useAuth();
	const { settings } = useBranding();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	// Show session expired toast if redirected from an expired session
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const sessionExpired = sessionStorage.getItem('auth:session_expired');
			if (sessionExpired) {
				sessionStorage.removeItem('auth:session_expired');
				toast({
					title: 'Session Expired',
					description: 'Your session has expired. Please sign in again.',
					variant: 'destructive',
				});
			}
		}
	}, [toast]);

	// Handle Supabase authentication
	const handleLogin = async () => {
		setLoading(true);

		try {
			if (flags.loginPasswordEnabled) {
				if (isOfflineSupabase()) {
					const response = await fetch('/api/auth/test-login', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ email, password }),
					});

					const body = await response.json().catch(() => ({}));

					if (!response.ok) {
						toast({
							title: 'Login Failed',
							description:
								body.error ||
								'Unable to sign in. Please check your credentials.',
							variant: 'destructive',
						});
						return;
					}

					toast({
						title: 'Login Successful',
						description: 'Welcome back!',
					});

					await login(body.user);
					router.push('/register');
					return;
				}

				if (!supabase) {
					throw new Error('Supabase client not available');
				}

				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (error) {
					let errorMessage = 'Unable to sign in. Please check your credentials.';

					if (error.message) {
						if (error.message.includes('Invalid login credentials')) {
							errorMessage = 'Invalid email or password. Please try again.';
						} else if (error.message.includes('Email not confirmed')) {
							errorMessage = 'Please verify your email address before signing in.';
						} else if (error.message.includes('Too many requests')) {
							errorMessage = 'Too many login attempts. Please wait a moment and try again.';
						} else {
							errorMessage = error.message;
						}
					}

					toast({
						title: 'Login Failed',
						description: errorMessage,
						variant: 'destructive',
					});
					return;
				}

				if (data.session) {
					toast({
						title: 'Login Successful',
						description: `Welcome back!`,
					});

					const userRole = data.session.user?.user_metadata?.role as AuthRole;
					const loginData = {
						uid: data.session.user.id,
						displayName:
							data.session.user.user_metadata?.full_name ||
							data.session.user.email,
						email: data.session.user.email || '',
						is_active: true,
						metadata: {
							role: userRole,
						},
					};

					await login(loginData);

					let target = getPostLoginRoute(userRole);
					if (
						userRole === AuthRole.GUARDIAN ||
						userRole === AuthRole.GUEST ||
						!userRole
					) {
						target = await resolveGuardianPostLoginRoute(data.session.user.id);
					}

					router.push(target);
				}
			} else {
				toast({
					title: 'Authentication Disabled',
					description: 'Password authentication is not enabled.',
					variant: 'destructive',
				});
			}
		} catch (error: any) {
			console.error('Login error:', error);

			const errorMessage =
				error?.message ||
				error?.error?.message ||
				'Unable to sign in. Please check your credentials.';

			toast({
				title: 'Login Failed',
				description: errorMessage,
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col min-h-screen bg-muted/50">
			<main id="main-content" className="flex-grow flex flex-col items-center justify-center p-4">
				<div className="mb-8">
					<Link
						href="/"
						className="flex items-center gap-2 font-headline text-3xl font-bold text-foreground">
						{settings.logo_url ? (
							<>
								{/* PERF-08: next/image for optimized logo loading */}
								<Image
									src={settings.logo_url}
									alt={`${settings.app_name || 'gatherKids'} Logo`}
									width={240}
									height={96}
									className={`h-24 w-auto ${
										settings.use_logo_only ? '' : 'max-w-[50%]'
									} object-contain`}
									priority
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
							Sign In
						</CardTitle>
						<CardDescription>
							{flags.loginPasswordEnabled ? (
								<>
									Don&apos;t have an account?{' '}
									<Link href="/create-account" className="underline">
										Create account
									</Link>
								</>
							) : (
								<>
									Don&apos;t have an account?{' '}
									<Link href="/register" className="underline">
										Register your family
									</Link>
								</>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!flags.loginPasswordEnabled && (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertTitle>Authentication Disabled</AlertTitle>
								<AlertDescription>
									Password authentication is currently disabled. Please contact
									an administrator.
								</AlertDescription>
							</Alert>
						)}

						{flags.loginPasswordEnabled && (
							<>
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
									<div className="relative">
										<Input
											id="password"
											type={showPassword ? 'text' : 'password'}
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="pr-10"
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
											onClick={() => setShowPassword(!showPassword)}
											aria-label={showPassword ? 'Hide password' : 'Show password'}
											disabled={loading}>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</Button>
									</div>
								</div>

								<Button
									type="submit"
									className="w-full"
									onClick={handleLogin}
									disabled={loading || !flags.loginPasswordEnabled}>
									{loading ? 'Signing In...' : 'Sign In'}
								</Button>

								<div className="flex justify-end">
									<ForgotPasswordDialog>
										<Button variant="link" className="px-0 text-sm">
											Forgot your password?
										</Button>
									</ForgotPasswordDialog>
								</div>
							</>
						)}

						{flags.loginMagicEnabled && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>Magic Link Available</AlertTitle>
								<AlertDescription>
									Magic link authentication would be available here when
									implemented.
								</AlertDescription>
							</Alert>
						)}

						{flags.loginGoogleEnabled && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>Google Sign-In Available</AlertTitle>
								<AlertDescription>
									Google authentication would be available here when
									implemented.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			</main>
			<footer className="py-6 border-t mt-auto">
				<div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()}{' '}
						{settings.app_name || 'gatherKids'}. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}

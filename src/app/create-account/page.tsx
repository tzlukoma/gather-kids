'use client';

import { useState } from 'react';
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
import { Info, Church, AlertTriangle } from 'lucide-react';
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

	// Redirect to login if in demo mode or password auth is disabled
	if (flags.isDemoMode || !flags.loginPasswordEnabled) {
		router.replace('/login');
		return null;
	}

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

			const baseUrl = window.location.origin;
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${baseUrl}/auth/callback`,
				},
			});

			if (error) {
				throw error;
			}

			// Check if email verification is required
			if (data?.user && !data.session) {
				// Email verification is ON - show verification message
				setNeedsVerification(true);
				toast({
					title: 'Check Your Email',
					description: 'Please check your inbox to verify your email address.',
				});
			} else if (data?.session) {
				// Email verification is OFF - user is automatically signed in
				toast({
					title: 'Account Created',
					description: 'Your account has been created successfully!',
				});
				router.push('/register');
			}
		} catch (error: any) {
			console.error('Signup error:', error);
			toast({
				title: 'Account Creation Failed',
				description: error.message || 'Unable to create account. Please try again.',
				variant: 'destructive',
			});
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
										className="h-24 w-auto max-w-[50%] object-contain"
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
								We've sent a verification link to your email address.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>Verification Required</AlertTitle>
								<AlertDescription>
									Please check your inbox and click the verification link to
									activate your account. Once verified, you'll be able to
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
									className="h-24 w-auto max-w-[50%] object-contain"
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
						{!flags.isDemoMode && (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertTitle>Live Authentication Mode</AlertTitle>
								<AlertDescription>
									You are creating a real account. Make sure you have access to
									the email address you provide.
								</AlertDescription>
							</Alert>
						)}
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
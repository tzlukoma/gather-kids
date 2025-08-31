'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Bell, Shield, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function OnboardingPage() {
	const router = useRouter();
	const { user } = useAuth();
	const { toast } = useToast();

	const [completedSteps, setCompletedSteps] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState(0);

	const steps = [
		{
			id: 'welcome',
			title: 'Welcome to gatherKids!',
			description: 'Your family registration has been successfully submitted.',
			icon: CheckCircle,
			action: 'Continue',
		},
		{
			id: 'profile',
			title: 'Set Up Your Profile',
			description: 'Complete your parent profile to access all features.',
			icon: User,
			action: 'Complete Profile',
			optional: true,
		},
		{
			id: 'notifications',
			title: 'Stay Connected',
			description:
				"Choose how you'd like to receive updates about your children's activities.",
			icon: Bell,
			action: 'Configure Notifications',
			optional: true,
		},
		{
			id: 'security',
			title: 'Secure Your Account',
			description: "Set up additional security options for your family's data.",
			icon: Shield,
			action: 'Review Security',
			optional: true,
		},
	];

	useEffect(() => {
		// Auto-complete the welcome step
		if (!completedSteps.includes('welcome')) {
			setTimeout(() => {
				setCompletedSteps(['welcome']);
				setCurrentStep(1);
			}, 1000);
		}
	}, [completedSteps]);

	const handleStepAction = (stepId: string) => {
		// Mark step as completed
		if (!completedSteps.includes(stepId)) {
			setCompletedSteps([...completedSteps, stepId]);
		}

		// Move to next step or finish
		const nextStepIndex = steps.findIndex((s) => s.id === stepId) + 1;

		if (nextStepIndex < steps.length) {
			setCurrentStep(nextStepIndex);
		} else {
			// All steps completed, proceed to household
			handleFinishOnboarding();
		}
	};

	const handleSkipStep = (stepId: string) => {
		// Mark as completed (even if skipped)
		if (!completedSteps.includes(stepId)) {
			setCompletedSteps([...completedSteps, stepId]);
		}

		const nextStepIndex = steps.findIndex((s) => s.id === stepId) + 1;

		if (nextStepIndex < steps.length) {
			setCurrentStep(nextStepIndex);
		} else {
			handleFinishOnboarding();
		}
	};

	const handleFinishOnboarding = () => {
		// Store onboarding completion
		if (user) {
			const updatedUser = {
				...user,
				metadata: {
					...user.metadata,
					onboarding_dismissed: true,
					onboarding_completed_at: new Date().toISOString(),
				},
			};

			localStorage.setItem('gatherkids-user', JSON.stringify(updatedUser));
		}

		toast({
			title: 'Welcome to gatherKids!',
			description:
				'Your account setup is complete. Redirecting to your household dashboard...',
		});

		// Redirect to household dashboard
		setTimeout(() => {
			router.push('/household');
		}, 2000);
	};

	const handleSkipOnboarding = () => {
		toast({
			title: 'Onboarding Skipped',
			description:
				'You can always complete your profile later from the household dashboard.',
		});

		// Still mark as dismissed
		if (user) {
			const updatedUser = {
				...user,
				metadata: {
					...user.metadata,
					onboarding_dismissed: true,
					onboarding_skipped_at: new Date().toISOString(),
				},
			};

			localStorage.setItem('gatherkids-user', JSON.stringify(updatedUser));
		}

		router.push('/household');
	};

	const currentStepData = steps[currentStep];
	const StepIcon = currentStepData?.icon || CheckCircle;

	return (
		<div className="flex flex-col min-h-screen bg-muted/50">
			<main className="flex-grow flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-2xl space-y-6">
					{/* Progress indicator */}
					<div className="flex items-center justify-center space-x-2">
						{steps.map((step, index) => (
							<div
								key={step.id}
								className={`w-3 h-3 rounded-full transition-colors ${
									completedSteps.includes(step.id)
										? 'bg-green-500'
										: index === currentStep
										? 'bg-primary'
										: 'bg-muted-foreground/30'
								}`}
							/>
						))}
					</div>

					{/* Current step */}
					{currentStepData && (
						<Card className="w-full">
							<CardHeader className="text-center">
								<StepIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
								<CardTitle className="text-2xl font-bold font-headline">
									{currentStepData.title}
								</CardTitle>
								<CardDescription className="text-base">
									{currentStepData.description}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Welcome step content */}
								{currentStepData.id === 'welcome' && (
									<Alert>
										<Info className="h-4 w-4" />
										<AlertTitle>Registration Complete!</AlertTitle>
										<AlertDescription>
											Your family registration has been received and processed.
											You can now access your household dashboard and manage
											your children's ministry enrollments.
										</AlertDescription>
									</Alert>
								)}

								{/* Profile step content */}
								{currentStepData.id === 'profile' && (
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">
											Complete your profile to help ministry leaders contact you
											and keep your information current.
										</p>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• Update emergency contact information</li>
											<li>• Set communication preferences</li>
											<li>• Add profile photo (optional)</li>
										</ul>
									</div>
								)}

								{/* Notifications step content */}
								{currentStepData.id === 'notifications' && (
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">
											Choose how you'd like to receive important updates about
											your children's activities.
										</p>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• Ministry announcements</li>
											<li>• Event reminders</li>
											<li>• Check-in/out notifications</li>
											<li>• Bible Bee progress updates</li>
										</ul>
									</div>
								)}

								{/* Security step content */}
								{currentStepData.id === 'security' && (
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">
											Review and configure security settings to protect your
											family's information.
										</p>
										<ul className="text-sm text-muted-foreground space-y-1">
											<li>• Set up two-factor authentication</li>
											<li>• Review privacy settings</li>
											<li>• Configure data sharing preferences</li>
										</ul>
									</div>
								)}

								{/* Action buttons */}
								<div className="flex flex-col sm:flex-row gap-3 pt-4">
									<Button
										onClick={() => handleStepAction(currentStepData.id)}
										className="flex-1 flex items-center gap-2">
										{currentStepData.action}
										<ArrowRight className="h-4 w-4" />
									</Button>

									{currentStepData.optional && (
										<Button
											variant="outline"
											onClick={() => handleSkipStep(currentStepData.id)}
											className="flex-1">
											Skip for Now
										</Button>
									)}
								</div>

								{/* Skip all onboarding option */}
								{currentStep > 0 && (
									<div className="pt-4 border-t">
										<Button
											variant="ghost"
											onClick={handleSkipOnboarding}
											className="w-full text-muted-foreground">
											Skip Onboarding - Go to Dashboard
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Completion state */}
					{currentStep >= steps.length && (
						<Card className="w-full">
							<CardHeader className="text-center">
								<CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
								<CardTitle className="text-3xl font-bold font-headline text-green-700">
									Setup Complete!
								</CardTitle>
								<CardDescription>
									Redirecting you to your household dashboard...
								</CardDescription>
							</CardHeader>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthDebug } from '@/components/auth/auth-debug';

export default function OnboardingPage() {
	const router = useRouter();
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<any>(null);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [settingPassword, setSettingPassword] = useState(false);
	const [showDebug, setShowDebug] = useState(false);

	useEffect(() => {
		// If we're in demo mode, redirect away from this page
		if (isDemo()) {
			router.replace('/login');
			return;
		}

		const checkAuthAndOnboarding = async () => {
			try {
				const { supabase } = await import('@/lib/supabaseClient');
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();

				if (error) {
					console.error('Session error:', error);

					// Check if we still have Supabase tokens despite the error
					const hasSupabaseTokens = Object.keys(localStorage).some(
						(key) => key && key.startsWith('sb-')
					);

					if (hasSupabaseTokens) {
						console.log(
							'Found Supabase tokens despite session error - attempting recovery'
						);
						// Try to refresh the session
						const refreshResult = await supabase.auth.refreshSession();
						if (refreshResult.data?.session) {
							console.log('Session recovery successful!');
							const recoveredSession = refreshResult.data.session;
							setUser(recoveredSession.user);

							// Check if user needs onboarding
							const hasPassword =
								recoveredSession.user.user_metadata?.has_password === true;
							const onboardingDismissed =
								recoveredSession.user.user_metadata?.onboarding_dismissed ===
								true;

							if (!hasPassword && !onboardingDismissed) {
								setShowOnboarding(true);
								setLoading(false);
								return;
							} else {
								// User doesn't need onboarding, redirect to dashboard
								router.replace('/dashboard');
								return;
							}
						}
					}

					router.replace('/login');
					return;
				}

				if (!session) {
					router.replace('/login');
					return;
				}

				setUser(session.user);

				// Check if user needs onboarding
				const hasPassword = session.user.user_metadata?.has_password === true;
				const onboardingDismissed =
					session.user.user_metadata?.onboarding_dismissed === true;

				if (!hasPassword && !onboardingDismissed) {
					setShowOnboarding(true);
				} else {
					// User doesn't need onboarding, redirect to dashboard
					router.replace('/dashboard');
				}
			} catch (err) {
				console.error('Unexpected error:', err);
				router.replace('/login');
			} finally {
				setLoading(false);
			}
		};

		checkAuthAndOnboarding();
	}, [router]);

	const handleSetPassword = async () => {
		if (password !== confirmPassword) {
			toast({
				title: 'Password Mismatch',
				description: 'Passwords do not match. Please try again.',
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

		setSettingPassword(true);
		try {
			const { supabase } = await import('@/lib/supabaseClient');

			// Update user password
			const { error: passwordError } = await supabase.auth.updateUser({
				password: password,
			});

			if (passwordError) throw passwordError;

			// Update user metadata to indicate they have a password
			const { error: metadataError } = await supabase.auth.updateUser({
				data: {
					has_password: true,
					onboarding_dismissed: true,
				},
			});

			if (metadataError) throw metadataError;

			toast({
				title: 'Password Set Successfully',
				description: 'You can now sign in with your email and password.',
			});

			setTimeout(() => router.push('/dashboard'), 1500);
		} catch (error: any) {
			console.error('Error setting password:', error);
			toast({
				title: 'Error Setting Password',
				description:
					error.message || 'Failed to set password. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setSettingPassword(false);
		}
	};

	const handleNotNow = async () => {
		try {
			const { supabase } = await import('@/lib/supabaseClient');

			// Mark onboarding as dismissed
			const { error } = await supabase.auth.updateUser({
				data: { onboarding_dismissed: true },
			});

			if (error) throw error;

			toast({
				title: 'Setup Skipped',
				description: 'You can set a password later in Settings.',
			});

			router.push('/dashboard');
		} catch (error: any) {
			console.error('Error dismissing onboarding:', error);
			toast({
				title: 'Error',
				description: error.message || 'Failed to skip setup. Please try again.',
				variant: 'destructive',
			});
		}
	};

	// Show demo mode notice
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

	// Add retry mechanism for session recovery
	const retrySession = async () => {
		setLoading(true);
		try {
			const { supabase } = await import('@/lib/supabaseClient');

			// Attempt to refresh the session
			const { data, error } = await supabase.auth.refreshSession();

			if (error) {
				console.error('Retry session error:', error);
				toast({
					title: 'Session Error',
					description: 'Unable to recover your session. Please sign in again.',
					variant: 'destructive',
				});
				router.replace('/login');
				return;
			}

			if (data?.session) {
				setUser(data.session.user);

				// Check if user needs onboarding
				const hasPassword =
					data.session.user.user_metadata?.has_password === true;
				const onboardingDismissed =
					data.session.user.user_metadata?.onboarding_dismissed === true;

				if (!hasPassword && !onboardingDismissed) {
					setShowOnboarding(true);
				} else {
					router.replace('/dashboard');
				}

				toast({
					title: 'Session Recovered',
					description: 'Your session has been restored successfully.',
				});
			} else {
				toast({
					title: 'Session Not Found',
					description: 'Please sign in again to continue.',
					variant: 'destructive',
				});
				router.replace('/login');
			}
		} catch (err) {
			console.error('Unexpected error in retry:', err);
			toast({
				title: 'Unexpected Error',
				description: 'An error occurred. Please try signing in again.',
				variant: 'destructive',
			});
			router.replace('/login');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
						<Loader2 className="h-6 w-6 animate-spin" />
						<p className="text-sm text-muted-foreground">
							Setting up your account...
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!showOnboarding) {
		// Show a helpful recovery UI instead of just returning null
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-xl font-headline">
							Session Issue
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							We're having trouble setting up your account. This sometimes
							happens when authentication was partially successful.
						</p>
						<div className="flex flex-col gap-2">
							<Button onClick={retrySession}>Retry Session</Button>
							<Button variant="outline" asChild>
								<Link href="/login">Back to Login</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-xl font-headline">
						Make future sign-ins faster
					</CardTitle>
					<p className="text-base text-muted-foreground">
						You're all set with magic link. Prefer a password next time? You can
						still use a magic link anytime.
					</p>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="password">New Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="pr-10"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
									onClick={() => setShowPassword(!showPassword)}>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="Confirm your password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Button
							onClick={handleSetPassword}
							disabled={settingPassword || !password || !confirmPassword}>
							{settingPassword ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Set Password
						</Button>
						<Button variant="outline" onClick={handleNotNow}>
							Not now
						</Button>
					</div>

					{user && (
						<div className="border-t pt-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowDebug(!showDebug)}
								className="text-xs">
								{showDebug ? 'Hide' : 'Show'} Debug Info
							</Button>
							{showDebug && <AuthDebug user={user} />}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

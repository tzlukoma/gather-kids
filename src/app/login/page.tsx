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
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Settings, Church, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';
import { AuthRole } from '@/lib/auth-types';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { getAuthRedirectTo } from '@/lib/authRedirect';
import { isDemo, isMagicLinkEnabled, isPasswordEnabled } from '@/lib/authGuards';

const DEMO_USERS = {
	admin: {
		email: 'admin@example.com',
		password: 'password',
		is_active: true,
		name: 'Admin User',
		uid: 'user_admin',
		role: AuthRole.ADMIN,
		metadata: {},
	},
	leader: {
		email: 'leader.sundayschool@example.com',
		password: 'password',
		is_active: true,
		name: 'Sarah Lee',
		uid: 'user_leader_1',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
	khalfaniLeader: {
		email: 'leader.khalfani@example.com',
		password: 'password',
		is_active: true,
		name: 'Chris Evans',
		uid: 'user_leader_11',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
	joybellsLeader: {
		email: 'leader.joybells@example.com',
		password: 'password',
		is_active: true,
		name: 'Megan Young',
		uid: 'user_leader_12',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
	// Bible Bee Primary Leader
	bibleBeeLeader: {
		email: 'leader.biblebee@example.com',
		password: 'password',
		is_active: true,
		name: 'Alex Pastor',
		uid: 'user_leader_14',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
	// Bible Bee Volunteer Leader
	bibleBeeVolunteer: {
		email: 'leader.biblebeevolunteer@example.com',
		password: 'password',
		is_active: true,
		name: 'Bible Bee Volunteer',
		uid: 'user_leader_15',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
	guardian: {
		email: 'guardian@example.com',
		password: 'password',
		is_active: true,
		name: 'Parent User',
		uid: 'user_guardian_1',
		role: AuthRole.GUARDIAN,
		metadata: {},
	},
	// Demo Parent with household access  
	parent: {
		email: 'parent-demo@example.com',
		password: 'password',
		is_active: true,
		name: 'Demo Parent',
		uid: 'user_parent_demo',
		role: AuthRole.GUARDIAN,
		metadata: {
			household_id: 'h_1' // Smith household from seed data
		}
	},
	inactiveLeader: {
		email: 'leader.inactive@example.com',
		password: 'password',
		is_active: false,
		name: 'Tom Allen',
		uid: 'user_leader_13',
		role: AuthRole.MINISTRY_LEADER,
		metadata: {},
	},
};

export default function LoginPage() {
	const router = useRouter();
	const { login } = useAuth();
	const { settings } = useBranding();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
	const [magicLinkLoading, setMagicLinkLoading] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	// Demo mode login handler (unchanged)
	const handleDemoLogin = async () => {
		const userToLogin = Object.values(DEMO_USERS).find(
			(u) => u.email === email && u.password === password
		);

		if (userToLogin) {
			console.log('Login - User found:', userToLogin);
			const loginData = {
				uid: userToLogin.uid,
				displayName: userToLogin.name,
				email: userToLogin.email,
				is_active: userToLogin.is_active,
				metadata: {
					role: userToLogin.role as AuthRole,
					...(userToLogin.metadata || {}),
				},
			};
			console.log('Login - Calling login with data:', loginData);
			await login(loginData);
			toast({
				title: 'Login Successful',
				description: `Welcome, ${userToLogin.name}!`,
			});

			// Redirect based on role: admin -> dashboard, leader -> rosters, guardian -> household
			const role = userToLogin.role as AuthRole;
			let target = '/';
			if (role === AuthRole.ADMIN) target = '/dashboard';
			else if (role === AuthRole.MINISTRY_LEADER) target = '/dashboard/rosters';
			else if (role === AuthRole.GUARDIAN) target = '/household';
			router.push(target);
		} else {
			toast({
				title: 'Invalid Credentials',
				description: 'Please use one of the demo accounts.',
				variant: 'destructive',
			});
		}
	};

	// Supabase Magic Link handler
	const handleMagicLink = async () => {
		if (!email) {
			toast({
				title: 'Email Required',
				description: 'Please enter your email address.',
				variant: 'destructive',
			});
			return;
		}

		setMagicLinkLoading(true);
		try {
			const supabase = supabaseBrowser();
			const redirectTo = getAuthRedirectTo();
			
			console.log('Requesting magic link:', {
				email,
				redirectTo,
				currentUrl: window.location.href
			});
			
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: { 
					emailRedirectTo: redirectTo,
					// Set explicit data for better error handling
					data: {
						requested_at: new Date().toISOString(),
						requested_from: window.location.origin,
						user_agent: navigator.userAgent,
						browser_context: 'current_tab'
					}
				},
			});

			if (error) {
				console.error('Magic link request error:', error);
				
				if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
					toast({
						title: 'Too Many Requests',
						description: 'Please wait 60 seconds before requesting another magic link.',
						variant: 'destructive',
					});
					setResendCooldown(60);
					const timer = setInterval(() => {
						setResendCooldown((prev) => {
							if (prev <= 1) {
								clearInterval(timer);
								return 0;
							}
							return prev - 1;
						});
					}, 1000);
				} else if (error.message.includes('signup') || error.message.includes('not allowed')) {
					toast({
						title: 'Account Not Found',
						description: 'No account found with this email. Please register first or contact support.',
						variant: 'destructive',
					});
				} else {
					throw error;
				}
			} else {
				console.log('Magic link sent successfully to:', email);
				setMagicLinkSent(true);
				toast({
					title: 'Magic Link Sent!',
					description: 'Check your email and click the link. Magic links now work across browser tabs! Links expire after 1 hour.',
				});
				setResendCooldown(60);
				const timer = setInterval(() => {
					setResendCooldown((prev) => {
						if (prev <= 1) {
							clearInterval(timer);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			}
		} catch (error: any) {
			console.error('Unexpected magic link error:', error);
			toast({
				title: 'Error',
				description: error.message || 'Failed to send magic link. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setMagicLinkLoading(false);
		}
	};

	// Supabase Password login handler
	const handlePasswordLogin = async () => {
		if (!email || !password) {
			toast({
				title: 'Missing Information',
				description: 'Please enter both email and password.',
				variant: 'destructive',
			});
			return;
		}

		setPasswordLoading(true);
		try {
			const supabase = supabaseBrowser();
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				if (error.message.includes('Invalid login credentials')) {
					toast({
						title: 'Invalid Credentials',
						description: 'The email or password you entered is incorrect.',
						variant: 'destructive',
					});
				} else {
					throw error;
				}
			} else {
				toast({
					title: 'Login Successful',
					description: 'Welcome back!',
				});
				// Redirect to onboarding to handle any setup needed
				router.push('/onboarding');
			}
		} catch (error: any) {
			console.error('Password login error:', error);
			toast({
				title: 'Error',
				description: error.message || 'Failed to sign in. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setPasswordLoading(false);
		}
	};

	const prefillDemoCredentials = (role: keyof typeof DEMO_USERS) => {
		setEmail(DEMO_USERS[role].email);
		setPassword(DEMO_USERS[role].password);
	};

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
							Sign In
						</CardTitle>
						<CardDescription>
							Don't have an account?{' '}
							<Link href="/register" className="underline">
								Register your family
							</Link>
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Demo Mode Notice or Supabase Auth UI */}
						{isDemo() ? (
							// Demo Mode: Show existing demo UI
							<>
								{flags.showDemoFeatures && (
									<Alert>
										<Info className="h-4 w-4" />
										<AlertTitle>For Prototype Demo</AlertTitle>
										<AlertDescription>
											<p>Click one of the following accounts to sign in:</p>
											<ul className="list-disc pl-5 text-sm mt-2">
												<li>
													Admin:{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() => prefillDemoCredentials('admin')}>
														{DEMO_USERS.admin.email}
													</button>
												</li>
												<li>
													Leader (Sunday School):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() => prefillDemoCredentials('leader')}>
														{DEMO_USERS.leader.email}
													</button>
												</li>
												<li>
													Leader (Khalfani):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() =>
															prefillDemoCredentials('khalfaniLeader')
														}>
														{DEMO_USERS.khalfaniLeader.email}
													</button>
												</li>
												<li>
													Leader (Joy Bells):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() =>
															prefillDemoCredentials('joybellsLeader')
														}>
														{DEMO_USERS.joybellsLeader.email}
													</button>
												</li>
												<li>
													Leader (Bible Bee Primary):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() =>
															prefillDemoCredentials('bibleBeeLeader')
														}>
														{DEMO_USERS.bibleBeeLeader.email}
													</button>
												</li>
												<li>
													Leader (Bible Bee Volunteer):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() =>
															prefillDemoCredentials('bibleBeeVolunteer')
														}>
														{DEMO_USERS.bibleBeeVolunteer.email}
													</button>
												</li>
												<li>
													Leader (Inactive):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() =>
															prefillDemoCredentials('inactiveLeader')
														}>
														{DEMO_USERS.inactiveLeader.email}
													</button>
												</li>
												<li>
													Parent (Demo):{' '}
													<button
														className="text-left font-semibold underline"
														onClick={() => prefillDemoCredentials('parent')}>
														{DEMO_USERS.parent.email}
													</button>
												</li>
												<li>
													Password: <code className="font-semibold">password</code>
												</li>
											</ul>
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
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</div>
								<Button type="submit" className="w-full" onClick={handleDemoLogin}>
									Sign In
								</Button>
							</>
						) : (
							// Supabase Mode: Show live auth UI
							<>
								{/* Live auth disabled notice for demo mode */}
								<div className="space-y-4">
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

									{/* Magic Link Section */}
									{isMagicLinkEnabled() && (
										<div className="space-y-4">
											{magicLinkSent ? (
												<Alert>
													<Mail className="h-4 w-4" />
													<AlertTitle>Magic Link Sent!</AlertTitle>
													<AlertDescription>
														<div className="space-y-2">
															<p>Check your email and click the link to sign in.</p>
															<div className="bg-green-50 p-2 rounded text-sm">
																<p className="font-semibold text-green-800">✓ Cross-Tab Support:</p>
																<p className="text-green-700">Magic links now work reliably when opened in different browser tabs or windows!</p>
															</div>
															{resendCooldown > 0 && (
																<p className="text-sm mt-2">
																	You can request another link in {resendCooldown} seconds.
																</p>
															)}
														</div>
													</AlertDescription>
												</Alert>
											) : null}
											
											<Button 
												type="button" 
												className="w-full" 
												variant="outline"
												onClick={handleMagicLink}
												disabled={magicLinkLoading || resendCooldown > 0}
											>
												{magicLinkLoading ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Sending Magic Link...
													</>
												) : resendCooldown > 0 ? (
													`Get Magic Link (${resendCooldown}s)`
												) : (
													<>
														<Mail className="mr-2 h-4 w-4" />
														Get a Magic Link
													</>
												)}
											</Button>
										</div>
									)}

									{/* Password Section */}
									{isPasswordEnabled() && (
										<>
											{isMagicLinkEnabled() && (
												<div className="relative">
													<div className="absolute inset-0 flex items-center">
														<span className="w-full border-t" />
													</div>
													<div className="relative flex justify-center text-xs uppercase">
														<span className="bg-background px-2 text-muted-foreground">
															Or continue with password
														</span>
													</div>
												</div>
											)}
											
											<div className="space-y-2">
												<Label htmlFor="password">Password</Label>
												<Input
													id="password"
													type="password"
													required
													value={password}
													onChange={(e) => setPassword(e.target.value)}
												/>
											</div>
											
											<Button 
												type="submit" 
												className="w-full" 
												onClick={handlePasswordLogin}
												disabled={passwordLoading}
											>
												{passwordLoading ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Signing In...
													</>
												) : (
													'Sign In with Password'
												)}
											</Button>
										</>
									)}
								</div>
							</>
						)}

						{/* Demo Mode Disabled Notice for Supabase Mode */}
						{isDemo() && (
							<Alert className="mt-4">
								<Info className="h-4 w-4" />
								<AlertTitle>Demo Mode Active</AlertTitle>
								<AlertDescription>
									Live Auth is disabled in Demo Mode. Switch to "supabase" mode to use live authentication.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			</main>
			<footer className="py-6 border-t mt-auto">
				<div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} {settings.app_name || 'gatherKids'}. All rights reserved.
					</p>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsFlagDialogOpen(true)}>
						<Settings className="h-4 w-4" />
						<span className="sr-only">Open Feature Flags</span>
					</Button>
				</div>
			</footer>
			<FeatureFlagDialog
				isOpen={isFlagDialogOpen}
				onClose={() => setIsFlagDialogOpen(false)}
			/>
		</div>
	);
}

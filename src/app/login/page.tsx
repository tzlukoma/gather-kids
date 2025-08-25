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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Settings } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';
import { AuthRole } from '@/lib/auth-types';

const DEMO_USERS = {
	admin: {
		email: 'admin@example.com',
		password: 'password',
		is_active: true,
		name: 'Admin User',
		uid: 'user_admin',
		role: AuthRole.ADMIN,
	},
	leader: {
		email: 'leader.sundayschool@example.com',
		password: 'password',
		is_active: true,
		name: 'Sarah Lee',
		uid: 'user_leader_1',
		role: AuthRole.MINISTRY_LEADER,
	},
	khalfaniLeader: {
		email: 'leader.khalfani@example.com',
		password: 'password',
		is_active: true,
		name: 'Chris Evans',
		uid: 'user_leader_11',
		role: AuthRole.MINISTRY_LEADER,
	},
	joybellsLeader: {
		email: 'leader.joybells@example.com',
		password: 'password',
		is_active: true,
		name: 'Megan Young',
		uid: 'user_leader_12',
		role: AuthRole.MINISTRY_LEADER,
	},
	guardian: {
		email: 'guardian@example.com',
		password: 'password',
		is_active: true,
		name: 'Parent User',
		uid: 'user_guardian_1',
		role: AuthRole.GUARDIAN,
	},
	inactiveLeader: {
		email: 'leader.inactive@example.com',
		password: 'password',
		is_active: false,
		name: 'Tom Allen',
		uid: 'user_leader_13',
		role: AuthRole.MINISTRY_LEADER,
	},
};

export default function LoginPage() {
	const router = useRouter();
	const { login } = useAuth();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

	const handleLogin = async () => {
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
						className="font-headline text-3xl font-bold text-foreground">
						gatherKids
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
						<Button type="submit" className="w-full" onClick={handleLogin}>
							Sign In
						</Button>
					</CardContent>
				</Card>
			</main>
			<footer className="py-6 border-t mt-auto">
				<div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} gatherKids. All rights reserved.
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

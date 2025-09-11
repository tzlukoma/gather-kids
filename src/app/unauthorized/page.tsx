'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, Home, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UnauthorizedPage() {
	const { user, logout } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// If no user, redirect to login
		if (!user) {
			router.push('/login');
		}
	}, [user, router]);

	const handleLogout = async () => {
		await logout();
		router.push('/login');
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-6 w-6 text-destructive" />
					</div>
					<CardTitle className="text-2xl">Access Denied</CardTitle>
					<CardDescription>
						You don't have permission to access this page.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="text-center text-sm text-muted-foreground">
						{user ? (
							<p>
								You are logged in as <strong>{user.email}</strong>, but your
								account doesn't have the required permissions.
							</p>
						) : (
							<p>Please log in to access this page.</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						{user ? (
							<>
								<Button
									onClick={handleLogout}
									variant="outline"
									className="w-full">
									<LogIn className="mr-2 h-4 w-4" />
									Sign Out & Sign In Again
								</Button>
								<Link href="/dashboard">
									<Button variant="outline" className="w-full">
										<Home className="mr-2 h-4 w-4" />
										Go to Dashboard
									</Button>
								</Link>
							</>
						) : (
							<Link href="/login">
								<Button className="w-full">
									<LogIn className="mr-2 h-4 w-4" />
									Sign In
								</Button>
							</Link>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

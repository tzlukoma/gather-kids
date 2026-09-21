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
import { cn } from '@/lib/utils';
import { useGatherSystemAuth } from '@/components/auth/gathersystem-auth-context';
import {
	AUTH_BODY_TEXT,
	AUTH_CARD,
	AUTH_CARD_DESCRIPTION,
	AUTH_CARD_TITLE,
} from '@/components/auth/auth-page-styles';

export default function UnauthorizedPage() {
	const gatherSystem = useGatherSystemAuth();
	const { user, loading, logout } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// Wait for the session to resolve first. `user` is null while
		// `AuthProvider` is still restoring it, so redirecting on `!user` alone
		// bounced every visitor to /login before this page could render — which
		// made the screen unreachable rather than merely unstyled.
		if (!loading && !user) {
			router.push('/login');
		}
	}, [loading, user, router]);

	const handleLogout = async () => {
		await logout();
		router.push('/login');
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<Card className={cn('w-full max-w-md', gatherSystem && AUTH_CARD)}>
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-6 w-6 text-destructive" />
					</div>
					<CardTitle
						className={cn(gatherSystem ? AUTH_CARD_TITLE : 'text-2xl')}>
						Access Denied
					</CardTitle>
					<CardDescription
						className={cn(gatherSystem && AUTH_CARD_DESCRIPTION)}>
						You don&apos;t have permission to access this page.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div
						className={cn(
							'text-center',
							gatherSystem ? AUTH_BODY_TEXT : 'text-sm text-muted-foreground'
						)}>
						{user ? (
							<p>
								You are logged in as <strong>{user.email}</strong>, but your
								account doesn&apos;t have the required permissions.
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
								<Link href="/">
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

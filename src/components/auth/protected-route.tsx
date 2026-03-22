'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { DefaultLoadingSpinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
	children: ReactNode;
	allowedRoles: AuthRole[];
	loadingComponent?: ReactNode;
}

export const ProtectedRoute = ({
	children,
	allowedRoles,
	loadingComponent = <DefaultLoadingSpinner />,
}: ProtectedRouteProps) => {
	const { user, loading, userRole } = useAuth();
	const router = useRouter();
	const [isNavigating, setIsNavigating] = useState(false);

	useEffect(() => {
		const handleNavigation = async () => {
			// Always wait for the auth context to finish loading before making navigation decisions
			if (loading) {
				return;
			}

			if (!user) {
				// Check for Supabase auth tokens that would indicate a previous successful auth
				const hasSupabaseTokens =
					typeof window !== 'undefined' &&
					Object.keys(localStorage).some((key) => key && key.startsWith('sb-'));

				if (hasSupabaseTokens) {
					console.log(
						'Protected route: Found auth tokens but no user. Attempting session recovery...'
					);

					try {
						const { supabase } = await import('@/lib/supabaseClient');
						const { data, error } = await supabase.auth.refreshSession();

						if (data?.session) {
							console.log(
								'Protected route: Session recovered! Reloading page...'
							);
							window.location.reload();
							return;
						} else {
							console.log('Protected route: Session recovery failed:', error);
							setIsNavigating(true);
							await router.replace('/login');
							setIsNavigating(false);
							return;
						}
					} catch (err) {
						console.error(
							'Protected route: Error during session recovery:',
							err
						);
						setIsNavigating(true);
						await router.replace('/login');
						setIsNavigating(false);
						return;
					}
				} else {
					console.log(
						'Protected route: No user and no tokens found. Redirecting to login...'
					);
					setIsNavigating(true);
					await router.replace('/login');
					setIsNavigating(false);
					return;
				}
			}

			if (!userRole || !allowedRoles.includes(userRole)) {
				console.log('Role check failed - redirecting to unauthorized');
				setIsNavigating(true);
				await router.replace('/unauthorized');
				setIsNavigating(false);
				return;
			}
		};

		handleNavigation();
	}, [loading, user, userRole, allowedRoles, router]);

	// If we're still loading or navigating, show loading state
	if (loading || isNavigating) {
		return loadingComponent;
	}

	// If we have a user and they have the correct role, show the protected content
	if (user && userRole && allowedRoles.includes(userRole)) {
		return <>{children}</>;
	}

	// If we get here, we're either loading or about to redirect
	return loadingComponent;
};

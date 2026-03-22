'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { getLeaderAssignmentsForCycle, getRegistrationCycles } from '@/lib/dal';
import { db as dbAdapter } from '@/lib/database/factory';
import { AuthRole, BaseUser } from '@/lib/auth-types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
	user: BaseUser | null;
	loading: boolean;
	userRole: AuthRole | null;
	login: (user: Omit<BaseUser, 'assignedMinistryIds'>) => void;
	logout: () => void;
	setUserRole: (role: AuthRole) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<BaseUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [userRole, setUserRole] = useState<AuthRole | null>(null);

	// Helper to extract a user id from various shapes
	function getUserId(u: any): string | undefined {
		return u?.uid || u?.id || u?.user_id;
	}

	// Helper function to check and update ministry access for a user
	async function checkAndUpdateMinistryAccess(
		user: BaseUser,
		updateUserCallback: (updatedUser: BaseUser) => void,
		updateRoleCallback: (role: AuthRole) => void
	): Promise<void> {
		// Skip if no email or user is already ADMIN
		if (!user.email || user.metadata?.role === AuthRole.ADMIN) {
			return;
		}

		try {
			const accessibleMinistries =
				await dbAdapter.listAccessibleMinistriesForEmail(user.email);

			if (accessibleMinistries.length > 0) {
				const ministryIds = accessibleMinistries.map((m) => m.ministry_id);
				const updatedUser: BaseUser = {
					...user,
					assignedMinistryIds: ministryIds,
				};

				// Upgrade to MINISTRY_LEADER if user has no role or is GUEST
				if (
					!user.metadata?.role ||
					user.metadata.role === AuthRole.GUEST
				) {
					updatedUser.metadata = {
						...user.metadata,
						role: AuthRole.MINISTRY_LEADER,
					};
					updateUserCallback(updatedUser);
					updateRoleCallback(AuthRole.MINISTRY_LEADER);
				} else {
					// User already has a role, but update assignedMinistryIds
					updateUserCallback(updatedUser);
				}
			} else {
				// No ministry access found - clear assignedMinistryIds if it was set
				if (user.assignedMinistryIds && user.assignedMinistryIds.length > 0) {
					const updatedUser: BaseUser = {
						...user,
						assignedMinistryIds: [],
					};
					updateUserCallback(updatedUser);
				}
			}
		} catch (error) {
			console.error(
				'AuthProvider - Error checking ministry access:',
				error
			);
		}
	}

	useEffect(() => {
		const initializeAuth = async () => {
			console.log('AuthProvider: Starting initialization (Supabase mode)');
			setLoading(true);

			try {
				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (session?.user) {
					console.log('AuthProvider: Found active Supabase session');
					const supabaseUser = session.user;
					const userRole = supabaseUser.user_metadata?.role || AuthRole.GUEST;

					const finalUser: BaseUser = {
						uid: supabaseUser.id,
						displayName:
							supabaseUser.user_metadata?.full_name ||
							supabaseUser.email?.split('@')[0] ||
							'User',
						email: supabaseUser.email || '',
						is_active: true,
						metadata: {
							role: userRole,
							...supabaseUser.user_metadata,
						},
						assignedMinistryIds: [],
					};

					// For users without a role or with GUEST role, check ministry access
					// synchronously to prevent ProtectedRoute from checking before role is determined
					if (
						finalUser.email &&
						(!finalUser.metadata?.role || finalUser.metadata.role === AuthRole.GUEST)
					) {
						const accessibleMinistries =
							await dbAdapter.listAccessibleMinistriesForEmail(finalUser.email);

						if (accessibleMinistries.length > 0) {
							const ministryIds = accessibleMinistries.map((m) => m.ministry_id);
							finalUser.assignedMinistryIds = ministryIds;
							if (
								!finalUser.metadata?.role ||
								finalUser.metadata.role === AuthRole.GUEST
							) {
								finalUser.metadata = {
									...finalUser.metadata,
									role: AuthRole.MINISTRY_LEADER,
								};
							}
						}
					}

					setUser(finalUser);
					setUserRole(finalUser.metadata.role);

					// For users who already have a role, check ministry access asynchronously
					if (
						finalUser.email &&
						finalUser.metadata?.role &&
						finalUser.metadata.role !== AuthRole.GUEST &&
						finalUser.metadata.role !== AuthRole.ADMIN &&
						(!finalUser.assignedMinistryIds || finalUser.assignedMinistryIds.length === 0)
					) {
						setTimeout(async () => {
							await checkAndUpdateMinistryAccess(
								finalUser,
								setUser,
								setUserRole
							);
						}, 0);
					}
				} else if (typeof window !== 'undefined') {
					// Check for Supabase auth tokens that would indicate a previous successful auth
					const hasSupabaseTokens = Object.keys(localStorage).some(
						(key) => key && key.startsWith('sb-')
					);

					if (hasSupabaseTokens) {
						const refreshResult = await supabase.auth.refreshSession();

						if (refreshResult.data?.session?.user) {
							const recoveredUser = refreshResult.data.session.user;
							const userRole =
								recoveredUser.user_metadata?.role || AuthRole.GUEST;

							const finalUser: BaseUser = {
								uid: recoveredUser.id,
								displayName:
									recoveredUser.user_metadata?.full_name ||
									recoveredUser.email?.split('@')[0] ||
									'User',
								email: recoveredUser.email || '',
								is_active: true,
								metadata: {
									role: userRole,
									...recoveredUser.user_metadata,
								},
								assignedMinistryIds: [],
							};

							if (
								finalUser.email &&
								(!finalUser.metadata?.role || finalUser.metadata.role === AuthRole.GUEST)
							) {
								const accessibleMinistries =
									await dbAdapter.listAccessibleMinistriesForEmail(finalUser.email);

								if (accessibleMinistries.length > 0) {
									const ministryIds = accessibleMinistries.map((m) => m.ministry_id);
									finalUser.assignedMinistryIds = ministryIds;
									if (
										!finalUser.metadata?.role ||
										finalUser.metadata.role === AuthRole.GUEST
									) {
										finalUser.metadata = {
											...finalUser.metadata,
											role: AuthRole.MINISTRY_LEADER,
										};
									}
								}
							}

							setUser(finalUser);
							setUserRole(finalUser.metadata.role);

							if (
								finalUser.email &&
								finalUser.metadata?.role &&
								finalUser.metadata.role !== AuthRole.GUEST &&
								finalUser.metadata.role !== AuthRole.ADMIN &&
								(!finalUser.assignedMinistryIds || finalUser.assignedMinistryIds.length === 0)
							) {
								setTimeout(async () => {
									await checkAndUpdateMinistryAccess(
										finalUser,
										setUser,
										setUserRole
									);
								}, 0);
							}
						}
					}
				}
			} catch (error) {
				console.error('AuthProvider: Failed to initialize auth state', error);
			} finally {
				console.log('AuthProvider: Initialization complete');
				setLoading(false);
			}
		};

		initializeAuth();

		// Subscribe to Supabase auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
			console.log('Supabase auth state change:', event, session?.user?.id);

			if (
				(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
				session?.user
			) {
				const supabaseUser = session.user;
				let userRole = supabaseUser.user_metadata?.role || AuthRole.GUEST;
				let assignedMinistryIds: string[] = [];

				const finalUser: BaseUser = {
					uid: supabaseUser.id,
					displayName:
						supabaseUser.user_metadata?.full_name ||
						supabaseUser.email?.split('@')[0] ||
						'User',
					email: supabaseUser.email || '',
					is_active: true,
					metadata: {
						role: userRole,
						...supabaseUser.user_metadata,
					},
					assignedMinistryIds,
				};

				setUser(finalUser);
				setUserRole(finalUser.metadata.role);

				// Check ministry access asynchronously after setting user
				setTimeout(async () => {
					await checkAndUpdateMinistryAccess(
						finalUser,
						setUser,
						setUserRole
					);
				}, 0);
			} else if (event === 'SIGNED_OUT') {
				setUser(null);
				setUserRole(null);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const login = async (userData: Omit<BaseUser, 'assignedMinistryIds'>) => {
		console.log('AuthProvider: Login called with userData:', userData);
		setLoading(true);
		try {
			let userRole = userData.metadata?.role || null;
			let assignedMinistryIds: string[] = [];

			const finalUser: BaseUser = {
				...userData,
				uid: getUserId(userData) || userData.uid || userData.id,
				id: getUserId(userData) || userData.id || userData.uid,
				is_active:
					typeof userData.is_active === 'boolean' ? userData.is_active : true,
				metadata: {
					...userData.metadata,
					role: userRole,
				},
				assignedMinistryIds,
			};

			// For users without a role or with GUEST role, check ministry access
			// synchronously to prevent race condition
			if (
				finalUser.email &&
				(!finalUser.metadata?.role || finalUser.metadata.role === AuthRole.GUEST)
			) {
				const accessibleMinistries =
					await dbAdapter.listAccessibleMinistriesForEmail(finalUser.email);

				if (accessibleMinistries.length > 0) {
					const ministryIds = accessibleMinistries.map((m) => m.ministry_id);
					finalUser.assignedMinistryIds = ministryIds;
					if (
						!finalUser.metadata?.role ||
						finalUser.metadata.role === AuthRole.GUEST
					) {
						finalUser.metadata = {
							...finalUser.metadata,
							role: AuthRole.MINISTRY_LEADER,
						};
						userRole = AuthRole.MINISTRY_LEADER;
					}
				}
			}

			setUser(finalUser);
			setUserRole(userRole);

			// For users who already have a role, check ministry access asynchronously
			if (
				finalUser.email &&
				finalUser.metadata?.role &&
				finalUser.metadata.role !== AuthRole.GUEST &&
				finalUser.metadata.role !== AuthRole.ADMIN &&
				(!finalUser.assignedMinistryIds || finalUser.assignedMinistryIds.length === 0)
			) {
				setTimeout(async () => {
					await checkAndUpdateMinistryAccess(
						finalUser,
						setUser,
						setUserRole
					);
				}, 0);
			}

			console.log('AuthProvider: Login completed successfully');
		} finally {
			setLoading(false);
		}
	};

	const logout = () => {
		setLoading(true);
		try {
			setUser(null);
			setUserRole(null);
			// Sign out from Supabase
			supabase.auth.signOut();
		} finally {
			setLoading(false);
		}
	};

	const value = { user, loading, userRole, login, logout, setUserRole };

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function withRole(allowedRoles: AuthRole[]) {
	return function <P extends object>(WrappedComponent: React.ComponentType<P>) {
		return function WithRoleComponent(props: P) {
			return (
				<ProtectedRoute allowedRoles={allowedRoles}>
					<WrappedComponent {...props} />
				</ProtectedRoute>
			);
		};
	};
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}

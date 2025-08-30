'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { getLeaderAssignmentsForCycle } from '@/lib/dal';
import { AuthRole, BaseUser } from '@/lib/auth-types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { supabase } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';

interface AuthContextType {
	user: BaseUser | null;
	loading: boolean;
	userRole: AuthRole | null;
	login: (user: Omit<BaseUser, 'assignedMinistryIds'>) => void;
	logout: () => void;
	setUserRole: (role: AuthRole) => void; // For demo mode role switching
}

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<BaseUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [userRole, setUserRole] = useState<AuthRole | null>(null);

	useEffect(() => {
		const initializeAuth = async () => {
			setLoading(true);

			try {
				// In demo mode, use localStorage as before
				if (isDemo()) {
					const storedUserString = localStorage.getItem('gatherkids-user');
					if (storedUserString) {
						const storedUser = JSON.parse(storedUserString);
						let finalUser: BaseUser = {
							...storedUser,
							metadata: {
								...storedUser.metadata,
								role: storedUser.metadata?.role || AuthRole.ADMIN,
							},
							is_active:
								typeof storedUser.is_active === 'boolean'
									? storedUser.is_active
									: true,
							assignedMinistryIds: [],
						};

						if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
							const leaderId = (storedUser.uid ||
								storedUser.id ||
								(storedUser as any).user_id) as string | undefined;
							if (leaderId) {
								const assignments = await getLeaderAssignmentsForCycle(
									leaderId,
									'2025'
								);
								finalUser.assignedMinistryIds = assignments.map(
									(a) => a.ministry_id
								);
							}
						}
						setUser(finalUser);
						setUserRole(finalUser.metadata.role);
					}
				} else {
					// Production mode: use Supabase session as primary source
					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (session?.user) {
						// Convert Supabase user to BaseUser format
						const supabaseUser = session.user;
						const userRole = supabaseUser.user_metadata?.role || AuthRole.ADMIN;

						let finalUser: BaseUser = {
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

						if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
							const leaderId =
								finalUser.uid || finalUser.id || (finalUser as any).user_id;
							if (typeof leaderId === 'string' && leaderId.length > 0) {
								const assignments = await getLeaderAssignmentsForCycle(
									leaderId,
									'2025'
								);
								finalUser.assignedMinistryIds = assignments.map(
									(a) => a.ministry_id
								);
							}
						}

						setUser(finalUser);
						setUserRole(finalUser.metadata.role);
					}
				}
			} catch (error) {
				console.error('Failed to initialize auth state', error);
				// In demo mode, clear localStorage on error
				if (isDemo()) {
					localStorage.removeItem('gatherkids-user');
				}
			} finally {
				setLoading(false);
			}
		};

		initializeAuth();

		// Subscribe to Supabase auth changes (only in production mode)
		if (!isDemo()) {
			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
				console.log('Supabase auth state change:', event, session?.user?.id);

				if (event === 'SIGNED_IN' && session?.user) {
					const supabaseUser = session.user;
					const userRole = supabaseUser.user_metadata?.role || AuthRole.ADMIN;

					let finalUser: BaseUser = {
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

					if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
						const leaderId =
							finalUser.uid || finalUser.id || (finalUser as any).user_id;
						if (typeof leaderId === 'string' && leaderId.length > 0) {
							const assignments = await getLeaderAssignmentsForCycle(
								leaderId,
								'2025'
							);
							finalUser.assignedMinistryIds = assignments.map(
								(a) => a.ministry_id
							);
						}
					}

					setUser(finalUser);
					setUserRole(finalUser.metadata.role);
				} else if (event === 'SIGNED_OUT') {
					setUser(null);
					setUserRole(null);
				}
			});

			return () => {
				subscription.unsubscribe();
			};
		}
	}, []);

	const login = async (userData: Omit<BaseUser, 'assignedMinistryIds'>) => {
		setLoading(true);
		try {
			console.log('Auth Context - Login - Input userData:', userData);
			const finalUser: BaseUser = {
				...userData,
				// Ensure we have both uid and id properties for compatibility
				uid: userData.uid || userData.id || (userData as any).user_id,
				id: userData.id || userData.uid || (userData as any).user_id,
				// preserve is_active if provided by userData (seed/login), default to true
				is_active:
					typeof userData.is_active === 'boolean' ? userData.is_active : true,
				metadata: {
					...userData.metadata,
					role: userData.metadata?.role || AuthRole.ADMIN,
				},
				assignedMinistryIds: [],
			};
			console.log(
				'Auth Context - Login - Final user with role:',
				finalUser.metadata.role
			);

			if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
				const leaderId = (userData.uid ||
					userData.id ||
					(userData as any).user_id) as string | undefined;
				if (leaderId) {
					const assignments = await getLeaderAssignmentsForCycle(
						leaderId,
						'2025'
					);
					finalUser.assignedMinistryIds = assignments.map((a) => a.ministry_id);
				}
			}

			// In demo mode, use localStorage as before
			if (isDemo()) {
				console.log('Storing user with role:', finalUser.metadata.role);
				localStorage.setItem('gatherkids-user', JSON.stringify(finalUser));
			}

			setUser(finalUser);
			console.log('Setting userRole to:', finalUser.metadata.role);
			setUserRole(finalUser.metadata.role);
		} finally {
			setLoading(false);
		}
	};

	const logout = () => {
		setLoading(true);
		try {
			setUser(null);
			setUserRole(null);

			// In demo mode, clear localStorage
			if (isDemo()) {
				localStorage.removeItem('gatherkids-user');
				// Clear all session storage to reset onboarding state
				sessionStorage.clear();
			} else {
				// In production mode, sign out from Supabase
				supabase.auth.signOut();
			}
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

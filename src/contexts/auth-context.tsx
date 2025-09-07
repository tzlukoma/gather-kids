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
	const [isVercelPreview, setIsVercelPreview] = useState<boolean>(false);

	// Helper to extract a user id from various shapes that may appear in demo/legacy data
	function getUserId(u: any): string | undefined {
		return u?.uid || u?.id || u?.user_id;
	}

	useEffect(() => {
		// Check if we're in a Vercel preview environment
		if (typeof window !== 'undefined') {
			setIsVercelPreview(window.location.hostname.includes('vercel.app'));
		}
	}, []);

	useEffect(() => {
		const initializeAuth = async () => {
			console.log('AuthProvider: Starting initialization...', {
				isDemo: isDemo(),
				isVercelPreview,
			});
			setLoading(true);

			try {
				// Check if we should use localStorage (demo mode or Vercel preview)
				// This will help with preview environments where Supabase auth might have issues
				if (isDemo() || isVercelPreview) {
					console.log('AuthProvider: Using localStorage auth mode');
					const storedUserString = localStorage.getItem('gatherkids-user');
					if (storedUserString) {
						console.log('AuthProvider: Found stored user in localStorage');
						const storedUser = JSON.parse(storedUserString);
						const finalUser: BaseUser = {
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
							const leaderId = getUserId(storedUser);
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
						console.log('AuthProvider: Setting user from localStorage', {
							uid: finalUser.uid,
							role: finalUser.metadata.role,
						});
						setUser(finalUser);
						setUserRole(finalUser.metadata.role);
					} else {
						console.log('AuthProvider: No stored user found in localStorage');
					}
				} else {
					console.log('AuthProvider: Using Supabase auth mode');
					// Production mode: use Supabase session as primary source
					const {
						data: { session },
						error: sessionError,
					} = await supabase.auth.getSession();

					// Check for a session
					if (session?.user) {
						console.log('AuthProvider: Found active Supabase session');
						// Convert Supabase user to BaseUser format
						const supabaseUser = session.user;
						const userRole = supabaseUser.user_metadata?.role || AuthRole.ADMIN;

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

						if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
							const leaderId = getUserId(finalUser);
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

						console.log('AuthProvider: Setting user from Supabase session', {
							uid: finalUser.uid,
							role: finalUser.metadata.role,
						});
						setUser(finalUser);
						setUserRole(finalUser.metadata.role);
					}
					// If we don't have a session but do have tokens in localStorage, try to recover
					else if (typeof window !== 'undefined') {
						// Check for Supabase auth tokens that would indicate a previous successful auth
						const hasSupabaseTokens = Object.keys(localStorage).some(
							(key) => key && key.startsWith('sb-')
						);

						if (hasSupabaseTokens) {
							console.log(
								'AuthProvider: Found Supabase tokens but no active session. Attempting session refresh...'
							);

							// Try to refresh the session using the tokens
							const refreshResult = await supabase.auth.refreshSession();

							if (refreshResult.data?.session?.user) {
								console.log('AuthProvider: Session refresh successful!');
								const recoveredUser = refreshResult.data.session.user;
								const userRole =
									recoveredUser.user_metadata?.role || AuthRole.ADMIN;

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
									finalUser.metadata.role === AuthRole.MINISTRY_LEADER &&
									finalUser.uid
								) {
									const assignments = await getLeaderAssignmentsForCycle(
										finalUser.uid,
										'2025'
									);
									finalUser.assignedMinistryIds = assignments.map(
										(a) => a.ministry_id
									);
								}

								console.log(
									'AuthProvider: Setting user from recovered session',
									{
										uid: finalUser.uid,
										role: finalUser.metadata.role,
									}
								);
								setUser(finalUser);
								setUserRole(finalUser.metadata.role);
							} else {
								console.log(
									'AuthProvider: Session refresh failed. Need to re-authenticate.'
								);
							}
						} else {
							console.log('AuthProvider: No session or tokens found');
						}
					}
				}
			} catch (error) {
				console.error('AuthProvider: Failed to initialize auth state', error);
				// In demo mode, clear localStorage on error
				if (isDemo()) {
					localStorage.removeItem('gatherkids-user');
				}
			} finally {
				console.log('AuthProvider: Initialization complete');
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

					if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
						const leaderId = getUserId(finalUser);
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
		console.log('AuthProvider: Login called with userData:', userData);
		setLoading(true);
		try {
			console.log('Auth Context - Login - Input userData:', userData);
			const finalUser: BaseUser = {
				...userData,
				// Ensure we have both uid and id properties for compatibility
				uid: getUserId(userData) || userData.uid || userData.id,
				id: getUserId(userData) || userData.id || userData.uid,
				// preserve is_active if provided by userData (seed/login), default to true
				is_active:
					typeof userData.is_active === 'boolean' ? userData.is_active : true,
				metadata: {
					...userData.metadata,
					role: userData.metadata?.role || null, // Don't default to ADMIN for users with no role
				},
				assignedMinistryIds: [],
			};
			console.log(
				'Auth Context - Login - Final user with role:',
				finalUser.metadata.role
			);

			if (finalUser.metadata.role === AuthRole.MINISTRY_LEADER) {
				const leaderId = getUserId(userData) as string | undefined;
				if (leaderId) {
					const assignments = await getLeaderAssignmentsForCycle(
						leaderId,
						'2025'
					);
					finalUser.assignedMinistryIds = assignments.map((a) => a.ministry_id);
				}
			}

			// In demo mode or Vercel preview, use localStorage for persistence
			if (isDemo() || isVercelPreview) {
				console.log(
					'Storing user with role:',
					finalUser.metadata.role,
					isVercelPreview ? '(Vercel Preview)' : '(Demo Mode)'
				);
				localStorage.setItem('gatherkids-user', JSON.stringify(finalUser));
			}

			console.log('AuthProvider: Setting user state...', {
				uid: finalUser.uid,
				role: finalUser.metadata.role,
			});
			setUser(finalUser);
			console.log('Setting userRole to:', finalUser.metadata.role);
			setUserRole(finalUser.metadata.role);
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

			// In demo mode or Vercel preview, clear localStorage
			if (isDemo() || isVercelPreview) {
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

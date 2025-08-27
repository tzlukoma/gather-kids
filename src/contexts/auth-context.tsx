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
		const initializeUser = async () => {
			setLoading(true);
			try {
				const storedUserString = localStorage.getItem('gatherkids-user');
				if (storedUserString) {
					const storedUser = JSON.parse(storedUserString);
					let finalUser: BaseUser = {
						...storedUser,
						metadata: {
							...storedUser.metadata,
							role: storedUser.metadata?.role || AuthRole.ADMIN,
						},
						// preserve is_active from stored data (do not force true)
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
			} catch (error) {
				console.error('Failed to parse user from localStorage', error);
				localStorage.removeItem('gatherkids-user');
			}
			setLoading(false);
		};
		initializeUser();
	}, []);

	const login = async (userData: Omit<BaseUser, 'assignedMinistryIds'>) => {
		setLoading(true);
		try {
			console.log('Auth Context - Login - Input userData:', userData);
			const finalUser: BaseUser = {
				...userData,
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

			console.log('Storing user with role:', finalUser.metadata.role);
			localStorage.setItem('gatherkids-user', JSON.stringify(finalUser));
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
			localStorage.removeItem('gatherkids-user');
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

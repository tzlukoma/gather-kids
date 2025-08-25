'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { getLeaderAssignmentsForCycle } from '@/lib/dal';
import { User, UserRole, ROLES } from '@/lib/constants/roles';
import { ProtectedRoute } from '@/components/auth/protected-route';

interface ExtendedUser extends Omit<User, 'metadata'> {
	name?: string;
	is_active: boolean;
	assignedMinistryIds?: string[];
	metadata: {
		role: UserRole;
		household_id?: string;
	};
}

interface AuthContextType {
	user: ExtendedUser | null;
	loading: boolean;
	userRole: UserRole | null;
	login: (user: Omit<ExtendedUser, 'assignedMinistryIds'>) => void;
	logout: () => void;
	setUserRole: (role: UserRole) => void; // For demo mode role switching
}

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<ExtendedUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [userRole, setUserRole] = useState<UserRole | null>(null);

	useEffect(() => {
		const initializeUser = async () => {
			setLoading(true);
			try {
				const storedUserString = localStorage.getItem('gatherkids-user');
				if (storedUserString) {
					const storedUser = JSON.parse(storedUserString);
					let finalUser: ExtendedUser = {
						...storedUser,
						metadata: {
							...storedUser.metadata,
							role: storedUser.metadata?.role || ROLES.ADMIN,
						},
						assignedMinistryIds: [],
					};

					if (finalUser.metadata.role === ROLES.MINISTRY_LEADER) {
						const assignments = await getLeaderAssignmentsForCycle(
							storedUser.id,
							'2025'
						);
						finalUser.assignedMinistryIds = assignments.map(
							(a) => a.ministry_id
						);
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

	const login = async (userData: Omit<ExtendedUser, 'assignedMinistryIds'>) => {
		setLoading(true);
		try {
			const finalUser: ExtendedUser = {
				...userData,
				metadata: {
					...userData.metadata,
					role: userData.metadata?.role || ROLES.ADMIN,
				},
				assignedMinistryIds: [],
			};

			if (finalUser.metadata.role === ROLES.MINISTRY_LEADER) {
				const assignments = await getLeaderAssignmentsForCycle(
					userData.id,
					'2025'
				);
				finalUser.assignedMinistryIds = assignments.map((a) => a.ministry_id);
			}

			localStorage.setItem('gatherkids-user', JSON.stringify(finalUser));
			setUser(finalUser);
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

export function withRole(allowedRoles: UserRole[]) {
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

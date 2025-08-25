import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { AuthProvider, AuthContext } from '@/contexts/auth-context';
import { ROLES, User, UserRole } from '@/lib/constants/roles';

// Mock user data for different roles
export const mockUsers = {
	admin: {
		id: 'admin-user',
		email: 'admin@example.com',
		metadata: {
			role: ROLES.ADMIN,
		},
	},
	ministryLeader: {
		id: 'leader-user',
		email: 'leader@example.com',
		metadata: {
			role: ROLES.MINISTRY_LEADER,
		},
	},
	guardian: {
		id: 'guardian-user',
		email: 'guardian@example.com',
		metadata: {
			role: ROLES.GUARDIAN,
			household_id: 'test-household',
		},
	},
};

interface MockAuthProviderProps {
	children: ReactNode;
	user?: User | null;
	loading?: boolean;
	userRole?: UserRole | null;
}

export function MockAuthProvider({
	children,
	user = null,
	loading = false,
	userRole = null,
}: MockAuthProviderProps) {
	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				userRole,
				login: jest.fn(),
				logout: jest.fn(),
				setUserRole: jest.fn(),
			}}>
			{children}
		</AuthContext.Provider>
	);
}

// Custom render function that includes providers with specific auth state
export function renderWithAuth(
	ui: ReactNode,
	{
		user = null,
		loading = false,
		userRole = null,
	}: Partial<MockAuthProviderProps> = {}
) {
	return render(
		<MockAuthProvider user={user} loading={loading} userRole={userRole}>
			{ui}
		</MockAuthProvider>
	);
}

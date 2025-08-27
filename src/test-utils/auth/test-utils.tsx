import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { AuthProvider, AuthContext } from '@/contexts/auth-context';
import { ROLES } from '@/lib/constants/roles';
import type { BaseUser, AuthRole } from '@/lib/auth-types';

// Mock user data for different roles
export const mockUsers = {
	admin: {
		id: 'admin-user',
		uid: 'admin-user',
		email: 'admin@example.com',
		metadata: {
			role: ROLES.ADMIN,
		},
		is_active: true,
	},
	ministryLeader: {
		id: 'leader-user',
		uid: 'leader-user',
		email: 'leader@example.com',
		metadata: {
			role: ROLES.MINISTRY_LEADER,
		},
		is_active: true,
	},
	guardian: {
		id: 'guardian-user',
		uid: 'guardian-user',
		email: 'guardian@example.com',
		metadata: {
			role: ROLES.GUARDIAN,
			household_id: 'test-household',
		},
		is_active: true,
	},
};

interface MockAuthProviderProps {
	children: ReactNode;
	user?: BaseUser | null;
	loading?: boolean;
	userRole?: AuthRole | null;
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
				user: user as BaseUser | null,
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

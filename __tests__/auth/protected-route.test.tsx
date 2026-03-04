import { render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import {
	renderWithAuth,
	mockUsers,
} from '../../src/test-utils/auth/test-utils';
import { useRouter } from 'next/navigation';
import { AuthRole } from '@/lib/auth-types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
}));

describe('ProtectedRoute', () => {
	const mockRouter = {
		replace: jest.fn(),
	};

	beforeEach(() => {
		(useRouter as jest.Mock).mockImplementation(() => mockRouter);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading component initially', () => {
		renderWithAuth(
			<ProtectedRoute
				allowedRoles={[AuthRole.ADMIN]}
				loadingComponent={<div>Loading...</div>}>
				<div>Protected Content</div>
			</ProtectedRoute>,
			{ loading: true }
		);

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('redirects to login when user is not authenticated', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[AuthRole.ADMIN]}>
				<div>Protected Content</div>
			</ProtectedRoute>,
			{ loading: false, user: null }
		);

		await waitFor(() => {
			expect(mockRouter.replace).toHaveBeenCalledWith('/login');
		});
	});

	it('shows content when user has correct role', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[AuthRole.ADMIN]}>
				<div>Protected Admin Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.admin,
				userRole: AuthRole.ADMIN,
			}
		);

		expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
	});

	it('redirects to unauthorized when user has wrong role', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[AuthRole.ADMIN]}>
				<div>Protected Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.guardian,
				userRole: AuthRole.GUARDIAN,
			}
		);

		await waitFor(() => {
			expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized');
		});
	});

	it('allows access to multiple roles', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[AuthRole.ADMIN, AuthRole.MINISTRY_LEADER]}>
				<div>Shared Protected Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.ministryLeader,
				userRole: AuthRole.MINISTRY_LEADER,
			}
		);

		expect(screen.getByText('Shared Protected Content')).toBeInTheDocument();
	});
});

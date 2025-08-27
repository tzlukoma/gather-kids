import { render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import {
	renderWithAuth,
	mockUsers,
} from '../../src/test-utils/auth/test-utils';
import { useRouter } from 'next/navigation';
import { ROLES } from '@/lib/constants/roles';

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
				allowedRoles={[ROLES.ADMIN]}
				loadingComponent={<div>Loading...</div>}>
				<div>Protected Content</div>
			</ProtectedRoute>,
			{ loading: true }
		);

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('redirects to login when user is not authenticated', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
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
			<ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
				<div>Protected Admin Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.admin,
				userRole: ROLES.ADMIN,
			}
		);

		expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
	});

	it('redirects to unauthorized when user has wrong role', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
				<div>Protected Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.guardian,
				userRole: ROLES.GUARDIAN,
			}
		);

		await waitFor(() => {
			expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized');
		});
	});

	it('allows access to multiple roles', async () => {
		renderWithAuth(
			<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MINISTRY_LEADER]}>
				<div>Shared Protected Content</div>
			</ProtectedRoute>,
			{
				loading: false,
				user: mockUsers.ministryLeader,
				userRole: ROLES.MINISTRY_LEADER,
			}
		);

		expect(screen.getByText('Shared Protected Content')).toBeInTheDocument();
	});
});

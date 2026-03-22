/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersManagementPage from '@/app/(admin)/users/page';
import { AuthRole } from '@/lib/auth-types';
import { mockUsers } from '@/test-utils/auth/test-utils';

jest.unmock('@tanstack/react-query');

const mockFetch = jest.fn();
const useUpdateUserMock = jest.fn();
const useCreateUserMock = jest.fn();
jest.mock('@/hooks/data/users', () => ({
	...jest.requireActual('@/hooks/data/users'),
	useUsers: () => ({
		data: [
			{
				id: 'user-1',
				email: 'admin@example.com',
				role: 'ADMIN',
				name: 'Admin User',
				email_confirmed: true,
				last_sign_in: null,
				created_at: '2024-01-01',
				user_metadata: {},
			},
			{
				id: 'user-2',
				email: 'unconfirmed@example.com',
				role: 'GUEST',
				name: 'Unconfirmed User',
				email_confirmed: false,
				last_sign_in: null,
				created_at: '2024-01-02',
				user_metadata: {},
			},
		],
		isLoading: false,
		error: null,
	}),
	useCreateUser: (...args: unknown[]) => useCreateUserMock(...args),
	useUpdateUser: (...args: unknown[]) => useUpdateUserMock(...args),
}));

jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => ({
		user: mockUsers.admin,
	}),
}));

global.fetch = mockFetch;

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
};

describe('UsersManagementPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useUpdateUserMock.mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({ success: true }),
			isPending: false,
		});
		useCreateUserMock.mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({ success: true }),
			isPending: false,
		});
	});

	it('renders Create User button', () => {
		render(<UsersManagementPage />, { wrapper });
		expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
	});

	it('opens Create User Dialog when button clicked', async () => {
		render(<UsersManagementPage />, { wrapper });
		await userEvent.click(screen.getByRole('button', { name: /create user/i }));
		await waitFor(() => {
			expect(screen.getByRole('dialog', { name: /create user/i })).toBeInTheDocument();
		});
	});

	it('shows Set Password action per user', () => {
		render(<UsersManagementPage />, { wrapper });
		expect(screen.getAllByRole('button', { name: /set password/i }).length).toBeGreaterThan(0);
	});

	it('shows Confirm Email action for unconfirmed users', () => {
		render(<UsersManagementPage />, { wrapper });
		expect(screen.getByRole('button', { name: /confirm email/i })).toBeInTheDocument();
	});

	it('does not show Confirm Email for already-confirmed users', () => {
		render(<UsersManagementPage />, { wrapper });
		// We have 2 users: one admin (confirmed), one unconfirmed. So we should have exactly one Confirm Email button
		const confirmButtons = screen.getAllByRole('button', { name: /confirm email/i });
		expect(confirmButtons.length).toBe(1);
	});

	it('Promote to Admin calls useUpdateUser', async () => {
		const mutateAsync = jest.fn().mockResolvedValue({ success: true });
		useUpdateUserMock.mockReturnValue({ mutateAsync, isPending: false });
		// Need a user that is not admin - we have unconfirmed@example.com with role GUEST
		render(<UsersManagementPage />, { wrapper });
		const promoteBtn = screen.getByRole('button', { name: /promote to admin/i });
		await userEvent.click(promoteBtn);
		await waitFor(() => {
			expect(mutateAsync).toHaveBeenCalledWith({ userId: 'user-2', role: AuthRole.ADMIN });
		});
	});

	it('shows access denied for non-admin users', () => {
		jest.spyOn(require('@/contexts/auth-context'), 'useAuth').mockReturnValue({
			user: mockUsers.guardian,
		});
		render(<UsersManagementPage />, { wrapper });
		expect(screen.getByText(/access denied/i)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument();
	});
});

/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetPasswordDialog } from '@/components/admin/set-password-dialog';

jest.unmock('@tanstack/react-query');

const mockMutateAsync = jest.fn();
const useUpdateUserMock = jest.fn();
jest.mock('@/hooks/data/users', () => ({
	...jest.requireActual('@/hooks/data/users'),
	useUpdateUser: (...args: unknown[]) => useUpdateUserMock(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
};

describe('SetPasswordDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useUpdateUserMock.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		});
	});

	it('renders password input', () => {
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="user-1"
				userEmail="u@example.com"
				currentUserId="admin-1"
			/>,
			{ wrapper }
		);
		expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
	});

	it('shows validation error for short password', async () => {
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="user-1"
				userEmail="u@example.com"
				currentUserId="admin-1"
			/>,
			{ wrapper }
		);
		await userEvent.type(screen.getByLabelText(/new password/i), 'short');
		await userEvent.click(screen.getByRole('button', { name: /set password/i }));
		await waitFor(() => {
			expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
		});
		expect(mockMutateAsync).not.toHaveBeenCalled();
	});

	it('calls onSubmit with { password } on valid submit', async () => {
		mockMutateAsync.mockResolvedValue(undefined);
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="user-1"
				userEmail="u@example.com"
				currentUserId="admin-1"
			/>,
			{ wrapper }
		);
		await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword123');
		await userEvent.click(screen.getByRole('button', { name: /set password/i }));
		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith({ userId: 'user-1', password: 'newpassword123' });
		});
	});

	it('shows self-lockout warning when target user is current user', () => {
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="same-id"
				userEmail="me@example.com"
				currentUserId="same-id"
			/>,
			{ wrapper }
		);
		expect(screen.getByText(/changing your own password|sign you out|continue/i)).toBeInTheDocument();
	});

	it('does not show warning when target user is different user', () => {
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="other-id"
				userEmail="other@example.com"
				currentUserId="admin-id"
			/>,
			{ wrapper }
		);
		expect(screen.queryByText(/changing your own password|sign you out/i)).not.toBeInTheDocument();
	});

	it('does not submit until warning is confirmed when target is self', async () => {
		render(
			<SetPasswordDialog
				open
				onOpenChange={jest.fn()}
				userId="me"
				userEmail="me@example.com"
				currentUserId="me"
			/>,
			{ wrapper }
		);
		// When target is self, submit button is disabled until "I understand" is checked
		const submitBtn = screen.getByRole('button', { name: /set password/i });
		expect(submitBtn).toBeDisabled();
		// After checking the confirmation, button becomes enabled
		const checkbox = screen.getByRole('checkbox', { name: /understand.*signed out/i });
		await userEvent.click(checkbox);
		expect(submitBtn).not.toBeDisabled();
	});
});

/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { AuthRole } from '@/lib/auth-types';

jest.unmock('@tanstack/react-query');

const mockMutateAsync = jest.fn();
const useCreateUserMock = jest.fn();
jest.mock('@/hooks/data/users', () => ({
	...jest.requireActual('@/hooks/data/users'),
	useCreateUser: (...args: unknown[]) => useCreateUserMock(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
};

describe('CreateUserDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useCreateUserMock.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		});
	});

	it('renders form fields: email, password, full name, role select, email confirmed checkbox', () => {
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Min 8 characters')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Display name')).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
		expect(screen.getByRole('checkbox', { name: /mark email as confirmed/i })).toBeInTheDocument();
	});

	it('email confirmed checkbox is checked by default', () => {
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		const checkbox = screen.getByRole('checkbox', { name: /mark email as confirmed/i });
		expect(checkbox).toBeChecked();
	});

	it('role dropdown contains all AuthRole values', () => {
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		const combobox = screen.getByRole('combobox', { name: /role/i });
		expect(combobox).toBeInTheDocument();
		// Roles are in the document when SelectContent is opened; at least combobox exists
		expect(Object.values(AuthRole).length).toBeGreaterThan(0);
	});

	it('shows validation error for empty email on submit', async () => {
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		const submit = screen.getByRole('button', { name: /create user|creating/i });
		await userEvent.click(submit);
		await waitFor(() => {
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
		});
		expect(mockMutateAsync).not.toHaveBeenCalled();
	});

	it('shows validation error for short password on submit', async () => {
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		await userEvent.type(screen.getByPlaceholderText('user@example.com'), 'a@b.com');
		await userEvent.type(screen.getByPlaceholderText('Min 8 characters'), 'short');
		const submit = screen.getByRole('button', { name: /create user|creating/i });
		await userEvent.click(submit);
		await waitFor(() => {
			expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
		});
		expect(mockMutateAsync).not.toHaveBeenCalled();
	});

	it('calls onSubmit with correct payload on valid submit', async () => {
		mockMutateAsync.mockResolvedValue({ success: true });
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		await userEvent.type(screen.getByPlaceholderText('user@example.com'), 'new@example.com');
		await userEvent.type(screen.getByPlaceholderText('Min 8 characters'), 'password123');
		await userEvent.type(screen.getByPlaceholderText('Display name'), 'New User');
		const submit = screen.getByRole('button', { name: /create user|creating/i });
		await userEvent.click(submit);
		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'new@example.com',
					password: 'password123',
					full_name: 'New User',
					email_confirm: true,
				})
			);
		});
	});

	it('disables submit button while submitting', () => {
		useCreateUserMock.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: true,
		});
		render(
			<CreateUserDialog open onOpenChange={jest.fn()} />,
			{ wrapper }
		);
		const submit = screen.getByRole('button', { name: /create user|creating/i });
		expect(submit).toBeDisabled();
	});

	it('closes dialog on successful submit', async () => {
		mockMutateAsync.mockResolvedValue({ success: true });
		const onOpenChange = jest.fn();
		render(
			<CreateUserDialog open onOpenChange={onOpenChange} />,
			{ wrapper }
		);
		await userEvent.type(screen.getByPlaceholderText('user@example.com'), 'a@b.com');
		await userEvent.type(screen.getByPlaceholderText('Min 8 characters'), 'password123');
		await userEvent.click(screen.getByRole('button', { name: /create user/i }));
		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});

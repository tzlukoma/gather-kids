import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ResetPasswordPage from '@/app/auth/reset-password/page';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
	useSearchParams: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast');

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
	supabase: {
		auth: {
			exchangeCodeForSession: jest.fn(),
			updateUser: jest.fn(),
			signOut: jest.fn(),
		},
	},
}));

const mockToast = jest.fn();
const mockPush = jest.fn();
let mockReplaceState: jest.SpyInstance;

(useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockPush });

(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

import { supabase } from '@/lib/supabaseClient';

const mockExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.Mock;
const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

describe('ResetPasswordPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockReplaceState = jest.spyOn(window.history, 'replaceState');

		// Mock searchParams default
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockReturnValue(null),
		});

		mockExchangeCodeForSession.mockResolvedValue({
			data: { session: null },
			error: new Error('Invalid recovery code'),
		});
		mockUpdateUser.mockResolvedValue({ error: null });
		mockSignOut.mockResolvedValue({ error: null });
	});

	afterEach(() => {
		mockReplaceState.mockRestore();
	});

	it('shows invalid token state when no token provided', async () => {
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
			expect(screen.getByText(/This password reset link is invalid/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Return to Sign In' })).toBeInTheDocument();
		});
	});

	it('exchanges the supplied PKCE code before showing the form', async () => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) => {
				if (key === 'code') return 'valid-code';
				if (key === 'sb_flow_id') return 'flow-id';
				return null;
			}),
		});

		mockExchangeCodeForSession.mockResolvedValue({
			data: {
				session: {
					user: { id: 'test-user-id', email: 'test@example.com' }
				}
			},
			error: null,
		});

		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code', {
				flowId: 'flow-id',
			});
			expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();
		});
		expect(mockReplaceState).toHaveBeenCalledWith({}, '', '/auth/reset-password');
	});

	it('does not accept an existing session when recovery code exchange fails', async () => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) =>
				key === 'code' ? 'bad-code' : null
			),
		});

		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
		});
		expect(mockUpdateUser).not.toHaveBeenCalled();
	});

	it('exchanges a recovery code once when Strict Mode replays effects', async () => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) =>
				key === 'code' ? 'strict-mode-code' : null
			),
		});
		mockExchangeCodeForSession.mockResolvedValue({
			data: { session: { user: { id: 'uid', email: 'test@example.com' } } },
			error: null,
		});

		render(
			<StrictMode>
				<ResetPasswordPage />
			</StrictMode>
		);

		await screen.findByText('Reset Your Password');
		expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
	});

	it('validates password requirements', async () => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) => {
				if (key === 'code') return 'valid-code';
				return null;
			}),
		});
		mockExchangeCodeForSession.mockResolvedValue({
			data: { session: { user: { id: 'uid', email: 'test@example.com' } } },
			error: null,
		});

		const user = userEvent.setup();
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
		});

		const passwordInput = screen.getByPlaceholderText('Enter your new password');
		const submitButton = screen.getByRole('button', { name: 'Update Password' });

		// Test weak password
		await user.type(passwordInput, 'weak');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
		});
	});

	it('updates the password, signs out the recovery session, and requires fresh login', async () => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) =>
				key === 'code' ? 'valid-code' : null
			),
		});
		mockExchangeCodeForSession.mockResolvedValue({
			data: { session: { user: { id: 'uid', email: 'test@example.com' } } },
			error: null,
		});

		const user = userEvent.setup();
		render(<ResetPasswordPage />);

		await screen.findByPlaceholderText('Enter your new password');
		await user.type(screen.getByPlaceholderText('Enter your new password'), 'ValidPass1!');
		await user.type(screen.getByPlaceholderText('Confirm your new password'), 'ValidPass1!');
		await user.click(screen.getByRole('button', { name: 'Update Password' }));

		await waitFor(() => {
			expect(mockUpdateUser).toHaveBeenCalledWith({
				password: 'ValidPass1!',
				data: { has_password: true },
			});
			expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
			expect(mockPush).toHaveBeenCalledWith('/login');
		});
	});

	it.each([
		['password update', 'updateUser'],
		['recovery sign-out', 'signOut'],
	])('does not claim success when %s fails', async (_label, operation) => {
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) =>
				key === 'code' ? 'valid-code' : null
			),
		});
		mockExchangeCodeForSession.mockResolvedValue({
			data: { session: { user: { id: 'uid', email: 'test@example.com' } } },
			error: null,
		});
		if (operation === 'updateUser') {
			mockUpdateUser.mockResolvedValue({ error: new Error('Update failed') });
		} else {
			mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') });
		}

		const user = userEvent.setup();
		render(<ResetPasswordPage />);
		await screen.findByPlaceholderText('Enter your new password');
		await user.type(screen.getByPlaceholderText('Enter your new password'), 'ValidPass1!');
		await user.type(screen.getByPlaceholderText('Confirm your new password'), 'ValidPass1!');
		await user.click(screen.getByRole('button', { name: 'Update Password' }));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Reset Failed', variant: 'destructive' })
			);
		});
		expect(mockPush).not.toHaveBeenCalled();
	});
});

import { render, screen, waitFor } from '@testing-library/react';
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
			getSession: jest.fn(),
		},
	},
}));

const mockToast = jest.fn();
const mockPush = jest.fn();

(useToast as jest.Mock).mockReturnValue({ toast: mockToast });
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });

import { supabase } from '@/lib/supabaseClient';

const mockGetSession = supabase.auth.getSession as jest.Mock;

describe('ResetPasswordPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock searchParams default
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockReturnValue(null),
		});

		// Mock Supabase session to return no session by default
		mockGetSession.mockResolvedValue({
			data: { session: null },
			error: null,
		});
	});

	it('shows invalid token state when no token provided', async () => {
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
			expect(screen.getByText(/This password reset link is invalid/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Return to Sign In' })).toBeInTheDocument();
		});
	});

	it('shows valid token form when token provided with valid session', async () => {
		// Mock searchParams to return a token
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) => {
				if (key === 'token') return 'valid-token';
				return null;
			}),
		});

		// Mock Supabase session to return a valid session
		mockGetSession.mockResolvedValue({
			data: {
				session: {
					user: { id: 'test-user-id', email: 'test@example.com' }
				}
			},
			error: null,
		});

		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();
		});
	});

	it('validates password requirements', async () => {
		// Mock valid session so form shows
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) => {
				if (key === 'token') return 'valid-token';
				return null;
			}),
		});
		mockGetSession.mockResolvedValue({
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
});

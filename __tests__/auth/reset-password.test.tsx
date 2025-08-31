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
const mockToast = jest.fn();
const mockPush = jest.fn();

(useToast as jest.Mock).mockReturnValue({ toast: mockToast });
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });

// Mock environment variables
const originalEnv = process.env;

describe('ResetPasswordPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		
		// Mock searchParams default
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockReturnValue(null),
		});
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('shows invalid token state when no token provided in live mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
			expect(screen.getByText(/This password reset link is invalid/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Return to Sign In' })).toBeInTheDocument();
		});
	});

	it('shows reset form in demo mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
			expect(screen.getByText(/Demo Mode:/)).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Update Password' })).toBeInTheDocument();
		});
	});

	it('validates password requirements', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
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

		// Clear and test password without special characters
		await user.clear(passwordInput);
		await user.type(passwordInput, 'Password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/Password must contain uppercase, lowercase, number, and special character/)).toBeInTheDocument();
		});
	});

	it('validates password confirmation match', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		const user = userEvent.setup();
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
		});

		const passwordInput = screen.getByPlaceholderText('Enter your new password');
		const confirmInput = screen.getByPlaceholderText('Confirm your new password');
		const submitButton = screen.getByRole('button', { name: 'Update Password' });

		await user.type(passwordInput, 'Password123!');
		await user.type(confirmInput, 'DifferentPassword123!');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
		});
	});

	it('successfully resets password in demo mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		const user = userEvent.setup();
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
		});

		const passwordInput = screen.getByPlaceholderText('Enter your new password');
		const confirmInput = screen.getByPlaceholderText('Confirm your new password');
		const submitButton = screen.getByRole('button', { name: 'Update Password' });

		await user.type(passwordInput, 'NewPassword123!');
		await user.type(confirmInput, 'NewPassword123!');
		await user.click(submitButton);

		// Wait for the simulated delay
		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith({
				title: 'Password Reset Successful',
				description: 'Your password has been updated successfully. You can now sign in with your new password.',
			});
		}, { timeout: 2000 });

		expect(mockPush).toHaveBeenCalledWith('/login');
	});

	it('toggles password visibility', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		const user = userEvent.setup();
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
		});

		const passwordInput = screen.getByPlaceholderText('Enter your new password');
		const toggleButtons = screen.getAllByRole('button');
		const passwordToggle = toggleButtons.find(button => 
			button.querySelector('svg') !== null && 
			button !== screen.getByRole('button', { name: 'Update Password' }) &&
			button !== screen.getByRole('button', { name: 'Back to Sign In' })
		);

		expect(passwordInput).toHaveAttribute('type', 'password');

		if (passwordToggle) {
			await user.click(passwordToggle);
			expect(passwordInput).toHaveAttribute('type', 'text');
			
			await user.click(passwordToggle);
			expect(passwordInput).toHaveAttribute('type', 'password');
		}
	});

	it('shows valid token form when token provided in live mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
		
		// Mock searchParams to return a token
		(useSearchParams as jest.Mock).mockReturnValue({
			get: jest.fn().mockImplementation((key: string) => {
				if (key === 'token') return 'valid-token';
				return null;
			}),
		});
		
		render(<ResetPasswordPage />);

		await waitFor(() => {
			expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();
		});
	});
});
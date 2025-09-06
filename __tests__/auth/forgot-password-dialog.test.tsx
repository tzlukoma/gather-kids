import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ForgotPasswordDialog } from '@/components/auth/forgot-password-dialog';
import { useToast } from '@/hooks/use-toast';

// Mock the toast hook
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

// Mock environment variables
const originalEnv = process.env;

describe('ForgotPasswordDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('renders trigger button and opens dialog', async () => {
		const user = userEvent.setup();
		
		render(
			<ForgotPasswordDialog>
				<button>Forgot Password</button>
			</ForgotPasswordDialog>
		);

		const triggerButton = screen.getByRole('button', { name: 'Forgot Password' });
		expect(triggerButton).toBeInTheDocument();

		await user.click(triggerButton);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Forgot Your Password?')).toBeInTheDocument();
		expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
	});

	it('shows demo mode alert when in demo mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		const user = userEvent.setup();
		
		render(
			<ForgotPasswordDialog>
				<button>Forgot Password</button>
			</ForgotPasswordDialog>
		);

		await user.click(screen.getByRole('button', { name: 'Forgot Password' }));

		expect(screen.getByText(/Demo Mode:/)).toBeInTheDocument();
		expect(screen.getByText(/Password reset is simulated/)).toBeInTheDocument();
	});

	it('validates email format', async () => {
		const user = userEvent.setup();
		
		render(
			<ForgotPasswordDialog>
				<button>Forgot Password</button>
			</ForgotPasswordDialog>
		);

		await user.click(screen.getByRole('button', { name: 'Forgot Password' }));
		
		const emailInput = screen.getByLabelText('Email Address');
		const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

		await user.type(emailInput, 'invalid-email');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
		});
	});

	it('submits email and shows success state in demo mode', async () => {
		process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
		const user = userEvent.setup();
		
		render(
			<ForgotPasswordDialog>
				<button>Forgot Password</button>
			</ForgotPasswordDialog>
		);

		await user.click(screen.getByRole('button', { name: 'Forgot Password' }));
		
		const emailInput = screen.getByLabelText('Email Address');
		const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

		await user.type(emailInput, 'test@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Check Your Email')).toBeInTheDocument();
			expect(screen.getByText(/Check your email for a password reset link/)).toBeInTheDocument();
			expect(screen.getByText(/Demo Mode:/)).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'the reset page directly' })).toBeInTheDocument();
		});

		expect(mockToast).toHaveBeenCalledWith({
			title: 'Reset Link Sent (Demo)',
			description: 'Password reset instructions have been sent to test@example.com. In demo mode, you can visit the reset page directly.',
		});
	});

	it('handles form reset when dialog closes', async () => {
		const user = userEvent.setup();
		
		render(
			<ForgotPasswordDialog>
				<button>Forgot Password</button>
			</ForgotPasswordDialog>
		);

		await user.click(screen.getByRole('button', { name: 'Forgot Password' }));
		
		const emailInput = screen.getByLabelText('Email Address');
		await user.type(emailInput, 'test@example.com');

		// Close dialog
		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		// Reopen dialog
		await user.click(screen.getByRole('button', { name: 'Forgot Password' }));

		// Email should be cleared
		const newEmailInput = screen.getByLabelText('Email Address');
		expect(newEmailInput).toHaveValue('');
	});
});
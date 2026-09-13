import React from 'react';
import { render, screen } from '@testing-library/react';
import { RegistrationOfflineAuth } from '@/components/gatherKids/registration-wizard/registration-entry';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		replace: mockReplace,
		push: jest.fn(),
	}),
}));

jest.mock('@/contexts/feature-flag-context', () => ({
	useFeatureFlags: () => ({
		flags: {
			loginMagicEnabled: true,
		},
	}),
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

describe('RegistrationOfflineAuth', () => {
	it('preserves next=/register on sign-in and create-account links', () => {
		render(<RegistrationOfflineAuth />);

		expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
			'href',
			'/login?next=%2Fregister'
		);
		expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
			'href',
			'/create-account?next=%2Fregister'
		);
	});
});

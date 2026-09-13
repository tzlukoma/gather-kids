import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import { MockAuthProvider, mockUsers } from '@/test-utils/auth/test-utils';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		replace: mockReplace,
		push: mockPush,
	}),
}));

jest.mock('@/lib/offline-supabase', () => ({
	isOfflineSupabase: jest.fn(() => false),
}));

jest.mock('@/hooks/useDraftPersistence', () => ({
	useDraftPersistence: () => ({
		loadDraft: jest.fn().mockResolvedValue(null),
		saveDraft: jest.fn(),
		clearDraft: jest.fn(),
		draftStatus: { isSaving: false, lastSaved: null, error: null },
	}),
}));

jest.mock('@/contexts/feature-flag-context', () => ({
	useFeatureFlags: () => ({
		flags: {
			registrationDraftPersistenceEnabled: false,
			loginMagicEnabled: true,
		},
	}),
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
	useQuery: () => ({ data: [{ cycle_id: '2026-fall' }], isLoading: false }),
}));

jest.mock('@/lib/dal', () => ({
	getRegistrationCycles: jest.fn().mockResolvedValue([{ cycle_id: '2026-fall' }]),
	registerHouseholdCanonical: jest.fn(),
}));

jest.mock('@/components/gatherKids/registration-wizard/steps/step1-household', () => ({
	Step1Household: () => <div>Step 1</div>,
}));
jest.mock('@/components/gatherKids/registration-wizard/steps/step2-guardians', () => ({
	Step2Guardians: () => <div>Step 2</div>,
}));
jest.mock('@/components/gatherKids/registration-wizard/steps/step3-children', () => ({
	Step3Children: () => <div>Step 3</div>,
}));
jest.mock('@/components/gatherKids/registration-wizard/steps/step4-ministries', () => ({
	Step4Ministries: () => <div>Step 4</div>,
}));
jest.mock('@/components/gatherKids/registration-wizard/steps/step5-consents', () => ({
	Step5Consents: () => <div>Step 5</div>,
}));

jest.mock('@/components/gatherKids/registration-wizard/registration-entry', () => ({
	RegistrationEntry: () => <div data-testid="registration-entry">Entry</div>,
	RegistrationOfflineAuth: () => (
		<div data-testid="registration-offline-auth">Offline Auth</div>
	),
}));

import { isOfflineSupabase } from '@/lib/offline-supabase';

const mockIsOfflineSupabase = isOfflineSupabase as jest.MockedFunction<
	typeof isOfflineSupabase
>;

describe('RegisterWizard auth gating', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsOfflineSupabase.mockReturnValue(false);
	});

	it('shows loading while auth is resolving', () => {
		render(
			<MockAuthProvider user={null} loading>
				<RegisterWizard />
			</MockAuthProvider>
		);

		expect(screen.getByTestId('registration-auth-loading')).toBeInTheDocument();
	});

	it('redirects signed-out live users to login with next=/register', async () => {
		render(
			<MockAuthProvider user={null} loading={false}>
				<RegisterWizard />
			</MockAuthProvider>
		);

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Fregister');
		});
		expect(screen.getByTestId('registration-auth-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('registration-entry')).not.toBeInTheDocument();
	});

	it('renders entry screen for authenticated guardians', async () => {
		render(
			<MockAuthProvider user={mockUsers.guardian} loading={false}>
				<RegisterWizard />
			</MockAuthProvider>
		);

		expect(await screen.findByTestId('registration-entry')).toBeInTheDocument();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('shows offline auth gate for signed-out dummy Supabase users', () => {
		mockIsOfflineSupabase.mockReturnValue(true);

		render(
			<MockAuthProvider user={null} loading={false}>
				<RegisterWizard />
			</MockAuthProvider>
		);

		expect(screen.getByTestId('registration-offline-auth')).toBeInTheDocument();
		expect(mockReplace).not.toHaveBeenCalled();
	});
});


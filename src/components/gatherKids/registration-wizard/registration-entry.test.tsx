import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RegistrationEntry } from '@/components/gatherKids/registration-wizard/registration-entry';
import { MockAuthProvider, mockUsers } from '@/test-utils/auth/test-utils';

const mockOnStart = jest.fn();

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
	}),
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
		flags: { registrationDraftPersistenceEnabled: false, loginMagicEnabled: true },
	}),
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
	useQuery: () => ({ data: [{ cycle_id: '2026-fall', is_active: true }], isLoading: false }),
}));

const mockLoadHouseholdForRegistration = jest.fn();
const mockGetHouseholdForUser = jest.fn();
const mockGetHouseholdProfile = jest.fn();

jest.mock('@/lib/dal', () => ({
	getRegistrationCycles: jest.fn().mockResolvedValue([{ cycle_id: '2026-fall', is_active: true }]),
	getHouseholdForUser: (...args: unknown[]) => mockGetHouseholdForUser(...args),
	getHouseholdProfile: (...args: unknown[]) => mockGetHouseholdProfile(...args),
	loadHouseholdForRegistration: (...args: unknown[]) =>
		mockLoadHouseholdForRegistration(...args),
}));

jest.mock('@/lib/dal/registration-cycle-utils', () => ({
	pickActiveRegistrationCycle: (cycles: Array<{ cycle_id: string }>) => cycles[0],
}));

function renderEntry() {
	return render(
		<MockAuthProvider user={mockUsers.guardian} loading={false}>
			<RegistrationEntry onStart={mockOnStart} />
		</MockAuthProvider>
	);
}

describe('RegistrationEntry prefill copy', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetHouseholdForUser.mockResolvedValue(null);
		mockGetHouseholdProfile.mockResolvedValue({ children: [], household: null });
		mockLoadHouseholdForRegistration.mockResolvedValue(null);
	});

	it('shows first-time neutral copy with no returning/last-year claims', async () => {
		renderEntry();

		await waitFor(() => {
			expect(screen.getByTestId('registration-entry-description')).toBeInTheDocument();
		});

		const description = screen.getByTestId('registration-entry-description');
		expect(description).toHaveAttribute('data-prefill-kind', 'first_time');
		expect(description.textContent).toMatch(/complete your family registration/i);
		expect(description.textContent).not.toMatch(/last year|on file|returning/i);
		expect(screen.queryByTestId('registration-entry-overwrite-warning')).not.toBeInTheDocument();
	});

	it('shows prior-cycle last-year prefill copy and returning child status', async () => {
		mockLoadHouseholdForRegistration.mockResolvedValue({
			isCurrentYear: false,
			isReturningPrefill: true,
			existingChildIds: ['child-1'],
			data: {
				household: { household_id: 'hh-1', name: 'Rivera Household' },
				children: [{ child_id: 'child-1', first_name: 'Jordan', last_name: 'Rivera', grade: '1st' }],
			},
		});
		mockGetHouseholdForUser.mockResolvedValue('hh-1');
		mockGetHouseholdProfile.mockResolvedValue({
			household: { name: 'Rivera Household' },
			children: [
				{ child_id: 'child-1', first_name: 'Jordan', last_name: 'Rivera', grade: '1st' },
			],
		});

		renderEntry();

		await waitFor(() => {
			expect(screen.getByTestId('registration-entry-description')).toHaveAttribute(
				'data-prefill-kind',
				'prior_cycle'
			);
		});

		expect(screen.getByTestId('registration-entry-description').textContent).toMatch(
			/last year's answers/i
		);
		expect(screen.getByTestId('registration-entry-child-status').textContent).toMatch(
			/returning/i
		);
		expect(screen.queryByTestId('registration-entry-overwrite-warning')).not.toBeInTheDocument();
	});

	it('shows current-cycle overwrite warning and never last-year copy', async () => {
		mockLoadHouseholdForRegistration.mockResolvedValue({
			isCurrentYear: true,
			isReturningPrefill: false,
			existingChildIds: ['child-1'],
			data: {
				household: { household_id: 'hh-1', name: 'Rivera Household' },
				children: [{ child_id: 'child-1', first_name: 'Jordan', last_name: 'Rivera', grade: '1st' }],
			},
		});
		mockGetHouseholdForUser.mockResolvedValue('hh-1');
		mockGetHouseholdProfile.mockResolvedValue({
			household: { name: 'Rivera Household' },
			children: [
				{ child_id: 'child-1', first_name: 'Jordan', last_name: 'Rivera', grade: '1st' },
			],
		});

		renderEntry();

		await waitFor(() => {
			expect(screen.getByTestId('registration-entry-description')).toHaveAttribute(
				'data-prefill-kind',
				'current_cycle'
			);
		});

		const description = screen.getByTestId('registration-entry-description');
		expect(description.textContent).toMatch(/already registered/i);
		expect(description.textContent).not.toMatch(/last year/i);
		expect(screen.getByTestId('registration-entry-overwrite-warning').textContent).toMatch(
			/overwrite/i
		);
		expect(screen.getByTestId('registration-entry-child-status').textContent).toMatch(
			/registered/i
		);
		expect(screen.getByTestId('registration-entry-child-status').textContent).not.toMatch(
			/returning/i
		);
	});
});

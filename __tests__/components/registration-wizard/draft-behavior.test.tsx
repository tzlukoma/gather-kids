/**
 * @jest-environment jsdom
 */

/**
 * #392 — draft behaviour wired into the wizard shell: the toggle gates the
 * status UI, the household branch no longer discards a draft, and confirming
 * Cancel clears the draft.
 *
 * Successful-submit clearing needs all five steps to validate, so it is
 * covered end-to-end in e2e/gathersystem-registration-drafts.spec.ts instead.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import { MockAuthProvider, mockUsers } from '@/test-utils/auth/test-utils';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: jest.fn(), push: mockPush }),
}));

jest.mock('@/lib/offline-supabase', () => ({
	isOfflineSupabase: jest.fn(() => false),
}));

const mockLoadDraft = jest.fn();
const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
const draftOptionsSeen: Array<{ enabled?: boolean }> = [];
let mockDraftStatus = {
	isSaving: false,
	lastSaved: null as Date | null,
	error: null as string | null,
};

jest.mock('@/hooks/useDraftPersistence', () => ({
	useDraftPersistence: (options: { enabled?: boolean }) => {
		draftOptionsSeen.push(options);
		return {
			loadDraft: mockLoadDraft,
			saveDraft: mockSaveDraft,
			clearDraft: mockClearDraft,
			draftStatus: mockDraftStatus,
		};
	},
}));

let mockFlags = {
	registrationDraftPersistenceEnabled: true,
	loginMagicEnabled: true,
};

jest.mock('@/contexts/feature-flag-context', () => ({
	useFeatureFlags: () => ({ flags: mockFlags }),
}));

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@tanstack/react-query', () => ({
	useQuery: () => ({
		data: [{ cycle_id: '2026-fall', name: 'Fall 2026', is_active: true }],
		isLoading: false,
	}),
}));

jest.mock('@/lib/dal', () => ({
	getRegistrationCycles: jest
		.fn()
		.mockResolvedValue([{ cycle_id: '2026-fall', name: 'Fall 2026', is_active: true }]),
	registerHouseholdCanonical: jest.fn(),
	getMinistries: jest.fn().mockResolvedValue([]),
	getMinistriesByGroupCode: jest.fn().mockResolvedValue([]),
	getMinistryGroups: jest.fn().mockResolvedValue([]),
}));

/**
 * The real steps pull in Radix selects, which this repo's jsdom cannot drive.
 * The shell (progress strip, action bar, cancel dialog) is what is under test.
 */
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

/** Stand-in entry that lets each test choose what the household load returned. */
let entryPrefill: unknown = null;
jest.mock('@/components/gatherKids/registration-wizard/registration-entry', () => ({
	RegistrationEntry: ({ onStart }: { onStart: (p: unknown) => void }) => (
		<button data-testid="start" onClick={() => onStart(entryPrefill)}>
			Start
		</button>
	),
	RegistrationOfflineAuth: () => <div>Offline Auth</div>,
}));

const HOUSEHOLD_PREFILL = {
	isCurrentYear: false,
	isReturningPrefill: true,
	existingChildIds: ['child-1'],
	gradeHintsByChildId: {},
	data: {
		household: {
			household_id: 'hh-1',
			name: 'Wakanda House',
			address_line1: '1 Palace Way',
			city: 'Birnin Zana',
			state: 'NY',
			zip: '10001',
		},
		guardians: [
			{
				first_name: 'Ramonda',
				last_name: 'Udaku',
				mobile_phone: '555-0100',
				email: 'ramonda@example.com',
				relationship: 'Mother',
				is_primary: true,
			},
		],
		emergencyContact: {
			first_name: 'Okoye',
			last_name: 'Dora',
			mobile_phone: '555-0101',
			relationship: 'Friend',
		},
		children: [
			{ child_id: 'child-1', first_name: 'Shuri', last_name: 'Udaku', grade: '7' },
		],
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
	},
};

async function startWizard() {
	const user = userEvent.setup();
	render(
		<MockAuthProvider user={mockUsers.guardian} loading={false}>
			<RegisterWizard />
		</MockAuthProvider>
	);
	await user.click(await screen.findByTestId('start'));
	return user;
}

describe('RegisterWizard draft behaviour', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		draftOptionsSeen.length = 0;
		entryPrefill = null;
		mockLoadDraft.mockResolvedValue(null);
		mockDraftStatus = { isSaving: false, lastSaved: null, error: null };
		mockFlags = {
			registrationDraftPersistenceEnabled: true,
			loginMagicEnabled: true,
		};
	});

	describe('toggle off', () => {
		beforeEach(() => {
			mockFlags = {
				registrationDraftPersistenceEnabled: false,
				loginMagicEnabled: true,
			};
		});

		it('passes enabled=false down to the persistence hook', async () => {
			await startWizard();

			expect(draftOptionsSeen.length).toBeGreaterThan(0);
			expect(draftOptionsSeen.every((o) => o.enabled === false)).toBe(true);
		});

		it('renders no draft status', async () => {
			await startWizard();

			await waitFor(() => expect(screen.getByText('Step 1')).toBeInTheDocument());
			expect(screen.queryByTestId('registration-draft-status')).not.toBeInTheDocument();
		});
	});

	describe('toggle on', () => {
		it('passes enabled=true down to the persistence hook', async () => {
			await startWizard();

			expect(draftOptionsSeen.length).toBeGreaterThan(0);
			expect(draftOptionsSeen.every((o) => o.enabled === true)).toBe(true);
		});

		it('reports idle before the first save', async () => {
			await startWizard();

			const status = await screen.findByTestId('registration-draft-status');
			expect(status).toHaveAttribute('data-draft-state', 'idle');
		});

		it('reports Saving while a save is in flight', async () => {
			mockDraftStatus = { isSaving: true, lastSaved: null, error: null };
			await startWizard();

			const status = await screen.findByTestId('registration-draft-status');
			expect(status).toHaveAttribute('data-draft-state', 'saving');
			expect(screen.getByText('Saving...')).toBeInTheDocument();
		});

		it('reports Saved once a save lands', async () => {
			mockDraftStatus = { isSaving: false, lastSaved: new Date(), error: null };
			await startWizard();

			const status = await screen.findByTestId('registration-draft-status');
			expect(status).toHaveAttribute('data-draft-state', 'saved');
			expect(screen.getByText('Saved just now')).toBeInTheDocument();
		});

		it('reports a save failure', async () => {
			mockDraftStatus = {
				isSaving: false,
				lastSaved: null,
				error: 'Failed to save draft',
			};
			await startWizard();

			const status = await screen.findByTestId('registration-draft-status');
			expect(status).toHaveAttribute('data-draft-state', 'error');
			expect(
				screen.getByText('Error saving: Failed to save draft')
			).toBeInTheDocument();
		});
	});

	describe('prefill versus draft on start', () => {
		it('reads the draft even when a household load succeeded', async () => {
			entryPrefill = HOUSEHOLD_PREFILL;
			await startWizard();

			await waitFor(() => expect(mockLoadDraft).toHaveBeenCalled());
		});

		it('tells the guardian their draft was kept alongside household data', async () => {
			entryPrefill = HOUSEHOLD_PREFILL;
			mockLoadDraft.mockResolvedValue({ household: { city: 'Oakland' } });
			await startWizard();

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Draft Restored',
						description: expect.stringContaining('unsubmitted changes'),
					})
				)
			);
		});

		it('still announces the household prefill when there is no draft', async () => {
			entryPrefill = HOUSEHOLD_PREFILL;
			await startWizard();

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Household Found!' })
				)
			);
		});

		it('announces a draft-only restore when no household loaded', async () => {
			mockLoadDraft.mockResolvedValue({ children: [{ first_name: 'Riri' }] });
			await startWizard();

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Draft Restored',
						description: expect.stringContaining('previous registration progress'),
					})
				)
			);
		});

		it('says nothing when there is neither a household nor a draft', async () => {
			await startWizard();

			await waitFor(() => expect(screen.getByText('Step 1')).toBeInTheDocument());
			expect(mockToast).not.toHaveBeenCalled();
		});

		it('opens the wizard even when the draft read throws', async () => {
			mockLoadDraft.mockRejectedValue(new Error('boom'));
			await startWizard();

			expect(await screen.findByText('Step 1')).toBeInTheDocument();
		});
	});

	describe('cancel', () => {
		it('warns before clearing anything', async () => {
			const user = await startWizard();
			await screen.findByText('Step 1');

			await user.click(screen.getByRole('button', { name: /^cancel$/i }));

			expect(await screen.findByText('Cancel Registration?')).toBeInTheDocument();
			expect(mockClearDraft).not.toHaveBeenCalled();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it('clears the draft and leaves only after explicit confirmation', async () => {
			const user = await startWizard();
			await screen.findByText('Step 1');

			await user.click(screen.getByRole('button', { name: /^cancel$/i }));
			await user.click(
				await screen.findByRole('button', { name: /yes, cancel/i })
			);

			await waitFor(() => expect(mockClearDraft).toHaveBeenCalledTimes(1));
			expect(mockPush).toHaveBeenCalledWith('/household');
		});

		it('keeps the draft when the guardian backs out of the dialog', async () => {
			const user = await startWizard();
			await screen.findByText('Step 1');

			await user.click(screen.getByRole('button', { name: /^cancel$/i }));
			await user.click(
				await screen.findByRole('button', { name: /continue registration/i })
			);

			expect(mockClearDraft).not.toHaveBeenCalled();
			expect(mockPush).not.toHaveBeenCalled();
		});
	});
});

/**
 * @jest-environment jsdom
 */

/**
 * #394 review P2 — the no-active-cycle path.
 *
 * Entry, wizard and Done each used to choose their own neutral wording: the
 * entry heading said "this year", the entry description and the wizard said
 * "current". With a cycle configured all three show its name, so the split was
 * invisible; it only surfaced where nobody looks — when no cycle is configured
 * at all — and there the three screens contradicted each other mid-flow.
 *
 * The fallback is now derived once, in `registrationCycleDisplayLabel`. This
 * test renders the real entry and the real wizard shell against an empty cycle
 * list and asserts the three surfaces agree *as rendered*, not that the helper
 * returns a string.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterWizard from '@/components/gatherKids/registration-wizard';
import { RegistrationDone } from '@/components/gatherKids/registration-wizard/registration-done';
import {
	REGISTRATION_CYCLE_FALLBACK_LABEL,
	registrationCycleDisplayLabel,
} from '@/lib/dal/registration-cycle-utils';
import { MockAuthProvider, mockUsers } from '@/test-utils/auth/test-utils';

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
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

/** The whole point: no cycle is configured. */
jest.mock('@tanstack/react-query', () => ({
	useQuery: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/lib/dal', () => ({
	getRegistrationCycles: jest.fn().mockResolvedValue([]),
	getHouseholdForUser: jest.fn().mockResolvedValue(null),
	getHouseholdProfile: jest
		.fn()
		.mockResolvedValue({ children: [], household: null }),
	loadHouseholdForRegistration: jest.fn().mockResolvedValue(null),
	registerHouseholdCanonical: jest.fn(),
	getMinistries: jest.fn().mockResolvedValue([]),
	getMinistriesByGroupCode: jest.fn().mockResolvedValue([]),
	getMinistryGroups: jest.fn().mockResolvedValue([]),
}));

/** Radix selects cannot be driven in this repo's jsdom; the shell is the subject. */
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

describe('no active cycle: entry, wizard and Done agree on one neutral label', () => {
	it('renders the same fallback on all three surfaces', async () => {
		const user = userEvent.setup();

		render(
			<MockAuthProvider user={mockUsers.guardian} loading={false}>
				<RegisterWizard />
			</MockAuthProvider>
		);

		// ---- Entry -------------------------------------------------------
		const entryLabel = await screen.findByTestId('registration-entry-cycle-label');
		const entryText = entryLabel.textContent?.trim() ?? '';

		// The heading and the body copy below it are two different call sites;
		// this is the pair that used to disagree.
		const entryDescription = screen.getByTestId('registration-entry-description');
		expect(entryDescription.textContent).toContain(entryText);

		await user.click(screen.getByRole('button', { name: /start registration/i }));

		// ---- Wizard ------------------------------------------------------
		const wizardLabel = await screen.findByTestId('registration-wizard-cycle-label');
		const wizardText = wizardLabel.textContent?.trim() ?? '';

		// ---- Done --------------------------------------------------------
		// Done is presentational: it names whatever the wizard hands it, which is
		// this same derived label.
		const doneLabel = registrationCycleDisplayLabel(null);
		render(<RegistrationDone cycleLabel={doneLabel} />);
		const doneSubtitle = screen.getByTestId('registration-done-subtitle');

		// ---- The invariant -----------------------------------------------
		expect(entryText).toBe(REGISTRATION_CYCLE_FALLBACK_LABEL);
		expect(wizardText).toBe(REGISTRATION_CYCLE_FALLBACK_LABEL);
		expect(doneSubtitle.textContent).toBe(
			`Your family is registered for ${REGISTRATION_CYCLE_FALLBACK_LABEL}.`
		);

		// Stated as the agreement the review asked for, so a future edit to any
		// one screen fails here rather than drifting quietly.
		expect(new Set([entryText, wizardText, doneLabel]).size).toBe(1);

		// The specific regression: a second, different neutral word reappearing.
		for (const surface of [
			entryText,
			wizardText,
			entryDescription.textContent ?? '',
			doneSubtitle.textContent ?? '',
		]) {
			expect(surface).not.toMatch(/\bcurrent\b/i);
		}
	});

	it('falls back for a cycle whose name is missing or blank, not just a null cycle', () => {
		expect(registrationCycleDisplayLabel(null)).toBe(
			REGISTRATION_CYCLE_FALLBACK_LABEL
		);
		expect(registrationCycleDisplayLabel(undefined)).toBe(
			REGISTRATION_CYCLE_FALLBACK_LABEL
		);
		expect(registrationCycleDisplayLabel({ name: '   ' })).toBe(
			REGISTRATION_CYCLE_FALLBACK_LABEL
		);
		expect(registrationCycleDisplayLabel({ name: 'Fall 2026' })).toBe('Fall 2026');
	});

	it('reads as a bare noun phrase, so it fits the slots a cycle name fits', () => {
		// "Register for this year" / "registered for this year" must both read;
		// a modifier-shaped fallback ("current") silently breaks the first.
		expect(`Register for ${REGISTRATION_CYCLE_FALLBACK_LABEL}`).toBe(
			'Register for this year'
		);
	});
});

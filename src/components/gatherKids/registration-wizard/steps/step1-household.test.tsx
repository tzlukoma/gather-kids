import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Step1Household } from '@/components/gatherKids/registration-wizard/steps/step1-household';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import {
	mapRegistrationPrefillState,
	type RegistrationPrefillState,
} from '@/components/gatherKids/registration-wizard/registration-prefill-state';

function Harness({ prefillState }: { prefillState: RegistrationPrefillState }) {
	const form = useForm<RegistrationFormInput>({
		defaultValues: {
			household: {
				name: '',
				address_line1: '',
				address_line2: '',
				city: '',
				state: '',
				zip: '',
				preferredScriptureTranslation: 'NIV',
			},
			guardians: [],
			emergencyContact: {
				first_name: '',
				last_name: '',
				mobile_phone: '',
				relationship: '',
			},
			children: [],
			consents: {
				liability: false,
				photoRelease: false,
				group_consents: {},
				custom_consents: {},
			},
		},
	});

	return (
		<Form {...form}>
			<Step1Household form={form} prefillState={prefillState} cycleLabel="2026-fall" />
		</Form>
	);
}

describe('Step1Household prefill copy', () => {
	it('hides on-file copy for first-time', () => {
		render(
			<Harness
				prefillState={mapRegistrationPrefillState({ loadResult: null })}
			/>
		);
		expect(screen.queryByTestId('step1-on-file-notice')).not.toBeInTheDocument();
		expect(screen.queryByTestId('step1-overwrite-warning')).not.toBeInTheDocument();
		expect(screen.getByTestId('step1-empty-notice')).toBeInTheDocument();
	});

	it('shows on-file copy for prior-cycle without overwrite warning', () => {
		render(
			<Harness
				prefillState={mapRegistrationPrefillState({
					loadResult: {
						isCurrentYear: false,
						isReturningPrefill: true,
						data: { household: { household_id: 'hh-1' } },
					},
				})}
			/>
		);
		expect(screen.getByTestId('step1-on-file-notice').textContent).toMatch(/on file/i);
		expect(screen.queryByTestId('step1-overwrite-warning')).not.toBeInTheDocument();
	});

	it('shows overwrite warning and on-file for current-cycle', () => {
		render(
			<Harness
				prefillState={mapRegistrationPrefillState({
					loadResult: {
						isCurrentYear: true,
						isReturningPrefill: false,
						data: { household: { household_id: 'hh-1' } },
					},
				})}
			/>
		);
		expect(screen.getByTestId('step1-on-file-notice')).toBeInTheDocument();
		expect(screen.getByTestId('step1-overwrite-warning').textContent).toMatch(/overwrite/i);
		expect(screen.getByTestId('step1-overwrite-warning').textContent).not.toMatch(
			/last year/i
		);
	});

	it('hides on-file for draft-only', () => {
		render(
			<Harness
				prefillState={mapRegistrationPrefillState({
					loadResult: null,
					hasDraftChildren: true,
				})}
			/>
		);
		expect(screen.queryByTestId('step1-on-file-notice')).not.toBeInTheDocument();
	});
});

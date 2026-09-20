import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Step3Children } from '@/components/gatherKids/registration-wizard/steps/step3-children';
import {
	NO_KNOWN_ALLERGIES,
	defaultChildValues,
	type RegistrationFormInput,
} from '@/components/gatherKids/registration-wizard/registration-schema';

/**
 * Mirrors RegisterWizard Step 3 CTA: parent watches form values so allergy
 * changes re-enable Save & continue without an unrelated parent render.
 */
function Step3WizardHarness({
	childrenDefaults,
}: {
	childrenDefaults: RegistrationFormInput['children'];
}) {
	const form = useForm<RegistrationFormInput>({
		defaultValues: {
			household: {
				address_line1: '1 Test St',
				city: 'Perth Amboy',
				state: 'NJ',
				zip: '08861',
			},
			guardians: [
				{
					first_name: 'Alex',
					last_name: 'Rivera',
					mobile_phone: '5551234567',
					relationship: 'Parent',
					is_primary: true,
				},
			],
			emergencyContact: {
				first_name: 'Sam',
				last_name: 'Lee',
				mobile_phone: '5559876543',
				relationship: 'Aunt',
			},
			children: childrenDefaults,
			consents: {
				liability: false,
				photoRelease: false,
				group_consents: {},
				custom_consents: {},
			},
		},
	});

	const watchedValues = form.watch();
	const canProceed =
		watchedValues.children.length > 0 &&
		watchedValues.children.every(
			(child) => (child.allergies ?? '').trim().length > 0
		);

	return (
		<Form {...form}>
			<form>
				<Step3Children form={form} blockedAt={0} />
				<Button type="button" disabled={!canProceed}>
					Save & continue
				</Button>
			</form>
		</Form>
	);
}

describe('Step 3 allergy CTA reactivity', () => {
	it('enables Save & continue immediately after No known allergies', async () => {
		const user = userEvent.setup();
		render(
			<Step3WizardHarness
				childrenDefaults={[
					{
						...defaultChildValues,
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						allergies: '',
					},
				]}
			/>
		);

		const cta = screen.getByRole('button', { name: /save & continue/i });
		expect(cta).toBeDisabled();

		await user.click(screen.getByRole('radio', { name: /no known allergies/i }));

		await waitFor(() => {
			expect(cta).toBeEnabled();
		});
	});

	it('stays disabled until every child has an allergy answer', async () => {
		const user = userEvent.setup();
		render(
			<Step3WizardHarness
				childrenDefaults={[
					{
						...defaultChildValues,
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						allergies: '',
					},
					{
						...defaultChildValues,
						first_name: 'Casey',
						last_name: 'Rivera',
						dob: '2017-08-20',
						grade: '1st',
						allergies: '',
					},
				]}
			/>
		);

		const cta = screen.getByRole('button', { name: /save & continue/i });
		expect(cta).toBeDisabled();

		await user.click(screen.getByRole('radio', { name: /no known allergies/i }));
		await waitFor(() => {
			expect(cta).toBeDisabled();
		});

		await user.click(screen.getByRole('button', { name: /^Next$/i }));
		await waitFor(() => {
			expect(screen.getByText(/Tell us about Casey/i)).toBeInTheDocument();
		});

		await user.click(screen.getByRole('radio', { name: /no known allergies/i }));

		await waitFor(() => {
			expect(cta).toBeEnabled();
		});
		expect(NO_KNOWN_ALLERGIES).toBe('none');
	});
});

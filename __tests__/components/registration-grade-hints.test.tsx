import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step3Children } from '@/components/gatherKids/registration-wizard/steps/step3-children';
import {
	defaultChildValues,
	registrationSchema,
} from '@/components/gatherKids/registration-wizard/registration-schema';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

/**
 * "Last year: 3rd Grade → Suggested this year: 4th Grade".
 *
 * The DAL has always built these hints; the wizard read only `prefillData.data`
 * and dropped them, so a returning family lost the one piece of context that
 * explains why the grade is already filled in.
 *
 * The other half of the rule is who must *not* see it: a current-cycle update
 * is this year's data and a first-time family has no last year, so claiming one
 * would be an invention.
 */

const gradeHints = {
	'c-amara': {
		lastYearLabel: '3rd Grade',
		suggestedLabel: '4th Grade',
		suggestedGrade: '4',
	},
	'c-kofi': {
		lastYearLabel: 'Kindergarten',
		suggestedLabel: '1st Grade',
		suggestedGrade: '1',
	},
};

function buildValues(
	children: RegistrationFormInput['children']
): RegistrationFormInput {
	return {
		household: {
			name: '',
			address_line1: '123 Main St',
			address_line2: '',
			city: 'Perth Amboy',
			state: 'NJ',
			zip: '08861',
			preferredScriptureTranslation: 'NIV',
		},
		guardians: [
			{
				first_name: 'Alex',
				last_name: 'Rivera',
				mobile_phone: '5551234567',
				email: '',
				relationship: 'Mother',
				is_primary: true,
			},
		],
		emergencyContact: {
			first_name: 'Sam',
			last_name: 'Lee',
			mobile_phone: '5559876543',
			relationship: 'Aunt',
		},
		children,
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
	};
}

const twoReturningChildren = [
	{
		...defaultChildValues,
		child_id: 'c-amara',
		first_name: 'Amara',
		last_name: 'Rivera',
		dob: '2015-04-02',
		grade: '4',
		allergies: 'None',
	},
	{
		...defaultChildValues,
		child_id: 'c-kofi',
		first_name: 'Kofi',
		last_name: 'Rivera',
		dob: '2019-06-11',
		grade: '1',
		allergies: 'None',
	},
] as RegistrationFormInput['children'];

function Harness({
	childValues,
	showGradeHints,
}: {
	childValues: RegistrationFormInput['children'];
	showGradeHints: boolean;
}) {
	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchema),
		defaultValues: buildValues(childValues),
	});

	return (
		<Form {...form}>
			<form>
				<Step3Children
					form={form}
					blockedAt={0}
					gradeHints={gradeHints}
					showGradeHints={showGradeHints}
				/>
			</form>
		</Form>
	);
}

describe('returning grade hints', () => {
	it('shows last year and the suggestion for a prior-cycle child', async () => {
		render(
			<Harness childValues={twoReturningChildren} showGradeHints={true} />
		);

		expect(
			screen.getByText(/Last year: 3rd Grade → Suggested this year: 4th Grade/)
		).toBeInTheDocument();
	});

	it('shows the hint for the child on screen, not every child', async () => {
		// One hint per child, and only the one being filled in. Showing both would
		// invite a parent to type Kofi's grade into Amara's field.
		const user = userEvent.setup();
		render(
			<Harness childValues={twoReturningChildren} showGradeHints={true} />
		);

		expect(screen.queryByText(/Kindergarten → Suggested/)).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /next/i }));

		expect(
			screen.getByText(/Last year: Kindergarten → Suggested this year: 1st Grade/)
		).toBeInTheDocument();
		expect(screen.queryByText(/3rd Grade →/)).not.toBeInTheDocument();
	});

	it('shows nothing for a current-cycle update', () => {
		// #401's distinction: this household already registered this year, so the
		// data on screen is this year's. There is no "last year" to report.
		render(
			<Harness childValues={twoReturningChildren} showGradeHints={false} />
		);

		expect(screen.queryByText(/Last year:/)).not.toBeInTheDocument();
	});

	it('shows nothing for a child added during this session', async () => {
		// No child_id, so no hint — a brand-new child has no history to draw on.
		const user = userEvent.setup();
		render(
			<Harness
				childValues={
					[
						...twoReturningChildren,
						{
							...defaultChildValues,
							first_name: 'New',
							last_name: 'Rivera',
							dob: '2020-01-01',
							grade: '',
							allergies: 'None',
						},
					] as RegistrationFormInput['children']
				}
				showGradeHints={true}
			/>
		);

		await user.click(screen.getByRole('button', { name: /next/i }));
		await user.click(screen.getByRole('button', { name: /next/i }));

		expect(screen.getByText('Child 3 of 3')).toBeInTheDocument();
		expect(screen.queryByText(/Last year:/)).not.toBeInTheDocument();
	});

	it('shows nothing when a returning child has no hint of their own', () => {
		// `buildGradeHintForChild` returns null for an unparseable stored grade.
		render(
			<Harness
				childValues={
					[
						{
							...twoReturningChildren[0],
							child_id: 'c-unknown',
						},
					] as RegistrationFormInput['children']
				}
				showGradeHints={true}
			/>
		);

		expect(screen.queryByText(/Last year:/)).not.toBeInTheDocument();
	});
});

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step2Guardians } from '@/components/gatherKids/registration-wizard/steps/step2-guardians';
import { Step3Children } from '@/components/gatherKids/registration-wizard/steps/step3-children';
import {
	defaultChildValues,
	registrationSchema,
} from '@/components/gatherKids/registration-wizard/registration-schema';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

/**
 * Steps 2 and 3 mount one entry at a time. Naming "Guardian 1" in the summary
 * and then focusing a control that is not on screen leaves the user with a
 * message and nothing to act on — which is the dead end #398 exists to remove.
 *
 * Raised in review on PR #465: the first version only opened the offending card
 * when no card was already open, so a user editing Guardian 2 while Guardian 1
 * was invalid got the message and a collapsed card.
 */

const validGuardian = {
	first_name: 'Alex',
	last_name: 'Rivera',
	mobile_phone: '5551234567',
	email: '',
	relationship: 'Mother',
	is_primary: true,
};

const validChild = {
	...defaultChildValues,
	first_name: 'Jordan',
	last_name: 'Rivera',
	dob: '2015-05-15',
	grade: '3rd',
	allergies: 'None',
};

function buildValues(
	overrides: Partial<RegistrationFormInput>
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
		guardians: [validGuardian],
		emergencyContact: {
			first_name: 'Sam',
			last_name: 'Lee',
			mobile_phone: '5559876543',
			relationship: 'Aunt',
		},
		children: [validChild],
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
		...overrides,
	};
}

/**
 * The wizard's refusal path, reduced to what these steps can see: validate, then
 * count the refusal. `handleNext` does the same and only advances when the step
 * owns nothing.
 */
function BlockHarness({
	defaultValues,
	step,
}: {
	defaultValues: RegistrationFormInput;
	step: 2 | 3;
}) {
	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchema),
		defaultValues,
	});
	const [blockedAt, setBlockedAt] = useState(0);

	return (
		<Form {...form}>
			<form>
				{step === 2 ? (
					<Step2Guardians form={form} blockedAt={blockedAt} />
				) : (
					<Step3Children form={form} blockedAt={blockedAt} />
				)}
				<button
					type="button"
					onClick={async () => {
						await form.trigger();
						setBlockedAt((count) => count + 1);
					}}>
					Save &amp; continue
				</button>
			</form>
		</Form>
	);
}

describe('Step2Guardians opens the guardian the summary names', () => {
	const values = buildValues({
		guardians: [
			{ ...validGuardian, first_name: '' },
			{ ...validGuardian, first_name: 'Rose', is_primary: false },
		],
	});

	it('switches away from the card the user has open', async () => {
		const user = userEvent.setup();
		render(<BlockHarness defaultValues={values} step={2} />);

		// The user is working on guardian 2 while guardian 1 is the invalid one.
		await user.click(screen.getAllByRole('button', { name: /^edit$/i })[1]);
		expect(
			document.querySelector('input[name="guardians.1.first_name"]')
		).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /save & continue/i }));

		// Guardian 1's field is now mounted, so it can show its message and take
		// focus. Before the review fix the card stayed collapsed.
		expect(
			document.querySelector('input[name="guardians.0.first_name"]')
		).toBeInTheDocument();
	});

	it('brings the user back on a second refusal naming the same guardian', async () => {
		const user = userEvent.setup();
		render(<BlockHarness defaultValues={values} step={2} />);

		await user.click(screen.getByRole('button', { name: /save & continue/i }));
		expect(
			document.querySelector('input[name="guardians.0.first_name"]')
		).toBeInTheDocument();

		// The user wanders off to guardian 2 without fixing guardian 1 and presses
		// Continue again. Keying this on the invalid index rather than on the
		// refusal would leave them stranded here.
		await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
		await user.click(screen.getByRole('button', { name: /save & continue/i }));

		expect(
			document.querySelector('input[name="guardians.0.first_name"]')
		).toBeInTheDocument();
	});

	it('leaves the cards alone when the step has nothing wrong', async () => {
		const user = userEvent.setup();
		render(
			<BlockHarness
				defaultValues={buildValues({ children: [] })}
				step={2}
			/>
		);

		// `children` is empty, so the form is invalid — but not on this step, and
		// a refusal elsewhere must not yank a guardian card open.
		await user.click(screen.getByRole('button', { name: /save & continue/i }));

		expect(
			document.querySelector('input[name="guardians.0.first_name"]')
		).not.toBeInTheDocument();
	});
});

describe('Step3Children switches to the child the summary names', () => {
	const values = buildValues({
		children: [{ ...validChild, dob: '' }, { ...validChild, first_name: 'Sky' }],
	});

	it('switches away from the child the user is looking at', async () => {
		const user = userEvent.setup();
		render(<BlockHarness defaultValues={values} step={3} />);

		await user.click(screen.getByRole('button', { name: /next/i }));
		expect(screen.getByText('Child 2 of 2')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /save & continue/i }));

		expect(screen.getByText('Child 1 of 2')).toBeInTheDocument();
	});

	it('brings the user back on a second refusal naming the same child', async () => {
		const user = userEvent.setup();
		render(<BlockHarness defaultValues={values} step={3} />);

		await user.click(screen.getByRole('button', { name: /save & continue/i }));
		expect(screen.getByText('Child 1 of 2')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /next/i }));
		await user.click(screen.getByRole('button', { name: /save & continue/i }));

		expect(screen.getByText('Child 1 of 2')).toBeInTheDocument();
	});
});

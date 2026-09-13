import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step3Children } from './step3-children';
import {
	NO_KNOWN_ALLERGIES,
	defaultChildValues,
	registrationSchema,
} from '../registration-schema';
import type { RegistrationFormInput } from '../registration-schema';

function buildDefaultValues(
	overrides?: Partial<RegistrationFormInput>
): RegistrationFormInput {
	return {
		household: {
			address_line1: '123 Main St',
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
		children: [
			{
				...defaultChildValues,
				first_name: 'Jordan',
				last_name: 'Rivera',
				dob: '2015-05-15',
				grade: '3rd',
				allergies: '',
			},
		],
		consents: {
			liability: false,
			photoRelease: false,
			group_consents: {},
			custom_consents: {},
		},
		...overrides,
	};
}

function Step3Harness({
	defaultValues,
	onReady,
}: {
	defaultValues: RegistrationFormInput;
	onReady?: (form: UseFormReturn<RegistrationFormInput>) => void;
}) {
	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchema),
		defaultValues,
		mode: 'onChange',
	});

	React.useEffect(() => {
		onReady?.(form);
	}, [form, onReady]);

	return (
		<Form {...form}>
			<form>
				<Step3Children form={form} />
			</form>
		</Form>
	);
}

describe('Step3Children allergies', () => {
	const renderStep3 = (
		defaultValues: RegistrationFormInput,
		onReady?: (form: UseFormReturn<RegistrationFormInput>) => void
	) => render(<Step3Harness defaultValues={defaultValues} onReady={onReady} />);

	it('hides allergy details until “has allergies” is selected', async () => {
		const user = userEvent.setup();
		renderStep3(buildDefaultValues());

		expect(
			screen.getByText('Leaders see this information during check-in.')
		).toBeInTheDocument();
		expect(screen.queryByLabelText('Allergy details')).not.toBeInTheDocument();

		await user.click(screen.getByRole('radio', { name: /this child has allergies/i }));

		expect(await screen.findByLabelText('Allergy details')).toBeInTheDocument();
	});

	it('stores the none sentinel when “No known allergies” is selected', async () => {
		const user = userEvent.setup();
		let formRef: UseFormReturn<RegistrationFormInput> | undefined;
		renderStep3(buildDefaultValues(), (form) => {
			formRef = form;
		});

		await user.click(screen.getByRole('radio', { name: /no known allergies/i }));

		await waitFor(() => {
			expect(formRef?.getValues('children.0.allergies')).toBe(NO_KNOWN_ALLERGIES);
		});
		expect(screen.queryByLabelText('Allergy details')).not.toBeInTheDocument();
	});

	it('preserves allergy details text and clears it when switching to none', async () => {
		const user = userEvent.setup();
		const details = 'Peanuts (anaphylaxis)';
		let formRef: UseFormReturn<RegistrationFormInput> | undefined;
		renderStep3(
			buildDefaultValues({
				children: [
					{
						...defaultChildValues,
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						allergies: details,
					},
				],
			}),
			(form) => {
				formRef = form;
			}
		);

		const detailsInput = await screen.findByLabelText('Allergy details');
		expect(detailsInput).toHaveValue(details);

		await user.clear(detailsInput);
		await user.type(detailsInput, 'Tree nuts');
		await waitFor(() => {
			expect(formRef?.getValues('children.0.allergies')).toBe('Tree nuts');
		});

		await user.click(screen.getByRole('radio', { name: /no known allergies/i }));
		await waitFor(() => {
			expect(formRef?.getValues('children.0.allergies')).toBe(NO_KNOWN_ALLERGIES);
		});
		expect(screen.queryByLabelText('Allergy details')).not.toBeInTheDocument();
	});

	it('lets each child answer allergies independently', async () => {
		const user = userEvent.setup();
		let formRef: UseFormReturn<RegistrationFormInput> | undefined;
		renderStep3(
			buildDefaultValues({
				children: [
					{
						...defaultChildValues,
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						allergies: NO_KNOWN_ALLERGIES,
					},
					{
						...defaultChildValues,
						first_name: 'Casey',
						last_name: 'Rivera',
						dob: '2017-08-20',
						grade: '1st',
						allergies: '',
					},
				],
			}),
			(form) => {
				formRef = form;
			}
		);

		expect(screen.getByRole('radio', { name: /no known allergies/i })).toBeChecked();

		await user.click(screen.getByRole('button', { name: /^Next$/i }));

		await waitFor(() => {
			expect(screen.getByText(/Tell us about Casey/i)).toBeInTheDocument();
		});

		await user.click(screen.getByRole('radio', { name: /this child has allergies/i }));
		const detailsInput = await screen.findByLabelText('Allergy details');
		await user.type(detailsInput, 'Dairy');

		await waitFor(() => {
			expect(formRef?.getValues('children.0.allergies')).toBe(NO_KNOWN_ALLERGIES);
			expect(formRef?.getValues('children.1.allergies')).toBe('Dairy');
		});

		await user.click(screen.getByRole('button', { name: /Previous/i }));
		await waitFor(() => {
			expect(screen.getByText(/Tell us about Jordan/i)).toBeInTheDocument();
		});
		expect(screen.getByRole('radio', { name: /no known allergies/i })).toBeChecked();
		expect(screen.queryByLabelText('Allergy details')).not.toBeInTheDocument();
	});

	it('exposes accessible allergy labels and check-in helper copy', () => {
		renderStep3(buildDefaultValues());

		expect(screen.getByText('Allergies *')).toBeInTheDocument();
		expect(
			screen.getByRole('radio', { name: /no known allergies/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('radio', { name: /this child has allergies/i })
		).toBeInTheDocument();

		const help = screen.getByText('Leaders see this information during check-in.');
		expect(help).toHaveAttribute('id', 'children-0-allergies-help');
		const radios = within(help.closest('div') ?? document.body).getAllByRole('radio');
		expect(radios.length).toBeGreaterThanOrEqual(2);
	});
});

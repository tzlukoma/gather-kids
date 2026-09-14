import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step5Consents } from './step5-consents';
import { registrationSchema } from '../registration-schema';
import type { RegistrationFormInput } from '../registration-schema';
import type { Ministry, MinistryGroup } from '@/lib/types';

jest.mock('@tanstack/react-query', () => ({
	useQuery: jest.fn(),
}));

import { useQuery } from '@tanstack/react-query';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const choirsGroup: MinistryGroup = {
	id: 'group-choirs',
	code: 'choirs',
	name: 'Choirs',
	custom_consent_required: true,
	custom_consent_text:
		'Cathedral International youth choirs communicate using the Planning Center app.',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

const teenChoir: Ministry = {
	ministry_id: 'min-teen-choir',
	name: 'Teen Choir',
	code: 'teen-choir',
	enrollment_type: 'enrolled',
	data_profile: 'Basic',
	is_active: true,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

const oratorsMinistry: Ministry = {
	ministry_id: 'min-orators',
	name: 'New Jersey Orators',
	code: 'orators',
	enrollment_type: 'expressed_interest',
	data_profile: 'Basic',
	is_active: true,
	optional_consent_text: 'I agree to the New Jersey Orators participation terms.',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

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
				first_name: 'Jordan',
				last_name: 'Rivera',
				dob: '2015-05-15',
				grade: '3rd',
				allergies: 'none',
				ministrySelections: {},
				interestSelections: {},
				customFields: {},
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

function Step5Harness({
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
				<Step5Consents form={form} />
			</form>
		</Form>
	);
}

describe('Step5Consents', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQuery.mockImplementation((options) => {
			const queryKey = options.queryKey as readonly unknown[];
			if (queryKey[0] === 'ministryGroups') {
				return { data: [choirsGroup], isLoading: false } as any;
			}
			if (queryKey[0] === 'ministries') {
				return { data: [teenChoir, oratorsMinistry], isLoading: false } as any;
			}
			if (queryKey[0] === 'ministriesByGroup') {
				return { data: [teenChoir], isLoading: false } as any;
			}
			return { data: [], isLoading: false } as any;
		});
	});

	const renderStep5 = (
		defaultValues: RegistrationFormInput,
		onReady?: (form: UseFormReturn<RegistrationFormInput>) => void
	) => render(<Step5Harness defaultValues={defaultValues} onReady={onReady} />);

	it('renders only base consents when no conditional selections are made', async () => {
		renderStep5(buildDefaultValues());

		await waitFor(() => {
			expect(screen.getByText(/liability release/i)).toBeInTheDocument();
			expect(screen.getByText(/photo release/i)).toBeInTheDocument();
		});

		expect(screen.queryByRole('heading', { name: 'Choirs' })).not.toBeInTheDocument();
		expect(screen.queryByText(/new jersey orators consent/i)).not.toBeInTheDocument();
	});

	it('renders Orators consent and validation when Orators is selected', async () => {
		const values = buildDefaultValues({
			children: [
				{
					...buildDefaultValues().children[0],
					interestSelections: { orators: true },
				},
			],
		});

		let formRef: UseFormReturn<RegistrationFormInput> | undefined;
		renderStep5(values, (form) => {
			formRef = form;
		});

		await waitFor(() => {
			expect(
				screen.getByRole('checkbox', { name: /new jersey orators consent/i })
			).toBeInTheDocument();
		});

		expect(formRef).toBeDefined();
		const validBeforeAcceptance = await formRef!.trigger();
		expect(validBeforeAcceptance).toBe(false);
		expect(await screen.findByText(/consent for this ministry is required/i)).toBeInTheDocument();
	});

	it('renders choir yes/no group consent when a choir program is selected', async () => {
		const values = buildDefaultValues({
			children: [
				{
					...buildDefaultValues().children[0],
					ministrySelections: { 'teen-choir': true },
				},
			],
			consents: {
				liability: true,
				photoRelease: true,
				group_consents: { choirs: 'yes' },
				custom_consents: {},
			},
		});

		renderStep5(values);

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Choirs' })).toBeInTheDocument();
		});

		expect(screen.getByRole('radio', { name: 'Yes' })).toBeChecked();
		expect(
			screen.getByText(/cathedral international youth choirs communicate/i)
		).toBeInTheDocument();
	});

	it('persists choir group consent value in form state', async () => {
		const user = userEvent.setup();
		const values = buildDefaultValues({
			children: [
				{
					...buildDefaultValues().children[0],
					ministrySelections: { 'teen-choir': true },
				},
			],
		});

		let formRef: UseFormReturn<RegistrationFormInput> | undefined;
		renderStep5(values, (form) => {
			formRef = form;
		});

		await waitFor(() => {
			expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('radio', { name: 'No' }));

		await waitFor(() => {
			expect(formRef?.getValues('consents.group_consents.choirs')).toBe('no');
		});
	});
});

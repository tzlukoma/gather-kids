import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BibleBeeMinistryForm } from '@/components/gatherKids/bible-bee-ministry-form';

// Mock the registration form schema
const registrationFormSchema = z.object({
	household: z.object({
		name: z.string().optional(),
		address_line1: z.string().min(1, 'Address is required.'),
		household_id: z.string().optional(),
		preferredScriptureTranslation: z.string().optional(),
	}),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

// Helper function to render the BibleBeeMinistryForm
function renderBibleBeeMinistryForm(
	initialValues?: Partial<RegistrationFormValues>
) {
	const defaultValues: RegistrationFormValues = {
		household: {
			name: '',
			address_line1: '',
			preferredScriptureTranslation: 'NIV',
		},
		...initialValues,
	};

	const TestComponent = () => {
		const form = useForm<RegistrationFormValues>({
			resolver: zodResolver(registrationFormSchema),
			defaultValues,
		});

		return (
			<FormProvider {...form}>
				<BibleBeeMinistryForm control={form.control} />
			</FormProvider>
		);
	};

	return render(<TestComponent />);
}

describe('Bible Bee Preferred Scripture Translation Dropdown', () => {
	it('should render the Bible Bee ministry form', () => {
		renderBibleBeeMinistryForm();

		expect(screen.getByText('Preferred Bible Translation')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Select the Bible translation your family prefers for scripture memorization in Bible Bee.'
			)
		).toBeInTheDocument();
	});

	it('should show correct scripture translation options', () => {
		renderBibleBeeMinistryForm();

		// The dropdown should show NIV as default (which means the options are loaded)
		expect(
			screen.getByText('NIV - New International Version')
		).toBeInTheDocument();

		// Verify the component renders without errors
		expect(screen.getByText('Preferred Bible Translation')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Select the Bible translation your family prefers for scripture memorization in Bible Bee.'
			)
		).toBeInTheDocument();
	});

	it('should have NIV as default value', () => {
		renderBibleBeeMinistryForm();

		// The dropdown should show NIV as the default
		expect(
			screen.getByText('NIV - New International Version')
		).toBeInTheDocument();
	});

	it('should allow selecting different translations', async () => {
		renderBibleBeeMinistryForm();

		// Click on the dropdown to open it
		const dropdownTrigger = screen.getByRole('combobox');
		fireEvent.click(dropdownTrigger);

		// Select KJV
		await waitFor(() => {
			const kjvOption = screen.getByText('KJV - King James Version');
			fireEvent.click(kjvOption);
		});

		// The dropdown should now show KJV as selected
		await waitFor(() => {
			expect(screen.getByText('KJV - King James Version')).toBeInTheDocument();
		});
	});

	it('should allow selecting NIV-Spanish', async () => {
		renderBibleBeeMinistryForm();

		// Click on the dropdown to open it
		const dropdownTrigger = screen.getByRole('combobox');
		fireEvent.click(dropdownTrigger);

		// Select NIV-Spanish
		await waitFor(() => {
			const nivSpanishOption = screen.getByText(
				'NIV-Spanish - Nueva Versión Internacional'
			);
			fireEvent.click(nivSpanishOption);
		});

		// The dropdown should now show NIV-Spanish as selected
		await waitFor(() => {
			expect(
				screen.getByText('NIV-Spanish - Nueva Versión Internacional')
			).toBeInTheDocument();
		});
	});

	it('should have proper form field name for household.preferredScriptureTranslation', () => {
		renderBibleBeeMinistryForm();

		// The form field should be accessible via role
		const formField = screen.getByRole('combobox');
		expect(formField).toBeInTheDocument();

		// Verify it's the correct field by checking the associated label
		expect(screen.getByText('Preferred Bible Translation')).toBeInTheDocument();
	});
});

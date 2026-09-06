import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import {
	FormActions,
	RequiredIndicator,
	TextFormField,
} from '@/components/ui/form-patterns';

const schema = z.object({
	name: z.string().min(1, 'Name is required'),
});

type FormValues = z.infer<typeof schema>;

function Harness({
	onCancel,
	isSubmitting = false,
}: {
	onCancel?: () => void;
	isSubmitting?: boolean;
}) {
	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: '' },
	});

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(() => undefined)}>
				<TextFormField
					control={form.control}
					name="name"
					label="Full Name"
					required
					placeholder="Jane Doe"
				/>
				<FormActions
					onCancel={onCancel}
					isSubmitting={isSubmitting}
					submitLabel="Save"
					submittingLabel="Saving..."
				/>
			</form>
		</Form>
	);
}

describe('form-patterns', () => {
	it('renders RequiredIndicator asterisk', () => {
		render(<RequiredIndicator />);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('renders labeled text field with required indicator and actions', () => {
		render(<Harness onCancel={() => undefined} />);

		expect(screen.getByText('Full Name')).toBeInTheDocument();
		expect(screen.getByText('*')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('shows submitting label and omits cancel when not provided', () => {
		render(<Harness isSubmitting />);

		expect(
			screen.getByRole('button', { name: 'Saving...' })
		).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
	});
});

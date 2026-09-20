import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RegistrationProblemSummary } from '@/components/gatherKids/registration-wizard/registration-problem-summary';
import type { StepProblem } from '@/components/gatherKids/registration-wizard/step-validation';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const problem = (
	path: string,
	message: string,
	step: StepProblem['step']
): StepProblem => ({ path, message, step });

describe('RegistrationProblemSummary', () => {
	it('renders nothing when there is nothing to say', () => {
		const { container } = render(
			<RegistrationProblemSummary problems={[]} currentStep={1} />
		);
		expect(container).toBeEmptyDOMElement();
	});

	it('names the field in words a parent would use, not the schema path', () => {
		render(
			<RegistrationProblemSummary
				problems={[
					problem('guardians.1.mobile_phone', 'A valid phone number is required.', 2),
				]}
				currentStep={2}
			/>
		);

		// One-based and plain: "Guardian 2", never "guardians.1.mobile_phone".
		expect(screen.getByText(/Guardian 2:/)).toBeInTheDocument();
		expect(
			screen.getByText(/A valid phone number is required\./)
		).toBeInTheDocument();
		expect(screen.queryByText(/guardians\.1/)).not.toBeInTheDocument();
	});

	it('counts the problems in the heading', () => {
		render(
			<RegistrationProblemSummary
				problems={[
					problem('household.zip', 'ZIP code is required.', 1),
					problem('consents.liability', 'Liability consent is required.', 5),
				]}
				currentStep={1}
			/>
		);
		expect(screen.getByText('2 things need your attention')).toBeInTheDocument();
	});

	it('uses the singular for one problem', () => {
		render(
			<RegistrationProblemSummary
				problems={[problem('household.city', 'City is required.', 1)]}
				currentStep={1}
			/>
		);
		expect(screen.getByText('One thing needs your attention')).toBeInTheDocument();
	});

	it('says which step a problem belongs to when it is not this one', () => {
		// The whole point: standing on step 5, the user is told the problem is
		// back on the household step rather than left to guess.
		render(
			<RegistrationProblemSummary
				problems={[problem('household.zip', 'ZIP code is required.', 1)]}
				currentStep={5}
			/>
		);
		expect(screen.getByText(/\(Confirm your household\)/)).toBeInTheDocument();
		expect(
			screen.getByText(/taken you back to Confirm your household/)
		).toBeInTheDocument();
	});

	it('does not label the step when the problem is on the current one', () => {
		render(
			<RegistrationProblemSummary
				problems={[problem('household.zip', 'ZIP code is required.', 1)]}
				currentStep={1}
			/>
		);
		expect(screen.queryByText(/taken you back to/)).not.toBeInTheDocument();
	});

	it('shows a step rule that has no schema equivalent', () => {
		render(
			<RegistrationProblemSummary
				problems={[]}
				blockMessage="Two ministries ask the same question."
				currentStep={4}
			/>
		);
		expect(
			screen.getByText('Two ministries ask the same question.')
		).toBeInTheDocument();
		expect(
			screen.getByText('Check this step before continuing')
		).toBeInTheDocument();
	});

	it('is announced, and stays on screen rather than passing like a toast', () => {
		render(
			<RegistrationProblemSummary
				problems={[problem('household.city', 'City is required.', 1)]}
				currentStep={1}
			/>
		);
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});
});

/**
 * The per-field half of the story: a message the summary points at has to be
 * tied to its own input, or a screen-reader user hears the count and never the
 * field.
 */
describe('field-level error accessibility', () => {
	function FieldHarness() {
		const form = useForm({
			resolver: zodResolver(
				z.object({ city: z.string().min(1, 'City is required.') })
			),
			defaultValues: { city: '' },
			mode: 'onChange',
		});
		// Apply the error the way a blocked step does — after mount, not during
		// render, which would re-enter setState forever.
		useEffect(() => {
			void form.trigger();
		}, [form]);

		return (
			<Form {...form}>
				<FormField
					control={form.control}
					name="city"
					render={({ field }) => (
						<FormItem>
							<FormLabel>City</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</Form>
		);
	}

	it('points the input at its own error text and marks it invalid', async () => {
		render(<FieldHarness />);

		const message = await screen.findByText('City is required.');
		const input = screen.getByLabelText('City');

		await waitFor(() =>
			expect(input).toHaveAttribute('aria-invalid', 'true')
		);
		expect(message.id).toBeTruthy();
		expect(input.getAttribute('aria-describedby')).toContain(message.id);
	});
});

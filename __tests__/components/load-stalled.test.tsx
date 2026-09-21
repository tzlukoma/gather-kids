import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoadStalled } from '@/components/ui/load-stalled';

describe('LoadStalled', () => {
	it('defaults to the slow tone, which does not claim a failure', () => {
		render(<LoadStalled />);
		const el = screen.getByTestId('load-stalled');
		expect(el).toHaveAttribute('data-tone', 'slow');
		expect(screen.getByText(/still loading/i)).toBeInTheDocument();
		expect(screen.queryByText(/didn’t load|went wrong/i)).not.toBeInTheDocument();
	});

	it('marks an error distinctly from a slow load', () => {
		render(<LoadStalled tone="error" />);
		const el = screen.getByTestId('load-stalled');
		expect(el).toHaveAttribute('data-tone', 'error');
		expect(screen.getByText(/didn’t load/i)).toBeInTheDocument();
	});

	it('announces itself to assistive technology', () => {
		render(<LoadStalled />);
		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it('offers no retry control when there is nothing to retry', () => {
		render(<LoadStalled />);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('calls back when retried', async () => {
		const onRetry = jest.fn();
		render(<LoadStalled onRetry={onRetry} />);
		await userEvent.click(screen.getByRole('button', { name: /try again/i }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('uses the caller’s wording when given', () => {
		render(
			<LoadStalled
				tone="error"
				title="Today’s roster didn’t load"
				description="The CSV export below still works."
			/>
		);
		expect(screen.getByText('Today’s roster didn’t load')).toBeInTheDocument();
		expect(
			screen.getByText('The CSV export below still works.')
		).toBeInTheDocument();
	});
});

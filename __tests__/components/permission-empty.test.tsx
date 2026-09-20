/**
 * @jest-environment jsdom
 */

/**
 * #374 — the honest empty state.
 *
 * The whole reason this component exists is that "nothing here" and "you are
 * not allowed to see what is here" look identical to a reader and mean
 * opposite things. A ministry leader with no assignment sees an empty roster
 * either way; only one of those is a reason to go and ask someone for access.
 * These tests hold that distinction in place, since a future tidy-up that
 * collapses the two reasons into one would still render something plausible.
 */

import { render, screen } from '@testing-library/react';
import { PermissionEmpty } from '@/components/ui/permission-empty';

describe('PermissionEmpty', () => {
	it('defaults to the plain empty reason', () => {
		render(<PermissionEmpty title="No children match the current filter." />);

		expect(screen.getByTestId('permission-empty')).toHaveAttribute(
			'data-reason',
			'empty'
		);
	});

	it('marks a restricted state distinctly from an empty one', () => {
		render(
			<PermissionEmpty
				reason="restricted"
				title="No ministry assigned"
				description="Your account is not associated with any active ministry."
				remedy="An administrator can assign you to a ministry."
			/>
		);

		expect(screen.getByTestId('permission-empty')).toHaveAttribute(
			'data-reason',
			'restricted'
		);
		expect(
			screen.getByText('An administrator can assign you to a ministry.')
		).toBeInTheDocument();
	});

	it('suppresses the remedy on a plain empty list', () => {
		// "Ask your administrator" is actively misleading on a list that simply
		// has no rows — there is nothing for an administrator to grant.
		render(
			<PermissionEmpty
				title="No leader profiles found."
				remedy="An administrator can assign you to a ministry."
			/>
		);

		expect(
			screen.queryByText('An administrator can assign you to a ministry.')
		).not.toBeInTheDocument();
	});

	it('announces itself to assistive technology', () => {
		render(<PermissionEmpty title="No ministry assigned" />);
		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it('renders an action when one is given', () => {
		render(
			<PermissionEmpty
				reason="restricted"
				title="No ministry assigned"
				action={<button type="button">Refresh page</button>}
			/>
		);
		expect(
			screen.getByRole('button', { name: 'Refresh page' })
		).toBeInTheDocument();
	});
});

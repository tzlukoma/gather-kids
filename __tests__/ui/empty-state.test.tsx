import React from 'react';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
	it('renders title and default inbox icon', () => {
		const { container } = render(<EmptyState title="No children found." />);

		expect(screen.getByRole('status')).toBeInTheDocument();
		expect(screen.getByText('No children found.')).toBeInTheDocument();
		expect(container.querySelector('svg')).toBeTruthy();
	});

	it('renders optional description and action', () => {
		render(
			<EmptyState
				icon={Users}
				title="No users found"
				description="Invite a teammate to get started."
				action={<button type="button">Invite user</button>}
			/>
		);

		expect(screen.getByText('No users found')).toBeInTheDocument();
		expect(
			screen.getByText('Invite a teammate to get started.')
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Invite user' })
		).toBeInTheDocument();
	});

	it('omits description and action when not provided', () => {
		render(<EmptyState title="Nothing here" />);

		expect(screen.getByText('Nothing here')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});

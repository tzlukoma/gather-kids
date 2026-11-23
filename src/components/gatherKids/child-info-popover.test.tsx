import { render, screen } from '@testing-library/react';
import { ChildInfoPopoverContent } from './child-info-popover';
import type { EnrichedChild } from './check-in-view';

function makeChild(overrides: Partial<EnrichedChild> = {}): EnrichedChild {
	return {
		child_id: 'child_1',
		household_id: 'hh_1',
		first_name: 'Jordan',
		last_name: 'Smith',
		dob: '2010-05-15',
		grade: '5',
		child_mobile: '5551234567',
		allergies: 'none',
		medical_notes: '',
		special_needs: false,
		is_active: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		activeAttendance: null,
		guardians: [
			{
				guardian_id: 'g1',
				household_id: 'hh_1',
				first_name: 'Alex',
				last_name: 'Smith',
				mobile_phone: '5559876543',
				relationship: 'Parent',
				is_primary: true,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
			},
		],
		household: null,
		emergencyContact: {
			contact_id: 'ec1',
			household_id: 'hh_1',
			first_name: 'Taylor',
			last_name: 'Doe',
			mobile_phone: '5555555555',
			relationship: 'Aunt',
		},
		incidents: [],
		age: 14,
		...overrides,
	};
}

describe('ChildInfoPopoverContent', () => {
	it('renders self-checkout, guardians, and emergency contact in order for ChildCard-style usage', () => {
		const { container } = render(<ChildInfoPopoverContent child={makeChild()} />);
		const text = container.textContent ?? '';

		expect(screen.getByText('Self-Checkout Allowed')).toBeInTheDocument();
		expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
		expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();

		expect(screen.getByText('Guardians')).toBeInTheDocument();
		expect(screen.getByText('Alex Smith (Parent)')).toBeInTheDocument();
		expect(screen.getByText('(555) 987-6543')).toBeInTheDocument();

		expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
		expect(screen.getByText('Taylor Doe (Aunt)')).toBeInTheDocument();
		expect(screen.getByText('(555) 555-5555')).toBeInTheDocument();

		const selfCheckoutIndex = text.indexOf('Self-Checkout Allowed');
		const guardiansIndex = text.indexOf('Guardians');
		const emergencyIndex = text.indexOf('Emergency Contact');
		expect(selfCheckoutIndex).toBeLessThan(guardiansIndex);
		expect(guardiansIndex).toBeLessThan(emergencyIndex);
	});

	it('hides self-checkout name and keeps extra separators for door-style usage', () => {
		render(
			<ChildInfoPopoverContent
				child={makeChild()}
				showSelfCheckoutName={false}
				showSeparators="all"
			/>
		);

		expect(screen.getByText('Self-Checkout Allowed')).toBeInTheDocument();
		expect(screen.queryByText('Jordan Smith')).not.toBeInTheDocument();
		expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
	});

	it('shows exact empty-state copy when guardians and emergency contact are missing', () => {
		render(
			<ChildInfoPopoverContent
				child={makeChild({
					guardians: [],
					emergencyContact: null,
					age: 8,
					child_mobile: undefined,
				})}
			/>
		);

		expect(screen.queryByText('Self-Checkout Allowed')).not.toBeInTheDocument();
		expect(
			screen.getByText('No guardian information available.')
		).toBeInTheDocument();
		expect(
			screen.getByText('No emergency contact available.')
		).toBeInTheDocument();
	});
});

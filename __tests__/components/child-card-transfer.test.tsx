import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChildCard } from '@/components/gatherKids/child-card';
import type { EnrichedChild } from '@/components/gatherKids/check-in-view';

/**
 * The legacy door card's Transfer action (#561). The dialog and the transfer
 * itself are shared with the GatherSystem door and covered there.
 */
function child(eventId: string | null): EnrichedChild {
	return {
		child_id: 'c-1',
		household_id: 'hh-1',
		first_name: 'Jordan',
		last_name: 'Kim',
		grade: '5th',
		is_active: true,
		activeAttendance: eventId
			? ({
					attendance_id: 'att-1',
					child_id: 'c-1',
					event_id: eventId,
					date: '2026-09-13',
				} as EnrichedChild['activeAttendance'])
			: null,
		guardians: [],
		household: null,
		emergencyContact: null,
		incidents: [],
		age: 10,
	} as unknown as EnrichedChild;
}

function renderCard(props: Partial<React.ComponentProps<typeof ChildCard>>) {
	return render(
		<ChildCard
			child={child('evt_sunday_school')}
			selectedEvent="evt_sunday_school"
			onCheckIn={jest.fn()}
			onCheckout={jest.fn()}
			onViewIncidents={jest.fn()}
			onUpdatePhoto={jest.fn()}
			onViewPhoto={jest.fn()}
			{...props}
		/>
	);
}

const transferButton = () =>
	screen.queryByRole('button', { name: 'Transfer Jordan Kim to another event' });

describe('ChildCard transfer', () => {
	it('offers Transfer on a child checked in to this event, alongside Check Out', () => {
		const onTransfer = jest.fn();
		renderCard({ onTransfer });

		fireEvent.click(transferButton()!);
		expect(onTransfer).toHaveBeenCalledWith(
			expect.objectContaining({ child_id: 'c-1' })
		);
		expect(screen.getByRole('button', { name: 'Check Out' })).toBeInTheDocument();
	});

	it('is hidden when the screen does not offer it (roles that cannot move a child)', () => {
		renderCard({ onTransfer: undefined });
		expect(transferButton()).not.toBeInTheDocument();
	});

	it('is not offered for a child at another event or not on site', () => {
		const { unmount } = renderCard({
			onTransfer: jest.fn(),
			child: child('evt_childrens_church'),
		});
		expect(transferButton()).not.toBeInTheDocument();
		unmount();

		renderCard({ onTransfer: jest.fn(), child: child(null) });
		expect(transferButton()).not.toBeInTheDocument();
	});
});

describe('ChildCard status on Rosters (#566)', () => {
	const nameOf = (id: string | null | undefined) =>
		({ evt_sunday_school: 'Sunday School', evt_childrens_church: 'Kids Church' } as Record<string, string>)[id ?? ''] ?? '';

	it('names the event for a child in the roster\'s own event when asked to', () => {
		renderCard({ alwaysNameEvent: true, eventName: nameOf });
		expect(screen.getByText('In Sunday School')).toBeInTheDocument();
		expect(screen.queryByText('Checked In')).not.toBeInTheDocument();
	});

	it('names the event for a child in another event the same way', () => {
		renderCard({ alwaysNameEvent: true, eventName: nameOf, child: child('evt_childrens_church') });
		// The same wording as the door's, but one badge, in the checked-in style.
		expect(screen.getAllByText('In Kids Church')).toHaveLength(1);
		expect(screen.getByText('In Kids Church').closest('.bg-brand-aqua')).not.toBeNull();
	});

	it('keeps the check-in door wording when not asked to', () => {
		renderCard({ eventName: nameOf });
		expect(screen.getByText('Checked In')).toBeInTheDocument();
		renderCard({ eventName: nameOf, child: child('evt_childrens_church') });
		expect(screen.getByText('In Kids Church')).toBeInTheDocument();
	});

	it('leaves a child who is not on site unchanged', () => {
		renderCard({ alwaysNameEvent: true, eventName: nameOf, child: child(null) });
		expect(screen.getByText('Checked Out')).toBeInTheDocument();
	});
});

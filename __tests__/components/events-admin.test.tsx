import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

/**
 * The admin Events screen (#565). The database rules it relies on are
 * exercised by `scripts/db/check_event_management.sql`; this covers what the
 * screen offers, what it sends, and what it says when a write is refused.
 */

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/components/gatherKids/gathersystem-shell-context', () => ({
	useGatherSystemShell: () => false,
}));

type Ev = { id: string; name: string; archived?: boolean };
let mockEvents: Ev[] = [];
let mockUsage: Record<string, { attendanceCount: number; onSiteCount: number }> | undefined;
let mockEventsState = { isLoading: false, isError: false, isPersisted: true };
const mockCreate = jest.fn();
const mockRename = jest.fn();
const mockArchive = jest.fn();
const mockDelete = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@/hooks/data', () => ({
	useCheckInEvents: () => ({
		events: mockEvents.filter((e) => !e.archived),
		allEvents: mockEvents,
		nameOf: (id: string) => mockEvents.find((e) => e.id === id)?.name ?? id,
		refetch: mockRefetch,
		...mockEventsState,
	}),
	useEventUsage: () => ({ data: mockUsage, isError: false }),
	useCreateCheckInEvent: () => ({ mutateAsync: mockCreate, isPending: false }),
	useRenameCheckInEvent: () => ({ mutateAsync: mockRename, isPending: false }),
	useSetCheckInEventArchived: () => ({ mutateAsync: mockArchive, isPending: false }),
	useDeleteCheckInEvent: () => ({ mutateAsync: mockDelete, isPending: false }),
}));

import { EventsAdmin } from '@/components/gatherKids/events-admin';

const rowFor = (name: string) =>
	screen.getByText(name, { selector: 'td > span' }).closest('tr') as HTMLElement;

describe('EventsAdmin', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEventsState = { isLoading: false, isError: false, isPersisted: true };
		mockEvents = [
			{ id: 'evt_sunday_school', name: 'Sunday School' },
			{ id: 'evt_empty', name: 'New Event' },
			{ id: 'evt_old', name: 'Old Event', archived: true },
		];
		mockUsage = {
			evt_sunday_school: { attendanceCount: 42, onSiteCount: 3 },
			evt_empty: { attendanceCount: 0, onSiteCount: 0 },
			evt_old: { attendanceCount: 5, onSiteCount: 0 },
		};
	});

	it('lists active events before archived ones, with status and history', () => {
		render(<EventsAdmin />);
		const names = screen
			.getAllByRole('row')
			.slice(1)
			.map((r) => within(r).getAllByRole('cell')[0].querySelector('span')?.textContent);
		expect(names).toEqual(['Sunday School', 'New Event', 'Old Event']);
		// Shown in its own column on wide screens and under the name on phones.
		expect(within(rowFor('Sunday School')).getAllByText('42 records · 3 on site now')).toHaveLength(2);
		expect(within(rowFor('New Event')).getAllByText('No attendance yet')).toHaveLength(2);
		expect(within(rowFor('Old Event')).getAllByText('Archived')).toHaveLength(2);
		expect(within(rowFor('Old Event')).getByRole('button', { name: 'Restore Old Event' })).toBeInTheDocument();
	});

	it('adds an event, refusing a blank name first', async () => {
		mockCreate.mockResolvedValue({ id: 'evt_joy_bells', name: 'Joy Bells' });
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Add event' }));

		const dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Add event' }));
		expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a name for the event.');
		expect(mockCreate).not.toHaveBeenCalled();

		fireEvent.change(within(dialog).getByLabelText('Event name'), { target: { value: 'Joy Bells' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Add event' }));

		await waitFor(() =>
			expect(mockCreate).toHaveBeenCalledWith({ name: 'Joy Bells', existing: mockEvents })
		);
		await waitFor(() =>
			expect(mockToast).toHaveBeenCalledWith({ title: 'Event added', description: 'Joy Bells is ready for check-in.' })
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('refuses a duplicate name, pointing at the archived event to restore', () => {
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
		const dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByLabelText('Event name'), { target: { value: 'old event' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Add event' }));
		expect(within(dialog).getByRole('alert')).toHaveTextContent(/archived event.*Restore it instead/);
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('renames an event and keeps the dialog open with the reason when the save fails', async () => {
		mockRename.mockRejectedValueOnce(new Error('Only admins can manage events.'));
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Rename Sunday School' }));

		const dialog = screen.getByRole('dialog');
		const input = within(dialog).getByLabelText('Event name');
		expect(input).toHaveValue('Sunday School');
		fireEvent.change(input, { target: { value: 'Sunday Bible Class' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Save name' }));

		expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only admins can manage events.');
		expect(mockRename).toHaveBeenCalledWith({
			eventId: 'evt_sunday_school',
			name: 'Sunday Bible Class',
			existing: mockEvents,
		});
	});

	it('offers Archive instead of Delete for an event with history', async () => {
		mockArchive.mockResolvedValue(undefined);
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete Sunday School' }));

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Sunday School can’t be deleted')).toBeInTheDocument();
		expect(within(dialog).getByText(/42 attendance records/)).toBeInTheDocument();
		expect(within(dialog).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();

		fireEvent.click(within(dialog).getByRole('button', { name: 'Archive instead' }));
		await waitFor(() =>
			expect(mockArchive).toHaveBeenCalledWith({ eventId: 'evt_sunday_school', archived: true })
		);
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it('deletes an event with no history after confirming', async () => {
		mockDelete.mockResolvedValue(undefined);
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete New Event' }));

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Delete New Event?')).toBeInTheDocument();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Delete event' }));

		await waitFor(() => expect(mockDelete).toHaveBeenCalledWith({ eventId: 'evt_empty' }));
		await waitFor(() =>
			expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Event deleted' }))
		);
	});

	it('switches to "archive instead" if a check-in landed before the delete', async () => {
		mockDelete.mockRejectedValue(
			Object.assign(
				new Error('This event has attendance history, so it cannot be deleted. Archive it instead.'),
				{ reason: 'has_history' }
			)
		);
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete New Event' }));
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete event' }));

		const dialog = await screen.findByText('New Event can’t be deleted');
		expect(dialog).toBeInTheDocument();
		expect(screen.getByRole('alert')).toHaveTextContent(/cannot be deleted\. Archive it instead/);
		expect(screen.getByRole('button', { name: 'Archive instead' })).toBeInTheDocument();
	});

	it('warns before archiving an event that has children on site', () => {
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Archive Sunday School' }));
		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText(/3 children are checked in there now/)).toBeInTheDocument();
		expect(within(dialog).getByText(/still check them out or transfer them/)).toBeInTheDocument();
	});

	it('restores an archived event', async () => {
		mockArchive.mockResolvedValue(undefined);
		render(<EventsAdmin />);
		fireEvent.click(screen.getByRole('button', { name: 'Restore Old Event' }));
		await waitFor(() =>
			expect(mockArchive).toHaveBeenCalledWith({ eventId: 'evt_old', archived: false })
		);
	});

	it('does not offer Delete until it knows whether an event has history', () => {
		mockUsage = undefined;
		render(<EventsAdmin />);
		expect(screen.getByRole('button', { name: 'Delete New Event' })).toBeDisabled();
	});

	it('refuses to show a list it could not load', () => {
		mockEventsState = { isLoading: false, isError: true, isPersisted: false };
		render(<EventsAdmin />);
		expect(screen.getByText('Events didn’t load')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Add event' })).not.toBeInTheDocument();
	});
});

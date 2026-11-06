/**
 * @jest-environment jsdom
 */

import React, { ReactNode } from 'react';
import { renderHook, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.unmock('@tanstack/react-query');

/**
 * Review on #567: a successful, empty answer from `events` is real data. The
 * real `useCheckInEvents` must report it as persisted (no compiled-in
 * fallback), and the Events screen built on it must let an admin add an event
 * — including straight after deleting the last one.
 */

const mockGetCheckInEvents = jest.fn();
const mockGetEventUsage = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/dal', () => ({
	getCheckInEvents: (...a: unknown[]) => mockGetCheckInEvents(...a),
	getEventUsage: (...a: unknown[]) => mockGetEventUsage(...a),
	createCheckInEvent: (...a: unknown[]) => mockCreate(...a),
	deleteCheckInEvent: (...a: unknown[]) => mockDelete(...a),
	renameCheckInEvent: jest.fn(),
	setCheckInEventArchived: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/components/gatherKids/gathersystem-shell-context', () => ({
	useGatherSystemShell: () => false,
}));

import { useCheckInEvents } from '@/hooks/data/events';
import { EventsAdmin } from '@/components/gatherKids/events-admin';

function wrapperFor() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	function QueryWrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	}
	return QueryWrapper;
}

describe('useCheckInEvents', () => {
	beforeEach(() => jest.clearAllMocks());

	it('treats a successful empty list as persisted, with no fallback events', async () => {
		mockGetCheckInEvents.mockResolvedValue([]);
		const { result } = renderHook(() => useCheckInEvents(), { wrapper: wrapperFor() });

		await waitFor(() => expect(result.current.isPersisted).toBe(true));
		expect(result.current.events).toEqual([]);
		expect(result.current.allEvents).toEqual([]);
		expect(result.current.isError).toBe(false);
	});

	it('uses the compiled-in events only while loading or after a failed read', async () => {
		mockGetCheckInEvents.mockRejectedValue(new Error('offline'));
		const { result } = renderHook(() => useCheckInEvents(), { wrapper: wrapperFor() });

		expect(result.current.isPersisted).toBe(false);
		expect(result.current.events.map((e) => e.id)).toContain('evt_sunday_school');
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isPersisted).toBe(false);
		expect(result.current.events).toHaveLength(3);
	});
});

describe('EventsAdmin on the real hooks', () => {
	beforeEach(() => jest.clearAllMocks());

	it('offers Add event on an empty installation', async () => {
		mockGetCheckInEvents.mockResolvedValue([]);
		mockGetEventUsage.mockResolvedValue({});
		const Wrapper = wrapperFor();
		render(<EventsAdmin />, { wrapper: Wrapper });

		expect(
			await screen.findByText('No check-in events yet. Add one to start checking children in.')
		).toBeInTheDocument();
		expect(screen.queryByText('Events didn’t load')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add event' })).toBeEnabled();
	});

	it('lets an admin delete the last event and then add a new one', async () => {
		let events = [{ id: 'evt_only', name: 'Only Event', archived: false }];
		mockGetCheckInEvents.mockImplementation(async () => events);
		mockGetEventUsage.mockResolvedValue({ evt_only: { attendanceCount: 0, onSiteCount: 0 } });
		mockDelete.mockImplementation(async () => {
			events = [];
		});
		mockCreate.mockImplementation(async (name: string) => {
			const created = { id: 'evt_joy_bells', name, archived: false };
			events = [created];
			return created;
		});
		render(<EventsAdmin />, { wrapper: wrapperFor() });

		const deleteButton = await screen.findByRole('button', { name: 'Delete Only Event' });
		// Enabled once usage confirms the event has no history.
		await waitFor(() => expect(deleteButton).toBeEnabled());
		fireEvent.click(deleteButton);
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete event' }));

		// The list refetches empty: an empty state, not a load error.
		expect(
			await screen.findByText('No check-in events yet. Add one to start checking children in.')
		).toBeInTheDocument();
		expect(screen.queryByText('Events didn’t load')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
		const dialog = await screen.findByRole('dialog');
		fireEvent.change(within(dialog).getByLabelText('Event name'), { target: { value: 'Joy Bells' } });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Add event' }));

		await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Joy Bells', []));
		expect(await screen.findByText('Joy Bells', { selector: 'td > span' })).toBeInTheDocument();
	});
});

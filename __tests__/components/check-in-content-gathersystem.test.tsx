import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * The GatherSystem door screen behind `gathersystem_door`.
 *
 * Radix Tabs and Select cannot be driven in this repo's jsdom setup, so the
 * stats arithmetic, the status-tab predicate and the per-row status derivation
 * are unit-tested directly in `__tests__/lib/door-check-in.test.ts`. What is
 * covered here is the wiring that a pure-logic test cannot reach: that the
 * screen performs a real check-out through `useCheckOutMutation` with the same
 * argument shape as the legacy `check-in-view.tsx`, and that the roster table,
 * the stats cards and the header actions render.
 */

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

let searchParams = new URLSearchParams('');
jest.mock('next/navigation', () => ({
	useSearchParams: () => searchParams,
}));

jest.mock('@/lib/dal', () => ({
	getTodayIsoDate: () => '2026-09-13',
}));

const mockCaptureAnalyticsEvent = jest.fn();
jest.mock('@/lib/analytics/browser', () => ({
	captureAnalyticsEvent: (...args: unknown[]) => mockCaptureAnalyticsEvent(...args),
}));

const mockCheckIn = jest.fn();
const mockCheckOut = jest.fn();
const mockUseCheckOutMutation = jest.fn(() => ({ mutateAsync: mockCheckOut }));
const mockChildren = jest.fn();
const mockAttendance = jest.fn();
const mockIncidents = jest.fn();
const mockGuardians = jest.fn();
const mockHouseholds = jest.fn();
const mockEmergencyContacts = jest.fn();

jest.mock('@/hooks/data', () => ({
	useChildrenForActiveCycle: () => mockChildren(),
	useAttendance: () => mockAttendance(),
	useIncidents: () => mockIncidents(),
	useGuardians: () => mockGuardians(),
	useHouseholds: () => mockHouseholds(),
	useEmergencyContacts: () => mockEmergencyContacts(),
	useCheckInMutation: () => ({ mutateAsync: mockCheckIn }),
	useCheckOutMutation: () => mockUseCheckOutMutation(),
}));

import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

const onSiteChild = {
	child_id: 'child-on-site',
	household_id: 'hh-kim',
	first_name: 'Jordan',
	last_name: 'Kim',
	grade: '5th',
	is_active: true,
};

const waitingChild = {
	child_id: 'child-waiting',
	household_id: 'hh-bennett',
	first_name: 'Amara',
	last_name: 'Bennett',
	grade: '1st',
	is_active: true,
};

const openAttendance = {
	attendance_id: 'att-jordan',
	child_id: 'child-on-site',
	event_id: 'evt_sunday_school',
	date: '2026-09-13',
	check_in_at: '2026-09-13T14:04:00.000Z',
};

function setup({
	children = [onSiteChild, waitingChild],
	attendance = [openAttendance],
	incidents = [] as unknown[],
	childrenError = null as unknown,
} = {}) {
	mockChildren.mockReturnValue({
		data: children,
		isLoading: false,
		error: childrenError,
	});
	mockAttendance.mockReturnValue({
		data: attendance,
		isLoading: false,
		error: null,
	});
	mockIncidents.mockReturnValue({ data: incidents, isLoading: false });
	mockGuardians.mockReturnValue({
		data: [
			{
				guardian_id: 'g-1',
				household_id: 'hh-kim',
				first_name: 'Grace',
				last_name: 'Kim',
				mobile_phone: '555-123-4567',
			},
		],
	});
	mockHouseholds.mockReturnValue({
		data: [
			{ household_id: 'hh-kim', name: 'Kim' },
			{ household_id: 'hh-bennett', name: 'Bennett' },
		],
	});
	mockEmergencyContacts.mockReturnValue({ data: [] });
}

function rowFor(name: string) {
	return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('CheckInContentGatherSystem', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		searchParams = new URLSearchParams('');
		mockUseCheckOutMutation.mockReturnValue({ mutateAsync: mockCheckOut });
		setup();
	});

	describe('check-out (feature-parity restoration)', () => {
		it('wires useCheckOutMutation', () => {
			render(<CheckInContentGatherSystem />);
			expect(mockUseCheckOutMutation).toHaveBeenCalled();
		});

		it('offers Check out only for children currently on site', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				within(rowFor('Jordan Kim')).getByRole('button', { name: 'Check out' })
			).toBeInTheDocument();
			expect(
				within(rowFor('Amara Bennett')).queryByRole('button', {
					name: 'Check out',
				})
			).not.toBeInTheDocument();
			expect(
				within(rowFor('Amara Bennett')).getByRole('button', { name: 'Check in' })
			).toBeInTheDocument();
		});

		it('checks a child out through the verified dialog with the legacy argument shape', async () => {
			mockCheckOut.mockResolvedValue(undefined);
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', { name: 'Check out' })
			);

			const dialog = screen.getByRole('dialog');
			fireEvent.change(within(dialog).getByLabelText('Phone Last 4'), {
				target: { value: '4567' },
			});
			fireEvent.click(
				within(dialog).getByRole('button', { name: 'Verify & Check Out' })
			);

			await waitFor(() =>
				expect(mockCheckOut).toHaveBeenCalledWith({
					attendanceId: 'att-jordan',
					verifier: {
						method: 'PIN',
						value: '4567',
						pickedUpBy: 'Grace Kim',
					},
				})
			);
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Checked Out' })
				)
			);
			expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(
				'child_checked_out',
				{ check_in_event: 'evt_sunday_school' }
			);
		});

		it('surfaces a failed check-out instead of silently swallowing it', async () => {
			jest.spyOn(console, 'error').mockImplementation(() => {});
			mockCheckOut.mockRejectedValue(new Error('network down'));
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', { name: 'Check out' })
			);
			const dialog = screen.getByRole('dialog');
			fireEvent.change(within(dialog).getByLabelText('Phone Last 4'), {
				target: { value: '4567' },
			});
			fireEvent.click(
				within(dialog).getByRole('button', { name: 'Verify & Check Out' })
			);

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Check-out Failed',
						description: 'network down',
					})
				)
			);
		});

		it('does not check anyone out on a failed PIN', async () => {
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', { name: 'Check out' })
			);
			const dialog = screen.getByRole('dialog');
			fireEvent.change(within(dialog).getByLabelText('Phone Last 4'), {
				target: { value: '0000' },
			});
			fireEvent.click(
				within(dialog).getByRole('button', { name: 'Verify & Check Out' })
			);

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Verification Failed' })
				)
			);
			expect(mockCheckOut).not.toHaveBeenCalled();
		});
	});

	describe('per-row check-in', () => {
		it('checks a single child in with the legacy argument shape', async () => {
			mockCheckIn.mockResolvedValue(undefined);
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Amara Bennett')).getByRole('button', { name: 'Check in' })
			);

			await waitFor(() =>
				expect(mockCheckIn).toHaveBeenCalledWith({
					childId: 'child-waiting',
					eventId: 'evt_sunday_school',
					userId: 'user_admin',
				})
			);
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Checked In' })
				)
			);
		});

		it('surfaces a failed check-in', async () => {
			jest.spyOn(console, 'error').mockImplementation(() => {});
			mockCheckIn.mockRejectedValue(new Error('offline'));
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Amara Bennett')).getByRole('button', { name: 'Check in' })
			);

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Check-in Failed',
						description: 'offline',
					})
				)
			);
		});
	});

	describe('Figma 1a information architecture', () => {
		it('renders the three stats cards', () => {
			setup({ incidents: [{ child_id: 'c', admin_acknowledged_at: null }] });
			render(<CheckInContentGatherSystem />);

			const summary = screen.getByRole('region', { name: 'Check-in summary' });
			expect(within(summary).getByText('On site now')).toBeInTheDocument();
			expect(within(summary).getByText('Not checked in')).toBeInTheDocument();
			expect(within(summary).getByText('Open incidents')).toBeInTheDocument();
			// 1 of 2 on site, 1 not checked in, 1 unacknowledged incident.
			expect(within(summary).getByText('of 2')).toBeInTheDocument();
			expect(
				within(summary).getByText('needs admin acknowledgment')
			).toBeInTheDocument();
		});

		it('renders the status tabs with live counts', () => {
			render(<CheckInContentGatherSystem />);

			expect(screen.getByRole('tab', { name: 'All 2' })).toBeInTheDocument();
			expect(
				screen.getByRole('tab', { name: 'Checked in 1' })
			).toBeInTheDocument();
			expect(
				screen.getByRole('tab', { name: 'Not checked in 1' })
			).toBeInTheDocument();
		});

		it('renders the header event context and actions', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				screen.getByRole('heading', { name: 'Child Check-In & Out' })
			).toBeInTheDocument();
			expect(screen.getByText(/Sunday School ·/)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: 'Change event' })
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: 'Print roster' })
			).toBeInTheDocument();
		});

		it('renders the Child / Grade / Status / Action table columns', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				screen.getByRole('columnheader', { name: 'Child' })
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: 'Grade' })
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: 'Status' })
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: 'Action' })
			).toBeInTheDocument();
		});

		it('shows the per-row status, with the check-in time when there is one', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				within(rowFor('Jordan Kim')).getByText(/^Checked in \d{1,2}:\d{2} (AM|PM)$/)
			).toBeInTheDocument();
			expect(
				within(rowFor('Amara Bennett')).getByText('Not checked in')
			).toBeInTheDocument();
		});
	});

	describe('selection dock', () => {
		it('summarises the selected households and offers Confirm check-in · N', () => {
			render(<CheckInContentGatherSystem />);

			fireEvent.click(screen.getByLabelText('Select Amara Bennett'));

			const dock = screen.getByRole('region', { name: 'Check-in selection' });
			expect(within(dock).getByText('1 child selected')).toBeInTheDocument();
			expect(within(dock).getByText('Bennett')).toBeInTheDocument();
			expect(
				within(dock).getByRole('button', { name: 'Confirm check-in · 1' })
			).toBeInTheDocument();
		});

		it('bulk-checks-in only the children who are not already on site', async () => {
			mockCheckIn.mockResolvedValue(undefined);
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				screen.getByLabelText('Select all children not yet checked in')
			);
			fireEvent.click(
				screen.getByRole('button', { name: 'Confirm check-in · 1' })
			);

			await waitFor(() => expect(mockCheckIn).toHaveBeenCalledTimes(1));
			expect(mockCheckIn).toHaveBeenCalledWith({
				childId: 'child-waiting',
				eventId: 'evt_sunday_school',
				userId: 'user_admin',
			});
		});

		it('cannot select a child who is already on site', () => {
			render(<CheckInContentGatherSystem />);
			expect(screen.getByLabelText('Select Jordan Kim')).toBeDisabled();
		});
	});

	describe('empty, error and deep-link states', () => {
		it('explains an empty roster', () => {
			setup({ children: [], attendance: [] });
			render(<CheckInContentGatherSystem />);
			expect(screen.getByText('No children found.')).toBeInTheDocument();
		});

		it('distinguishes an empty filter result from an empty roster', () => {
			render(<CheckInContentGatherSystem />);
			fireEvent.change(
				screen.getByLabelText('Search children or household'),
				{ target: { value: 'zzzzz' } }
			);
			expect(
				screen.getByText('No children match your current filters.')
			).toBeInTheDocument();
		});

		it('warns door staff when the roster failed to load', () => {
			setup({ childrenError: new Error('boom') });
			render(<CheckInContentGatherSystem />);
			expect(screen.getByRole('alert')).toHaveTextContent(
				/could not load the check-in roster/i
			);
		});

		it('honours the ?filter=checkedIn deep link from the dashboard', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Jordan Kim')).toBeInTheDocument();
			expect(screen.queryByText('Amara Bennett')).not.toBeInTheDocument();
		});

		it('honours the ?filter=checkedOut deep link', () => {
			searchParams = new URLSearchParams('filter=checkedOut');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.queryByText('Jordan Kim')).not.toBeInTheDocument();
		});
	});
});

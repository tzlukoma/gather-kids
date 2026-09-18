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

// An ADMIN so `canUpdateChildPhoto` is true and the photo-capture affordance is
// exercised; the helper itself is the real one, unmocked.
jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => ({
		user: {
			uid: 'admin-1',
			email: 'admin@example.com',
			metadata: { role: 'ADMIN' },
		},
	}),
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
const mockUpdatePhoto = jest.fn();

jest.mock('@/hooks/data', () => ({
	useChildrenForActiveCycle: () => mockChildren(),
	useAttendance: () => mockAttendance(),
	useIncidents: () => mockIncidents(),
	useGuardians: () => mockGuardians(),
	useHouseholds: () => mockHouseholds(),
	useEmergencyContacts: () => mockEmergencyContacts(),
	useCheckInMutation: () => ({ mutateAsync: mockCheckIn }),
	useCheckOutMutation: () => mockUseCheckOutMutation(),
	useUpdateChildPhotoMutation: () => ({ mutateAsync: mockUpdatePhoto }),
}));

/**
 * The photo dialogs are camera/media surfaces the door only has to *open* with
 * the right subject, so they are stubbed down to that.
 *
 * They are also `next/dynamic` imports. Under jest the loadable wrapper
 * resolves in a microtask and updates state outside `act`, which would put an
 * act warning on every render in this file. `dynamic` is therefore shimmed to
 * return the stub synchronously, matched on the module path in the loader's
 * source. If a path here ever stops matching, the affected test fails loudly
 * rather than silently rendering nothing.
 */
/**
 * The incident detail renders an embla carousel over the incident photos, and
 * embla reads `window.matchMedia`, which jsdom does not provide. Stubbed to the
 * part the door is responsible for: opening it with that child's incidents.
 */
jest.mock('@/components/gatherKids/incident-details-dialog', () => {
	const react = require('react');
	return {
		IncidentDetailsDialog: ({
			incidents,
		}: {
			incidents: { description: string }[] | null;
		}) =>
			incidents
				? react.createElement(
						'div',
						{ 'data-testid': 'incident-details' },
						incidents.map((i) => i.description).join(' | ')
					)
				: null,
	};
});

jest.mock('next/dynamic', () => {
	// Declared inside the factory: jest hoists this above the module body, so
	// anything defined out here would still be in its temporal dead zone.
	const react = require('react');
	const captureStub = ({ child }: { child: { first_name: string } | null }) =>
		child
			? react.createElement(
					'div',
					{ 'data-testid': 'photo-capture' },
					child.first_name
				)
			: null;
	const viewerStub = ({ photo }: { photo: { name: string } | null }) =>
		photo
			? react.createElement('div', { 'data-testid': 'photo-viewer' }, photo.name)
			: null;

	return {
		__esModule: true,
		default: (loader: () => Promise<unknown>) => {
			const source = loader.toString();
			if (source.includes('photo-capture-dialog')) return captureStub;
			if (source.includes('photo-viewer-dialog')) return viewerStub;
			throw new Error(`Unstubbed next/dynamic import in the door tests: ${source}`);
		},
	};
});

import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

const onSiteChild = {
	child_id: 'child-on-site',
	household_id: 'hh-kim',
	first_name: 'Jordan',
	last_name: 'Kim',
	grade: '5th',
	is_active: true,
	// Widened so a test can give this child a photo without re-declaring them.
	photo_url: undefined as string | undefined,
};

const waitingChild = {
	child_id: 'child-waiting',
	household_id: 'hh-bennett',
	first_name: 'Amara',
	last_name: 'Bennett',
	grade: '1st',
	is_active: true,
	photo_url: undefined as string | undefined,
};

const openAttendance = {
	attendance_id: 'att-jordan',
	child_id: 'child-on-site',
	// Widened so a test can drop the event without re-declaring the row.
	event_id: 'evt_sunday_school' as string | undefined,
	date: '2026-09-13',
	check_in_at: '2026-09-13T14:04:00.000Z',
};

/** On site at a *different* event than the one this door is running. */
const elsewhereAttendance = {
	attendance_id: 'att-priya',
	child_id: 'child-elsewhere',
	event_id: 'evt_childrens_church',
	date: '2026-09-13',
	check_in_at: '2026-09-13T14:10:00.000Z',
};

const elsewhereChild = {
	child_id: 'child-elsewhere',
	household_id: 'hh-bennett',
	first_name: 'Priya',
	last_name: 'Okonjo',
	grade: '3rd',
	is_active: true,
	photo_url: undefined as string | undefined,
};

const DEFAULT_GUARDIANS = [
	{
		guardian_id: 'g-1',
		household_id: 'hh-kim',
		first_name: 'Grace',
		last_name: 'Kim',
		relationship: 'Mother',
		mobile_phone: '555-123-4567',
	},
];

function setup({
	children = [onSiteChild, waitingChild],
	attendance = [openAttendance],
	incidents = [] as unknown[],
	childrenError = null as unknown,
	guardians = DEFAULT_GUARDIANS as unknown[],
	emergencyContacts = [] as unknown[],
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
	mockGuardians.mockReturnValue({ data: guardians });
	mockHouseholds.mockReturnValue({
		data: [
			{ household_id: 'hh-kim', name: 'Kim' },
			{ household_id: 'hh-bennett', name: 'Bennett' },
		],
	});
	mockEmergencyContacts.mockReturnValue({ data: emergencyContacts });
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

		it('honours the ?filter=checkedOut deep link (the legacy alias)', () => {
			searchParams = new URLSearchParams('filter=checkedOut');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.queryByText('Jordan Kim')).not.toBeInTheDocument();
		});

		it('honours ?filter=notCheckedIn, the spelling that says what it does', () => {
			searchParams = new URLSearchParams('filter=notCheckedIn');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.queryByText('Jordan Kim')).not.toBeInTheDocument();
		});

		it('reads a hand-typed filter whatever its case or separators', () => {
			searchParams = new URLSearchParams('filter=checked-out');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.queryByText('Jordan Kim')).not.toBeInTheDocument();
		});

		it('falls back to the full roster on an unrecognised filter', () => {
			// A typo in a hand-typed link should not read as "show nothing".
			searchParams = new URLSearchParams('filter=pending');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.getByText('Jordan Kim')).toBeInTheDocument();
		});
	});

	/**
	 * Detail the legacy `ChildCard` carried and the GatherSystem door dropped in
	 * #383. At a door, "who may collect this child and on what number" is not
	 * decoration — it is what staff check before handing a child over.
	 */
	describe('per-child detail (feature-parity restoration)', () => {
		it('offers the information affordance on every row', () => {
			render(<CheckInContentGatherSystem />);

			for (const name of ['Jordan Kim', 'Amara Bennett']) {
				expect(
					within(rowFor(name)).getByRole('button', {
						name: `Guardian and contact details for ${name}`,
					})
				).toBeInTheDocument();
			}
		});

		it('shows guardians, their numbers and the emergency contact', async () => {
			setup({
				emergencyContacts: [
					{
						contact_id: 'ec-1',
						household_id: 'hh-kim',
						first_name: 'Ada',
						last_name: 'Nwosu',
						relationship: 'Aunt',
						mobile_phone: '555-987-6543',
					},
				],
			});
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', {
					name: 'Guardian and contact details for Jordan Kim',
				})
			);

			expect(await screen.findByText('Grace Kim (Mother)')).toBeInTheDocument();
			expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
			expect(screen.getByText(/Ada Nwosu/)).toBeInTheDocument();
			expect(screen.getByText('(555) 987-6543')).toBeInTheDocument();
		});

		it('says so plainly when there is no guardian or emergency contact', async () => {
			setup({ guardians: [], emergencyContacts: [] });
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', {
					name: 'Guardian and contact details for Jordan Kim',
				})
			);

			expect(
				await screen.findByText('No guardian information available.')
			).toBeInTheDocument();
			expect(
				screen.getByText('No emergency contact available.')
			).toBeInTheDocument();
		});

		it('opens the incident detail from the incident chip', async () => {
			setup({
				incidents: [
					{
						incident_id: 'inc-1',
						child_id: 'child-on-site',
						child_name: 'Jordan Kim',
						description: 'Scraped knee on the stairs',
						severity: 'low',
						timestamp: '2026-09-13T15:00:00.000Z',
						admin_acknowledged_at: null,
					},
				],
			});
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', {
					name: 'View incident for Jordan Kim',
				})
			);

			expect(await screen.findByTestId('incident-details')).toHaveTextContent(
				'Scraped knee on the stairs'
			);
		});

		it('opens the full-size photo, and offers nothing to open without one', () => {
			setup({
				children: [
					{ ...onSiteChild, photo_url: 'https://example.test/jordan.jpg' },
					waitingChild,
				],
			});
			render(<CheckInContentGatherSystem />);

			expect(
				within(rowFor('Amara Bennett')).getByRole('button', {
					name: 'No photo on file for Amara Bennett',
				})
			).toBeDisabled();

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', {
					name: 'View photo of Jordan Kim',
				})
			);
			expect(screen.getByTestId('photo-viewer')).toHaveTextContent('Jordan Kim');
		});

		it('opens photo capture for a user allowed to update photos', () => {
			render(<CheckInContentGatherSystem />);

			fireEvent.click(
				within(rowFor('Jordan Kim')).getByRole('button', {
					name: 'Update photo for Jordan Kim',
				})
			);
			expect(screen.getByTestId('photo-capture')).toHaveTextContent('Jordan');
		});
	});

	/**
	 * A child can be on site at another event. Before this, the door read them as
	 * "Checked in" and offered a Check out that would have released them from the
	 * other event's roster.
	 */
	describe('a child on site at another event', () => {
		beforeEach(() => {
			setup({
				children: [onSiteChild, waitingChild, elsewhereChild],
				attendance: [openAttendance, elsewhereAttendance],
			});
		});

		it('names the event holding them instead of reading as checked in', () => {
			render(<CheckInContentGatherSystem />);
			expect(
				within(rowFor('Priya Okonjo')).getByText("In Children's Church")
			).toBeInTheDocument();
		});

		it('offers no check-out, because this door cannot release them', () => {
			render(<CheckInContentGatherSystem />);
			expect(
				within(rowFor('Priya Okonjo')).queryByRole('button', {
					name: 'Check out',
				})
			).not.toBeInTheDocument();
		});

		it('disables check-in rather than checking them into two events', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				within(rowFor('Priya Okonjo')).getByRole('button', { name: 'Check in' })
			).toBeDisabled();
			expect(
				within(rowFor('Priya Okonjo')).getByRole('checkbox')
			).toBeDisabled();
		});

		it('counts them as not checked in here, and says why on the card', () => {
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('1 in another event')).toBeInTheDocument();
			expect(
				within(rowFor('Priya Okonjo')).queryByRole('button', {
					name: 'Check out',
				})
			).not.toBeInTheDocument();
		});
	});

	/**
	 * The filter follows the URL on navigation, not only on first render.
	 * Landing on an unreadable filter has to mean the same thing whether you
	 * arrived there directly or from another filtered URL — otherwise the screen
	 * keeps showing the previous filter's rows under a URL that does not say so.
	 */
	describe('following the URL after it changes', () => {
		it('switches filters on navigation', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			const { rerender } = render(<CheckInContentGatherSystem />);
			expect(screen.queryByText('Amara Bennett')).not.toBeInTheDocument();

			searchParams = new URLSearchParams('filter=notCheckedIn');
			rerender(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.queryByText('Jordan Kim')).not.toBeInTheDocument();
		});

		it('falls back to the full roster on an unreadable filter', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			const { rerender } = render(<CheckInContentGatherSystem />);
			expect(screen.queryByText('Amara Bennett')).not.toBeInTheDocument();

			searchParams = new URLSearchParams('filter=pending');
			rerender(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.getByText('Jordan Kim')).toBeInTheDocument();
		});

		it('falls back to the full roster when the filter is dropped entirely', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			const { rerender } = render(<CheckInContentGatherSystem />);
			expect(screen.queryByText('Amara Bennett')).not.toBeInTheDocument();

			searchParams = new URLSearchParams('event=evt_childrens_church');
			rerender(<CheckInContentGatherSystem />);

			expect(screen.getByText('Amara Bennett')).toBeInTheDocument();
			expect(screen.getByText('Jordan Kim')).toBeInTheDocument();
		});
	});

	/**
	 * Below `md` the table header is hidden, because the rows stop being rows —
	 * so the select-all it carries has to live somewhere else or the control
	 * disappears on a phone.
	 */
	describe('select-all outside the table header', () => {
		it('selects every child not already on site', () => {
			render(<CheckInContentGatherSystem />);

			fireEvent.click(screen.getByLabelText(/Select all not checked in/));

			expect(
				screen.getByRole('button', { name: 'Confirm check-in · 1' })
			).toBeInTheDocument();
		});

		it('is not offered when there is nobody left to check in', () => {
			setup({ children: [onSiteChild] });
			render(<CheckInContentGatherSystem />);

			expect(
				screen.queryByLabelText(/Select all not checked in/)
			).not.toBeInTheDocument();
		});
	});

	/**
	 * An open row with no `event_id` belongs to whichever door is asking, so it
	 * stays closable. The screen has to apply that everywhere at once: a row
	 * offering Check out while the tab, the card and the "in another event"
	 * label disagreed about it would be worse than either answer alone.
	 */
	describe('an open attendance row with no event', () => {
		beforeEach(() => {
			setup({
				attendance: [{ ...openAttendance, event_id: undefined }],
			});
		});

		it('reads as checked in and offers a check-out', () => {
			render(<CheckInContentGatherSystem />);

			expect(
				within(rowFor('Jordan Kim')).getByRole('button', { name: 'Check out' })
			).toBeInTheDocument();
			expect(
				within(rowFor('Jordan Kim')).getByText(/^Checked in/)
			).toBeInTheDocument();
		});

		it('is not labelled as being in another event', () => {
			render(<CheckInContentGatherSystem />);
			expect(screen.queryByText(/in another event/)).not.toBeInTheDocument();
		});

		it('appears in the Checked in tab it offers that check-out from', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			render(<CheckInContentGatherSystem />);

			expect(screen.getByText('Jordan Kim')).toBeInTheDocument();
			expect(screen.queryByText('Amara Bennett')).not.toBeInTheDocument();
		});
	});
});

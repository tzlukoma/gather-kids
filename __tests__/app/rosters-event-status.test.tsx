import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';

/**
 * #566: on Rosters, a checked-in child's Status names the event they are in
 * now, from the persisted event names. A roster is not tied to one door, so
 * this holds for the roster's own event as well as any other.
 */

jest.mock('@/lib/dal', () => ({
	getServiceDayIso: () => '2026-11-08',
	recordCheckIn: jest.fn(),
	recordCheckOut: jest.fn(),
	exportRosterCSV: jest.fn(),
	getChildrenForLeader: jest.fn(),
	getMinistries: jest.fn().mockResolvedValue([]),
	getMinistryEnrollmentsByCycle: jest.fn().mockResolvedValue([]),
	getCurrentRegistrationCycle: jest
		.fn()
		.mockResolvedValue({ cycle_id: 'cycle-1', name: 'Fall 2026' }),
}));

// A stable object, as the real context provides: the page reloads its
// ministry data whenever `user` changes identity.
const mockAuth = {
	user: { uid: 'admin-1', email: 'admin@example.test', metadata: { role: 'ADMIN' } },
	loading: false,
};
jest.mock('@/contexts/auth-context', () => ({ useAuth: () => mockAuth }));
jest.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams(''),
	useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
	usePathname: () => '/rosters',
}));
let mockIsMobile = false;
jest.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mockIsMobile }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/components/gatherKids/gathersystem-shell-context', () => ({
	useGatherSystemShell: () => false,
}));
jest.mock('@/lib/analytics/browser', () => ({ captureAnalyticsEvent: jest.fn() }));
jest.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
jest.mock('@/components/gatherKids/incident-details-dialog', () => ({
	IncidentDetailsDialog: () => null,
}));

type Ev = { id: string; name: string; archived?: boolean };
let mockEvents: Ev[] = [];
const children = [
	{ child_id: 'c-here', household_id: 'h1', first_name: 'Jordan', last_name: 'Kim', grade: '5th', is_active: true },
	{ child_id: 'c-there', household_id: 'h1', first_name: 'Priya', last_name: 'Okonjo', grade: '3rd', is_active: true },
	{ child_id: 'c-out', household_id: 'h1', first_name: 'Amara', last_name: 'Bennett', grade: '1st', is_active: true },
];
const attendance = [
	{ attendance_id: 'a1', child_id: 'c-here', event_id: 'evt_sunday_school', date: '2026-11-08', check_in_at: '2026-11-08T15:00:00Z', check_out_at: null },
	{ attendance_id: 'a2', child_id: 'c-there', event_id: 'evt_teen_church', date: '2026-11-08', check_in_at: '2026-11-08T15:05:00Z', check_out_at: null },
];

jest.mock('@/hooks/data', () => ({
	useChildrenForActiveCycle: () => ({ data: children, isLoading: false }),
	useHouseholds: () => ({ data: [{ household_id: 'h1', name: 'Kim' }], isLoading: false }),
	useGuardians: () => ({ data: [], isLoading: false }),
	useAttendance: () => ({ data: attendance, isLoading: false }),
	useIncidents: () => ({ data: [], isLoading: false }),
	useEmergencyContacts: () => ({ data: [], isLoading: false }),
	useTransferCheckInMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
	useCheckInEvents: () => {
		const { activeCheckInEvents, eventNameLookup } = require('@/lib/check-in-events');
		return {
			events: activeCheckInEvents(mockEvents),
			allEvents: mockEvents,
			isPersisted: true,
			nameOf: eventNameLookup(mockEvents),
			isLoading: false,
			isError: false,
			refetch: () => undefined,
		};
	},
}));

import RostersPage from '@/app/(admin)/rosters/page';

const DEFAULT_EVENTS: Ev[] = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: "Children's Church" },
	{ id: 'evt_teen_church', name: 'Teen Church' },
];

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('Rosters status names the current event (#566)', () => {
	beforeEach(() => {
		mockIsMobile = false;
		mockEvents = DEFAULT_EVENTS;
	});

	it("names the roster's own event and another event, and leaves a child not on site unchanged", async () => {
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Jordan Kim')).toBeInTheDocument());

		expect(within(rowFor('Jordan Kim')).getByText('In Sunday School')).toBeInTheDocument();
		expect(within(rowFor('Priya Okonjo')).getByText('In Teen Church')).toBeInTheDocument();
		expect(within(rowFor('Amara Bennett')).getByText('Checked Out')).toBeInTheDocument();
	});

	it('uses the current name of a renamed event', async () => {
		mockEvents = DEFAULT_EVENTS.map((e) =>
			e.id === 'evt_teen_church' ? { ...e, name: 'Youth Service' } : e
		);
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Priya Okonjo')).toBeInTheDocument());

		expect(within(rowFor('Priya Okonjo')).getByText('In Youth Service')).toBeInTheDocument();
	});

	it('keeps the full label available when a long name is truncated', async () => {
		mockEvents = DEFAULT_EVENTS.map((e) =>
			e.id === 'evt_teen_church'
				? { ...e, name: 'Wednesday Night Middle and High School Youth Gathering' }
				: e
		);
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Priya Okonjo')).toBeInTheDocument());

		const label = 'In Wednesday Night Middle and High School Youth Gathering';
		expect(within(rowFor('Priya Okonjo')).getByTitle(label)).toHaveTextContent(label);
	});

	it('names the event on the mobile cards too, whichever event the child is in', async () => {
		mockIsMobile = true;
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Jordan Kim')).toBeInTheDocument());

		expect(screen.getByText('In Sunday School')).toBeInTheDocument();
		// One badge per child, in the checked-in style, whichever event they are in.
		const badge = screen.getByText('In Teen Church');
		expect(badge.closest('.bg-brand-aqua')).not.toBeNull();
		expect(screen.queryByText('Checked In')).not.toBeInTheDocument();
	});
});

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * #584: the roster's Allergy badge marks only children with an allergy on
 * file. "No known allergies" is stored as `none` and gets no badge, in the
 * flat and the grade-grouped layouts alike.
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
const mockEvents: Ev[] = [{ id: 'evt_sunday_school', name: 'Sunday School' }];
const kid = (child_id: string, first_name: string, grade: string, allergies?: string | null) => ({
	child_id,
	household_id: 'h1',
	first_name,
	last_name: 'Testchild',
	grade,
	is_active: true,
	allergies,
});
const children = [
	kid('c-none', 'Nora', '3rd', 'none'),
	kid('c-none-typed', 'Nolan', '3rd', 'None.'),
	kid('c-blank', 'Blake', '1st', ''),
	kid('c-null', 'Nia', '1st', null),
	kid('c-peanut', 'Pia', '5th', 'Peanuts (synthetic)'),
];
const attendance: unknown[] = [];

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

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

function expectBadges() {
	expect(within(rowFor('Pia Testchild')).getByText('Allergy')).toBeInTheDocument();
	for (const name of ['Nora Testchild', 'Nolan Testchild', 'Blake Testchild', 'Nia Testchild']) {
		expect(within(rowFor(name)).queryByText('Allergy')).not.toBeInTheDocument();
	}
	expect(screen.getAllByText('Allergy')).toHaveLength(1);
}

describe('Rosters Allergy badge (#584)', () => {
	beforeEach(() => {
		mockIsMobile = false;
	});

	it('badges only the child with an allergy on file, in the flat layout', async () => {
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Pia Testchild')).toBeInTheDocument());
		expectBadges();
	});

	it('does the same when grouped by grade', async () => {
		const user = userEvent.setup();
		render(<RostersPage />);
		await waitFor(() => expect(screen.getByText('Pia Testchild')).toBeInTheDocument());

		await user.click(screen.getByLabelText('Group by Grade'));
		// Grade headers: two children in each of 1st and 3rd, one in 5th.
		await waitFor(() => expect(screen.getAllByText(/\(2\)$/)).toHaveLength(2));
		expect(screen.getByText(/\(1\)$/)).toBeInTheDocument();
		expectBadges();
	});
});

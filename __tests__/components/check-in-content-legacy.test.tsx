import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

/**
 * The legacy door screen (`check-in-content-legacy.tsx`).
 *
 * Its table lives in `CheckInView`, so this file mocks that view down to the
 * props the wrapper is responsible for: the selected event, status filter and
 * grade filters. That keeps the tests focused on the wrapper's own behaviour:
 * reading URL parameters, falling back safely, and announcing values it cannot
 * read.
 */

let searchParams = new URLSearchParams('');
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
	useSearchParams: () => searchParams,
	useRouter: () => ({ replace: mockReplace }),
	usePathname: () => '/check-in',
}));

jest.mock('@/lib/dal', () => ({
	getServiceDayIso: () => '2026-09-13',
}));

jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => ({ user: { uid: 'admin-1', metadata: { role: 'ADMIN' } } }),
}));

jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));

let mockEventsPersisted = true;
let mockEventsLoading = false;
const DEFAULT_EVENTS = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: "Children's Church" },
	{ id: 'evt_teen_church', name: 'Teen Church' },
];
let mockEvents = DEFAULT_EVENTS;

jest.mock('@/hooks/data', () => ({
	useChildrenForActiveCycle: () => ({
		data: [],
		isLoading: false,
		error: null,
	}),
	useAttendance: () => ({
		data: [],
		isLoading: false,
		error: null,
	}),
	useCheckInEvents: () => {
		const { activeCheckInEvents, eventNameLookup } = require('@/lib/check-in-events');
		return {
			events: activeCheckInEvents(mockEvents),
			allEvents: mockEvents,
			isPersisted: mockEventsPersisted,
			nameOf: eventNameLookup(mockEvents),
			isLoading: mockEventsLoading,
		};
	},
}));

let lastCheckInViewProps: Record<string, unknown> | null = null;

jest.mock('@/components/gatherKids/check-in-view', () => ({
	CheckInView: (props: Record<string, unknown>) => {
		lastCheckInViewProps = props;
		return (
			<div data-testid="check-in-view">
				<div data-testid="view-status-filter">{String(props.statusFilter)}</div>
				<div data-testid="view-selected-event">{String(props.selectedEvent)}</div>
			</div>
		);
	},
}));

import { CheckInContentLegacy } from '@/components/gatherKids/check-in-content-legacy';

function filterNotice() {
	return screen.queryByRole('status', { name: /unreadable filter/i });
}

function eventNotice() {
	return screen.queryByRole('status', { name: /unreadable event/i });
}

describe('CheckInContentLegacy', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		searchParams = new URLSearchParams('');
		mockEvents = DEFAULT_EVENTS;
		mockEventsPersisted = true;
		mockEventsLoading = false;
		lastCheckInViewProps = null;
	});

	describe('unreadable URL parameter notices (#456)', () => {
		it('shows a dismissible notice for an unreadable filter and falls back to the full roster', () => {
			searchParams = new URLSearchParams('filter=pending');
			render(<CheckInContentLegacy />);

			const notice = filterNotice();
			expect(notice).toBeInTheDocument();
			expect(notice).toHaveTextContent('pending');
			expect(notice).toHaveTextContent('all');
			expect(notice).toHaveTextContent('checkedIn');
			expect(notice).toHaveTextContent('notCheckedIn');
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('all');
		});

		it('shows no notice for a valid filter', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			render(<CheckInContentLegacy />);

			expect(filterNotice()).not.toBeInTheDocument();
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('checkedIn');
		});

		it('shows a dismissible notice for an unknown event once the list resolves', () => {
			searchParams = new URLSearchParams('event=evt_nonsense');
			render(<CheckInContentLegacy />);

			const notice = eventNotice();
			expect(notice).toBeInTheDocument();
			expect(notice).toHaveTextContent('evt_nonsense');
			expect(notice).toHaveTextContent('Sunday School');
			expect(notice).toHaveTextContent("Children's Church");
			expect(notice).toHaveTextContent('Teen Church');
		});

		it('shows no event notice for a valid event', () => {
			searchParams = new URLSearchParams('event=evt_childrens_church');
			render(<CheckInContentLegacy />);

			expect(eventNotice()).not.toBeInTheDocument();
			expect(screen.getByTestId('view-selected-event')).toHaveTextContent(
				'evt_childrens_church'
			);
		});

		it('is silent when params are missing', () => {
			render(<CheckInContentLegacy />);

			expect(filterNotice()).not.toBeInTheDocument();
			expect(eventNotice()).not.toBeInTheDocument();
		});

		it('treats an empty filter value as absent', () => {
			searchParams = new URLSearchParams('filter=');
			render(<CheckInContentLegacy />);

			expect(filterNotice()).not.toBeInTheDocument();
		});

		it('hides the notice when dismissed without changing the URL or filter state', () => {
			searchParams = new URLSearchParams('filter=pending');
			render(<CheckInContentLegacy />);

			fireEvent.click(
				screen.getByRole('button', { name: 'Dismiss filter notice' })
			);
			expect(filterNotice()).not.toBeInTheDocument();
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('all');
			expect(mockReplace).not.toHaveBeenCalled();
		});
	});

	describe('navigation sync alignment (#456 item 8)', () => {
		it('resets a previously-selected non-all filter to all on an unreadable navigation', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			const { rerender } = render(<CheckInContentLegacy />);
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('checkedIn');
			expect(filterNotice()).not.toBeInTheDocument();

			searchParams = new URLSearchParams('filter=pending');
			rerender(<CheckInContentLegacy />);
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('all');
			expect(filterNotice()).toBeInTheDocument();
		});

		it('falls back to all when the filter parameter is dropped entirely', () => {
			searchParams = new URLSearchParams('filter=checkedIn');
			const { rerender } = render(<CheckInContentLegacy />);
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('checkedIn');

			searchParams = new URLSearchParams('event=evt_childrens_church');
			rerender(<CheckInContentLegacy />);
			expect(screen.getByTestId('view-status-filter')).toHaveTextContent('all');
		});
	});
});

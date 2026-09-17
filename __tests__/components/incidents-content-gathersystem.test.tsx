import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { IncidentsContentGatherSystem } from '@/components/gatherKids/incidents-content-gathersystem';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { AuthRole } from '@/lib/auth-types';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

// Filter *logic* is covered directly in __tests__/lib/incidents-filter.test.ts.
// Radix Select/Tabs need pointer-event polyfills this repo does not have, so
// this suite drives state through the URL deep-link and the data instead.
let searchParams = new URLSearchParams('tab=view');
jest.mock('next/navigation', () => ({
	useSearchParams: () => searchParams,
}));

jest.mock('@/components/gatherKids/incident-form', () => ({
	IncidentForm: () => <div data-testid="incident-form" />,
}));

const mockMutateAsync = jest.fn();
const mockUseScopedIncidents = jest.fn();
jest.mock('@/hooks/data/attendance', () => ({
	useScopedIncidents: (...args: unknown[]) => mockUseScopedIncidents(...args),
	useAcknowledgeIncident: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

const mockUseChildrenForActiveCycle = jest.fn();
const mockUseMinistries = jest.fn();
const mockUseIncidentMinistryScope = jest.fn();
const mockUseRegistrationCycles = jest.fn();
jest.mock('@/hooks/data', () => ({
	useChildrenForActiveCycle: () => mockUseChildrenForActiveCycle(),
	useMinistries: () => mockUseMinistries(),
	useIncidentMinistryScope: (...args: unknown[]) =>
		mockUseIncidentMinistryScope(...args),
	useRegistrationCycles: () => mockUseRegistrationCycles(),
}));

const pending = {
	incident_id: 'inc-1',
	child_id: 'child-1',
	child_name: 'Test Child One',
	severity: 'high',
	description: 'Synthetic pending incident.',
	leader_id: 'leader-1',
	timestamp: '2026-09-13T14:20:00.000Z',
	admin_acknowledged_at: null as string | null,
};

const acknowledged = {
	incident_id: 'inc-2',
	child_id: 'child-2',
	child_name: 'Test Child Two',
	severity: 'low',
	description: 'Synthetic acknowledged incident.',
	leader_id: 'leader-1',
	timestamp: '2026-09-06T13:44:00.000Z',
	admin_acknowledged_at: '2026-09-06T15:00:00.000Z' as string | null,
};

function setup({ incidents = [pending, acknowledged] } = {}) {
	mockUseScopedIncidents.mockReturnValue({
		data: incidents,
		isLoading: false,
		error: null,
	});
	mockUseChildrenForActiveCycle.mockReturnValue({
		data: [{ child_id: 'child-1' }, { child_id: 'child-2' }],
	});
	mockUseRegistrationCycles.mockReturnValue({
		data: [{ cycle_id: 'cycle-1', name: 'Fall 2026' }],
	});
	mockUseMinistries.mockReturnValue({
		data: [{ ministry_id: 'min-ss', name: 'Sunday School' }],
	});
	mockUseIncidentMinistryScope.mockReturnValue({
		data: [{ child_id: 'child-1', ministry_id: 'min-ss' }],
	});
}

function renderAs(role: AuthRole, overrides = {}) {
	const user =
		role === AuthRole.ADMIN
			? mockUsers.admin
			: { ...mockUsers.ministryLeader, ...overrides };
	return renderWithAuth(<IncidentsContentGatherSystem />, {
		user: user as never,
		userRole: role,
	});
}

describe('IncidentsContentGatherSystem', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		searchParams = new URLSearchParams('tab=view');
		setup();
	});

	// This screen must not use the legacy `useIncidentsForUser`, which reads the
	// whole `incidents` table into the browser and filters client-side (#428).
	// `useScopedIncidents` gets the same visible set from `/api/incidents`, which
	// scopes it as a database predicate from the validated session.
	it('reads incidents through useScopedIncidents (authorization boundary)', () => {
		renderAs(AuthRole.ADMIN);
		expect(mockUseScopedIncidents).toHaveBeenCalled();
	});

	it('honours the ?tab=view&filter=pending deep link from the dashboard', () => {
		searchParams = new URLSearchParams('tab=view&filter=pending');
		renderAs(AuthRole.ADMIN);

		expect(screen.getByText('Test Child One')).toBeInTheDocument();
		expect(screen.queryByText('Test Child Two')).not.toBeInTheDocument();
	});

	describe('acknowledge authorization', () => {
		it('offers Acknowledge to ADMIN for pending incidents only', () => {
			renderAs(AuthRole.ADMIN);

			expect(
				screen.getAllByRole('button', { name: 'Acknowledge' })
			).toHaveLength(1);

			const ackRow = screen.getByText('Test Child Two').closest('tr')!;
			expect(
				within(ackRow).queryByRole('button', { name: 'Acknowledge' })
			).not.toBeInTheDocument();
		});

		it('never offers Acknowledge to a MINISTRY_LEADER in the list', () => {
			renderAs(AuthRole.MINISTRY_LEADER);
			expect(
				screen.queryByRole('button', { name: 'Acknowledge' })
			).not.toBeInTheDocument();
		});

		it('does not promise acknowledgement to a MINISTRY_LEADER in the page copy', () => {
			renderAs(AuthRole.MINISTRY_LEADER);
			expect(
				screen.getByText('Log anything that happened during a session.')
			).toBeInTheDocument();
			expect(
				screen.queryByText(
					'Log and acknowledge anything that happened during a session.'
				)
			).not.toBeInTheDocument();
		});

		it('never offers Acknowledge to a MINISTRY_LEADER in incident detail', () => {
			renderAs(AuthRole.MINISTRY_LEADER);
			fireEvent.click(screen.getByText('Test Child One'));

			const dialog = screen.getByRole('dialog');
			expect(within(dialog).getByText('Incident Details')).toBeInTheDocument();
			expect(
				within(dialog).queryByRole('button', { name: 'Acknowledge' })
			).not.toBeInTheDocument();
		});

		it('does not offer Acknowledge in detail for an already-acknowledged incident', () => {
			renderAs(AuthRole.ADMIN);
			fireEvent.click(screen.getByText('Test Child Two'));

			const dialog = screen.getByRole('dialog');
			expect(
				within(dialog).queryByRole('button', { name: 'Acknowledge' })
			).not.toBeInTheDocument();
		});

		it('acknowledges from the inline list action', async () => {
			mockMutateAsync.mockResolvedValue('inc-1');
			renderAs(AuthRole.ADMIN);

			fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

			await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith('inc-1'));
			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'Incident Acknowledged' })
				)
			);
		});

		it('acknowledges from incident detail with the same mutation', async () => {
			mockMutateAsync.mockResolvedValue('inc-1');
			renderAs(AuthRole.ADMIN);
			fireEvent.click(screen.getByText('Test Child One'));

			const dialog = screen.getByRole('dialog');
			fireEvent.click(
				within(dialog).getByRole('button', { name: 'Acknowledge' })
			);

			await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith('inc-1'));
		});

		it('surfaces a destructive toast when acknowledge fails', async () => {
			mockMutateAsync.mockRejectedValue(new Error('nope'));
			renderAs(AuthRole.ADMIN);

			fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

			await waitFor(() =>
				expect(mockToast).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Acknowledgement Failed',
						variant: 'destructive',
					})
				)
			);
		});
	});

	describe('empty states', () => {
		it('distinguishes a filter miss from an empty log', () => {
			// Only an acknowledged incident exists, so ?filter=pending matches none.
			setup({ incidents: [acknowledged] });
			searchParams = new URLSearchParams('tab=view&filter=pending');
			renderAs(AuthRole.ADMIN);

			expect(
				screen.getByText('No incidents match the current filter')
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: 'Show all incidents' })
			).toBeInTheDocument();
			expect(
				screen.queryByText('No incidents this cycle')
			).not.toBeInTheDocument();
		});

		it('shows the empty-log state when nothing is in context', () => {
			setup({ incidents: [] });
			renderAs(AuthRole.ADMIN);

			expect(screen.getByText('No incidents this cycle')).toBeInTheDocument();
			expect(
				screen.queryByText('No incidents match the current filter')
			).not.toBeInTheDocument();
		});

		it('clears filters from the filter-miss empty state', () => {
			setup({ incidents: [acknowledged] });
			searchParams = new URLSearchParams('tab=view&filter=pending');
			renderAs(AuthRole.ADMIN);

			fireEvent.click(screen.getByRole('button', { name: 'Show all incidents' }));

			expect(screen.getByText('Test Child Two')).toBeInTheDocument();
		});
	});

	describe('ministry filter across cycles', () => {
		// An Incident carries no cycle. A child involved in a past-cycle incident
		// therefore has no active-cycle enrollment row, so joining against the
		// active-cycle enrollments alone drops that incident from any ministry
		// filter and omits the ministry from the options entirely.
		const historical = {
			incident_id: 'inc-old',
			child_id: 'child-3',
			child_name: 'Past Cycle Child',
			severity: 'medium',
			description: 'Incident from an earlier cycle.',
			leader_id: 'leader-1',
			timestamp: '2025-04-02T10:00:00.000Z',
			admin_acknowledged_at: null as string | null,
		};

		function setupHistorical() {
			setup({ incidents: [historical] });
			// child-3 is not in the active cycle, so nothing is in context yet.
			mockUseChildrenForActiveCycle.mockReturnValue({
				data: [{ child_id: 'child-1' }],
			});
			mockUseMinistries.mockReturnValue({
				data: [
					{ ministry_id: 'min-ss', name: 'Sunday School' },
					{ ministry_id: 'min-choir', name: 'Choir' },
				],
			});
			// child-3's only membership lives in a past cycle, so the server
			// returns it only when the request drops its cycle scope.
			mockUseIncidentMinistryScope.mockImplementation((cycleId?: string) => ({
				data: cycleId
					? []
					: [{ child_id: 'child-3', ministry_id: 'min-choir' }],
			}));
		}

		it('never sends a child list: the server derives the scope', () => {
			setupHistorical();
			renderAs(AuthRole.ADMIN);

			// Only a cycle scope crosses the wire. Child ids are resolved from the
			// session inside /api/incidents/ministry-scope, so the browser has no
			// say in which children it may ask about.
			expect(mockUseIncidentMinistryScope).toHaveBeenCalledWith('cycle-1');
		});

		it('offers the ministry of a past-cycle incident once past cycles are shown', () => {
			setupHistorical();
			renderAs(AuthRole.ADMIN);

			// Nothing in the active cycle, so no ministry has any incident behind it
			// and the whole Ministry control is withheld.
			expect(screen.queryByText('Ministry')).not.toBeInTheDocument();

			fireEvent.click(
				screen.getByRole('button', { name: 'Include past cycles' })
			);

			// The cycle scope is dropped, so the past-cycle incident is in context and
			// its history-only ministry becomes available as a filter option.
			expect(mockUseIncidentMinistryScope).toHaveBeenLastCalledWith(undefined);
			expect(screen.getByText('Past Cycle Child')).toBeInTheDocument();
			expect(screen.getByText('Ministry')).toBeInTheDocument();
		});
	});

	it('summarises pending and total from in-context incidents', () => {
		renderAs(AuthRole.ADMIN);
		expect(screen.getByText('1 pending · 2 total')).toBeInTheDocument();
	});

	it('keeps the inactive-leader restricted view', () => {
		renderAs(AuthRole.MINISTRY_LEADER, { is_active: false });

		expect(screen.getByText('Account Inactive')).toBeInTheDocument();
		expect(screen.getByText('Your Logged Incidents')).toBeInTheDocument();
		expect(
			screen.queryByRole('tab', { name: 'Log New Incident' })
		).not.toBeInTheDocument();
	});
});

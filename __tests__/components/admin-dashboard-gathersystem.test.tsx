import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminDashboardGatherSystem } from '@/components/gatherKids/admin-dashboard-gathersystem';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { AuthRole } from '@/lib/auth-types';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/hooks/data', () => ({
	useAcknowledgeIncident: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

const mockUseUnacknowledgedIncidents = jest.fn();
const mockUseCheckedInCount = jest.fn();
const mockUseRegistrationStats = jest.fn();
jest.mock('@/hooks/data/dashboard', () => ({
	useUnacknowledgedIncidents: () => mockUseUnacknowledgedIncidents(),
	useCheckedInCount: () => mockUseCheckedInCount(),
	useRegistrationStats: () => mockUseRegistrationStats(),
}));

jest.mock('@/lib/dal', () => ({
	getTodayIsoDate: () => '2026-09-13',
}));

const pendingIncident = {
	incident_id: 'incident-1',
	child_id: 'child-1',
	child_name: 'Test Child',
	severity: 'high',
	timestamp: '2026-09-13T14:20:00.000Z',
	description: 'Synthetic test incident description.',
};

function setHookData({
	incidents = [] as Array<typeof pendingIncident>,
	checkedIn = 0,
	stats = {
		householdCount: 4,
		childCount: 9,
		cycleName: 'Fall 2026' as string | undefined,
	},
} = {}) {
	mockUseUnacknowledgedIncidents.mockReturnValue({
		data: incidents,
		isLoading: false,
		error: null,
	});
	mockUseCheckedInCount.mockReturnValue({
		data: checkedIn,
		isLoading: false,
		error: null,
	});
	mockUseRegistrationStats.mockReturnValue({
		data: stats,
		isLoading: false,
		error: null,
	});
}

describe('AdminDashboardGatherSystem', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setHookData();
	});

	it('shows a skeleton (no data) for non-ADMIN users', () => {
		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.ministryLeader,
			userRole: AuthRole.MINISTRY_LEADER,
		});

		expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
		expect(screen.queryByText('Reports')).not.toBeInTheDocument();
	});

	it('renders the live KPI set with legacy deep-links', () => {
		setHookData({ checkedIn: 5, incidents: [pendingIncident] });
		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.admin,
			userRole: AuthRole.ADMIN,
		});

		const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
		expect(links).toEqual(
			expect.arrayContaining([
				'/check-in?filter=checkedIn',
				'/incidents?tab=view&filter=pending',
				'/registrations',
				'/check-in',
				'/reports',
			])
		);
		expect(screen.getByText('Checked-In Children')).toBeInTheDocument();
		expect(screen.getByText('Pending Incidents')).toBeInTheDocument();
		expect(screen.getByText(/Registrations · Fall 2026/)).toBeInTheDocument();
	});

	it('busy state lists pending incidents with an Acknowledge action', async () => {
		setHookData({ incidents: [pendingIncident] });
		mockMutateAsync.mockResolvedValue(1);

		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.admin,
			userRole: AuthRole.ADMIN,
		});

		expect(screen.getByText('Test Child')).toBeInTheDocument();
		expect(screen.getByText('high')).toBeInTheDocument();
		expect(
			screen.getByText('Synthetic test incident description.')
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith('incident-1');
		});
		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Incident Acknowledged' })
			);
		});
	});

	it('surfaces an error toast when acknowledge fails', async () => {
		setHookData({ incidents: [pendingIncident] });
		mockMutateAsync.mockRejectedValue(new Error('nope'));

		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.admin,
			userRole: AuthRole.ADMIN,
		});

		fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Acknowledgement Failed',
					variant: 'destructive',
				})
			);
		});
	});

	it('quiet state never fakes incidents and keeps report links', () => {
		setHookData({ incidents: [] });

		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.admin,
			userRole: AuthRole.ADMIN,
		});

		expect(
			screen.getByText(
				'No unacknowledged incidents. Nothing needs your acknowledgement.'
			)
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Acknowledge' })
		).not.toBeInTheDocument();
		expect(screen.getByText('Emergency Snapshot')).toBeInTheDocument();
		expect(screen.getByText('Attendance Rollup')).toBeInTheDocument();
	});

	it('omits the cycle name honestly when no active cycle exists', () => {
		setHookData({
			stats: { householdCount: 0, childCount: 0, cycleName: undefined },
		});

		renderWithAuth(<AdminDashboardGatherSystem />, {
			user: mockUsers.admin,
			userRole: AuthRole.ADMIN,
		});

		expect(screen.queryByText(/cycle/i)).not.toBeInTheDocument();
	});
});

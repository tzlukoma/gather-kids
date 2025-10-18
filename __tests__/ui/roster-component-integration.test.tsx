import { render, screen, waitFor } from '@testing-library/react';
import RostersPage from '@/app/dashboard/rosters/page';
import { useAuth } from '@/contexts/auth-context';
import { useSearchParams } from 'next/navigation';

// Mock the auth context
jest.mock('@/contexts/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock next/navigation
jest.mock('next/navigation');
const mockUseSearchParams = useSearchParams as jest.MockedFunction<
	typeof useSearchParams
>;

// Mock the DAL functions
jest.mock('@/lib/dal', () => ({
	getTodayIsoDate: () => '2024-01-15',
	getAllChildren: jest.fn(),
	getChildrenForLeader: jest.fn(),
	getAttendanceForDate: jest.fn(),
	getIncidentsForDate: jest.fn(),
	getAllGuardians: jest.fn(),
	getAllHouseholds: jest.fn(),
	getAllEmergencyContacts: jest.fn(),
	getMinistries: jest.fn(),
	getMinistryEnrollmentsByCycle: jest.fn(),
	recordCheckIn: jest.fn(),
	recordCheckOut: jest.fn(),
	exportRosterCSV: jest.fn(),
}));

// Mock the database adapter
jest.mock('@/lib/db-utils', () => ({
	dbAdapter: {
		getChildren: jest.fn(),
		getAttendanceForDate: jest.fn(),
		getIncidentsForDate: jest.fn(),
		getGuardians: jest.fn(),
		getHouseholds: jest.fn(),
		getEmergencyContacts: jest.fn(),
		getMinistries: jest.fn(),
		getMinistryEnrollmentsByCycle: jest.fn(),
	},
}));

// Mock the hooks
jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		toast: jest.fn(),
	}),
}));

describe('Roster Component Grade Display Integration Test', () => {
	beforeEach(() => {
		// Mock auth context
		mockUseAuth.mockReturnValue({
			user: { user_id: 'test-user', role: 'admin' },
			loading: false,
			login: jest.fn(),
			logout: jest.fn(),
		});

		// Mock search params
		mockUseSearchParams.mockReturnValue(new URLSearchParams());
	});

	it('should render roster with correct grade labels using real student data', async () => {
		// Real student data from the user
		const realStudents = [
			{
				child_id: '4aa18d67-1fb5-4954-9cb2-6589824ff62b',
				household_id: '345a7689-e354-434a-bccc-f1303594f703',
				first_name: 'James',
				last_name: 'Smith',
				grade: '0', // Should display as "Kindergarten"
				is_active: true,
				created_at: '2025-09-28 07:06:41.086+00',
				updated_at: '2025-09-28 07:06:41.086+00',
				dob: '2020-03-12',
				allergies: '',
				medical_notes: '',
				special_needs: false,
				special_needs_notes: '',
				child_mobile: '',
				photo_url: null,
			},
			{
				child_id: '99b2bd0a-048d-4e24-8791-cdad2497c65a',
				household_id: '73b061e0-2c1c-41ff-ac0b-06b697d9704f',
				first_name: 'James',
				last_name: 'Smith',
				grade: '-1', // Should display as "Pre-K"
				is_active: true,
				created_at: '2025-09-28 07:20:03.422+00',
				updated_at: '2025-09-28 07:20:03.422+00',
				dob: '2020-03-12',
				allergies: '',
				medical_notes: '',
				special_needs: false,
				special_needs_notes: '',
				child_mobile: '1239658745',
				photo_url: null,
			},
		];

		// Mock the DAL functions to return our real student data
		const { getAllChildren, getAttendanceForDate } = require('@/lib/dal');
		getAllChildren.mockResolvedValue(realStudents);
		getAttendanceForDate.mockResolvedValue([]);

		// Mock other required data
		const { dbAdapter } = require('@/lib/db-utils');
		dbAdapter.getChildren.mockResolvedValue(realStudents);
		dbAdapter.getAttendanceForDate.mockResolvedValue([]);
		dbAdapter.getIncidentsForDate.mockResolvedValue([]);
		dbAdapter.getGuardians.mockResolvedValue([]);
		dbAdapter.getHouseholds.mockResolvedValue([]);
		dbAdapter.getEmergencyContacts.mockResolvedValue([]);
		dbAdapter.getMinistries.mockResolvedValue([]);
		dbAdapter.getMinistryEnrollmentsByCycle.mockResolvedValue([]);

		// Render the actual roster component
		render(<RostersPage />);

		// Wait for the component to load and check what's actually displayed
		await waitFor(
			() => {
				// Check that UI-friendly grade labels are displayed
				expect(screen.getByText('Kindergarten')).toBeInTheDocument();
				expect(screen.getByText('Pre-K')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		// Verify that raw grade values are NOT displayed in the Grade column
		// This is the critical test - we should NOT see the raw database values
		expect(screen.queryByText('0')).not.toBeInTheDocument();
		expect(screen.queryByText('-1')).not.toBeInTheDocument();

		// Log what we actually found for debugging
		const allText = screen.getByRole('table').textContent;
		console.log('Actual table content:', allText);

		// Check if the grade values are in the table
		if (allText.includes('0')) {
			console.log(
				'❌ Found raw grade "0" in table - this indicates the fix is not working'
			);
		} else {
			console.log('✅ No raw grade "0" found in table - fix is working');
		}

		if (allText.includes('-1')) {
			console.log(
				'❌ Found raw grade "-1" in table - this indicates the fix is not working'
			);
		} else {
			console.log('✅ No raw grade "-1" found in table - fix is working');
		}
	});

	it('should verify the Grade column specifically contains UI-friendly labels', async () => {
		const testStudents = [
			{
				child_id: 'test-1',
				household_id: 'household-1',
				first_name: 'Test',
				last_name: 'Student1',
				grade: '8', // Should display as "8th Grade"
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2010-01-01',
				allergies: '',
				medical_notes: '',
				special_needs: false,
				special_needs_notes: '',
				child_mobile: '',
				photo_url: null,
			},
			{
				child_id: 'test-2',
				household_id: 'household-2',
				first_name: 'Test',
				last_name: 'Student2',
				grade: '9', // Should display as "9th Grade"
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2009-01-01',
				allergies: '',
				medical_notes: '',
				special_needs: false,
				special_needs_notes: '',
				child_mobile: '',
				photo_url: null,
			},
		];

		// Mock the DAL functions
		const { getAllChildren, getAttendanceForDate } = require('@/lib/dal');
		getAllChildren.mockResolvedValue(testStudents);
		getAttendanceForDate.mockResolvedValue([]);

		const { dbAdapter } = require('@/lib/db-utils');
		dbAdapter.getChildren.mockResolvedValue(testStudents);
		dbAdapter.getAttendanceForDate.mockResolvedValue([]);
		dbAdapter.getIncidentsForDate.mockResolvedValue([]);
		dbAdapter.getGuardians.mockResolvedValue([]);
		dbAdapter.getHouseholds.mockResolvedValue([]);
		dbAdapter.getEmergencyContacts.mockResolvedValue([]);
		dbAdapter.getMinistries.mockResolvedValue([]);
		dbAdapter.getMinistryEnrollmentsByCycle.mockResolvedValue([]);

		render(<RostersPage />);

		// Wait for the component to load
		await waitFor(
			() => {
				expect(screen.getByText('8th Grade')).toBeInTheDocument();
				expect(screen.getByText('9th Grade')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		// Verify that raw grade values are NOT displayed
		expect(screen.queryByText('8')).not.toBeInTheDocument();
		expect(screen.queryByText('9')).not.toBeInTheDocument();

		// Verify that the wrong grade labels are NOT displayed (original bug)
		expect(screen.queryByText('7th Grade')).not.toBeInTheDocument(); // 8th was showing as 7th
		expect(screen.queryByText('8th Grade')).toBeInTheDocument(); // Should show 8th grade correctly
	});
});

import { render, screen, waitFor } from '@testing-library/react';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
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

describe('Roster Grade Display Integration Test', () => {
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

	it('should display UI-friendly grade labels in the Grade column', async () => {
		// Mock child data with various grade formats that were causing issues
		const mockChildren = [
			{
				child_id: '1',
				first_name: 'Alice',
				last_name: 'Smith',
				grade: '-1', // Should display as "Pre-K"
				household_id: 'h1',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2015-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
			{
				child_id: '2',
				first_name: 'Bob',
				last_name: 'Jones',
				grade: '0', // Should display as "Kindergarten"
				household_id: 'h2',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2014-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
			{
				child_id: '3',
				first_name: 'Charlie',
				last_name: 'Brown',
				grade: '8', // Should display as "8th Grade" (this was showing as "7th Grade")
				household_id: 'h3',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2010-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
			{
				child_id: '4',
				first_name: 'Diana',
				last_name: 'Davis',
				grade: '9', // Should display as "9th Grade" (this was showing as "8th Grade")
				household_id: 'h4',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2009-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
			{
				child_id: '5',
				first_name: 'Eve',
				last_name: 'Wilson',
				grade: '8th', // Should display as "8th Grade"
				household_id: 'h5',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2010-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
		];

		// Mock the DAL functions to return our test data
		const { getAllChildren, getAttendanceForDate } = require('@/lib/dal');
		getAllChildren.mockResolvedValue(mockChildren);
		getAttendanceForDate.mockResolvedValue([]);

		// Mock other required data
		const { dbAdapter } = require('@/lib/db-utils');
		dbAdapter.getChildren.mockResolvedValue(mockChildren);
		dbAdapter.getAttendanceForDate.mockResolvedValue([]);
		dbAdapter.getIncidentsForDate.mockResolvedValue([]);
		dbAdapter.getGuardians.mockResolvedValue([]);
		dbAdapter.getHouseholds.mockResolvedValue([]);
		dbAdapter.getEmergencyContacts.mockResolvedValue([]);
		dbAdapter.getMinistries.mockResolvedValue([]);
		dbAdapter.getMinistryEnrollmentsByCycle.mockResolvedValue([]);

		// Render the component
		render(<RostersPage />);

		// Wait for the component to load and check that grade labels are displayed correctly
		await waitFor(() => {
			// Check that UI-friendly grade labels are displayed
			expect(screen.getByText('Pre-K')).toBeInTheDocument();
			expect(screen.getByText('Kindergarten')).toBeInTheDocument();
			expect(screen.getByText('8th Grade')).toBeInTheDocument();
			expect(screen.getByText('9th Grade')).toBeInTheDocument();
		});

		// Verify that raw grade values are NOT displayed in the Grade column
		// This is the key test - we should NOT see the raw database values
		expect(screen.queryByText('-1')).not.toBeInTheDocument();
		expect(screen.queryByText('0')).not.toBeInTheDocument();
		expect(screen.queryByText('8')).not.toBeInTheDocument();
		expect(screen.queryByText('9')).not.toBeInTheDocument();
		expect(screen.queryByText('8th')).not.toBeInTheDocument();

		// Verify that the wrong grade labels are NOT displayed
		// This ensures the original bug is fixed
		expect(screen.queryByText('7th Grade')).not.toBeInTheDocument(); // 8th grade was showing as 7th
		expect(screen.queryByText('8th Grade')).toBeInTheDocument(); // Should show 8th grade correctly
	});

	it('should handle grouped by grade view correctly', async () => {
		// Mock child data with same grade
		const mockChildren = [
			{
				child_id: '1',
				first_name: 'Alice',
				last_name: 'Smith',
				grade: '8',
				household_id: 'h1',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2010-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
			{
				child_id: '2',
				first_name: 'Bob',
				last_name: 'Jones',
				grade: '8',
				household_id: 'h2',
				is_active: true,
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				dob: '2010-01-01',
				allergies: null,
				medical_notes: null,
				special_needs: false,
				special_needs_notes: null,
				child_mobile: null,
				photo_url: null,
			},
		];

		// Mock the DAL functions
		const { getAllChildren, getAttendanceForDate } = require('@/lib/dal');
		getAllChildren.mockResolvedValue(mockChildren);
		getAttendanceForDate.mockResolvedValue([]);

		const { dbAdapter } = require('@/lib/db-utils');
		dbAdapter.getChildren.mockResolvedValue(mockChildren);
		dbAdapter.getAttendanceForDate.mockResolvedValue([]);
		dbAdapter.getIncidentsForDate.mockResolvedValue([]);
		dbAdapter.getGuardians.mockResolvedValue([]);
		dbAdapter.getHouseholds.mockResolvedValue([]);
		dbAdapter.getEmergencyContacts.mockResolvedValue([]);
		dbAdapter.getMinistries.mockResolvedValue([]);
		dbAdapter.getMinistryEnrollmentsByCycle.mockResolvedValue([]);

		render(<RostersPage />);

		// Check that the group header shows the UI-friendly grade name
		await waitFor(() => {
			expect(screen.getByText('8th Grade (2)')).toBeInTheDocument();
		});

		// Verify raw grade value is not shown in the group header
		expect(screen.queryByText('8 (2)')).not.toBeInTheDocument();
	});

	it('should test the normalizeGradeDisplay function directly with problematic values', () => {
		// Test the specific values that were causing issues
		expect(normalizeGradeDisplay('-1')).toBe('Pre-K');
		expect(normalizeGradeDisplay('0')).toBe('Kindergarten');
		expect(normalizeGradeDisplay('8')).toBe('8th Grade');
		expect(normalizeGradeDisplay('9')).toBe('9th Grade');

		// Ensure the original bug is fixed
		expect(normalizeGradeDisplay('8')).not.toBe('7th Grade');
		expect(normalizeGradeDisplay('9')).not.toBe('8th Grade');

		// Test edge cases
		expect(normalizeGradeDisplay('8th')).toBe('8th Grade');
		expect(normalizeGradeDisplay('9th')).toBe('9th Grade');
		expect(normalizeGradeDisplay('8th grade')).toBe('8th Grade');
		expect(normalizeGradeDisplay('9th grade')).toBe('9th Grade');
	});
});

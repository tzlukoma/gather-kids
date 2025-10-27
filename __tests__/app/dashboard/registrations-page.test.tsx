import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegistrationsPage from '@/app/dashboard/registrations/page';
import { mockUsers, MockAuthProvider } from '@/test-utils/auth/test-utils';
import type { Household, Child, Ministry } from '@/lib/types';

// Mock the hooks
jest.mock('@/hooks/data', () => ({
	useHouseholdList: jest.fn(),
}));

jest.mock('@/hooks/data/ministries', () => ({
	useMinistries: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
	}),
}));

// Import the mocked hooks
import { useHouseholdList } from '@/hooks/data';
import { useMinistries } from '@/hooks/data/ministries';

const mockUseHouseholdList = useHouseholdList as jest.MockedFunction<
	typeof useHouseholdList
>;
const mockUseMinistries = useMinistries as jest.MockedFunction<
	typeof useMinistries
>;

// Test data
const mockChild1: Child & { age: number | null } = {
	child_id: 'child-1',
	household_id: 'household-1',
	first_name: 'John',
	last_name: 'Doe',
	dob: '2015-06-15',
	grade: '3',
	is_active: true,
	age: 8,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

const mockChild2: Child & { age: number | null } = {
	child_id: 'child-2',
	household_id: 'household-1',
	first_name: 'Jane',
	last_name: 'Doe',
	dob: '2017-03-20',
	grade: '1',
	is_active: true,
	age: 6,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

const mockHousehold: Household & {
	children: (Child & { age: number | null })[];
} = {
	household_id: 'household-1',
	name: 'Doe Family',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	children: [mockChild1, mockChild2],
};

const mockMinistry: Ministry = {
	ministry_id: 'ministry-1',
	name: 'Sunday School',
	code: 'min_sunday_school',
	is_active: true,
	enrollment_type: 'enrolled',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
};

describe('RegistrationsPage', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});

		// Reset mocks
		jest.clearAllMocks();
	});

	const renderWithProviders = (
		ui: React.ReactElement,
		user = mockUsers.admin
	) => {
		return render(
			<QueryClientProvider client={queryClient}>
				<MockAuthProvider user={user}>{ui}</MockAuthProvider>
			</QueryClientProvider>
		);
	};

	test('displays child data in the registrations table', async () => {
		// Mock the hooks to return test data
		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		// Wait for the component to render
		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Verify that child names and ages are displayed
		expect(screen.getByText('John (8), Jane (6)')).toBeInTheDocument();

		// Verify the table structure
		expect(screen.getByText('Household Name')).toBeInTheDocument();
		expect(screen.getByText('Registration Date')).toBeInTheDocument();
		expect(screen.getByText('Children')).toBeInTheDocument();
	});

	test('displays empty state when no households are found', async () => {
		// Mock empty data
		mockUseHouseholdList.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		await waitFor(() => {
			expect(
				screen.getByText('No households match the current filter.')
			).toBeInTheDocument();
		});
	});

	test('displays loading state', () => {
		// Mock loading state
		mockUseHouseholdList.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		expect(screen.getByText('Loading registrations...')).toBeInTheDocument();
	});

	test('handles ministry leader with no assigned ministries', async () => {
		const ministryLeaderUser = {
			...mockUsers.ministryLeader,
			assignedMinistryIds: undefined,
		};

		mockUseHouseholdList.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />, ministryLeaderUser);

		await waitFor(() => {
			expect(screen.getByText('No Ministry Assigned')).toBeInTheDocument();
			expect(
				screen.getByText(/Your email address.*is not currently associated/)
			).toBeInTheDocument();
		});
	});

	test('calls useHouseholdList with correct parameters for ministry leader', async () => {
		const ministryLeaderUser = {
			...mockUsers.ministryLeader,
			assignedMinistryIds: ['ministry-1', 'ministry-2'],
		};

		mockUseHouseholdList.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />, ministryLeaderUser);

		// Wait for the useEffect to run and set the ministryFilterIds
		await waitFor(() => {
			expect(mockUseHouseholdList).toHaveBeenCalledWith(
				['ministry-1', 'ministry-2'],
				undefined
			);
		});
	});

	test('filters households by search term', async () => {
		// Add additional test data
		const mockHousehold2 = {
			household_id: 'household-2',
			name: 'Smith Family',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			children: [
				{
					child_id: 'child-3',
					household_id: 'household-2',
					first_name: 'Alice',
					last_name: 'Smith',
					age: 10,
				},
			],
		};

		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold, mockHousehold2],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		// Wait for initial render
		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Find search input and type
		const searchInput = screen.getByPlaceholderText(
			/Search by household or child name/
		);
		fireEvent.change(searchInput, { target: { value: 'Smith' } });

		// Verify only Smith Family is visible
		await waitFor(() => {
			expect(screen.getByText('Smith Family')).toBeInTheDocument();
			expect(screen.queryByText('Doe Family')).not.toBeInTheDocument();
		});
	});

	test('filters households by child name', async () => {
		// Add additional test data
		const mockHousehold2 = {
			household_id: 'household-2',
			name: 'Smith Family',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			children: [
				{
					child_id: 'child-3',
					household_id: 'household-2',
					first_name: 'Alice',
					last_name: 'Smith',
					age: 10,
				},
			],
		};

		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold, mockHousehold2],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		// Wait for initial render
		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Search by child name
		const searchInput = screen.getByPlaceholderText(
			/Search by household or child name/
		);
		fireEvent.change(searchInput, { target: { value: 'Jane' } });

		// Verify only Doe Family is visible (has child Jane)
		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
			expect(screen.queryByText('Smith Family')).not.toBeInTheDocument();
		});
	});

	test('displays filter pill when search term is active', async () => {
		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Type in search
		const searchInput = screen.getByPlaceholderText(
			/Search by household or child name/
		);
		fireEvent.change(searchInput, { target: { value: 'Doe' } });

		// Verify filter pill appears
		await waitFor(() => {
			expect(screen.getByText('Search: Doe')).toBeInTheDocument();
		});
	});

	test('clears search when clicking X on filter pill', async () => {
		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Type in search
		const searchInput = screen.getByPlaceholderText(
			/Search by household or child name/
		);
		fireEvent.change(searchInput, { target: { value: 'Doe' } });

		// Wait for filter pill to appear
		await waitFor(() => {
			expect(screen.getByText('Search: Doe')).toBeInTheDocument();
		});

		// Click X on the filter pill
		const clearButton = screen.getByText('Search: Doe').nextElementSibling;
		if (clearButton) {
			fireEvent.click(clearButton);
		}

		// Verify search is cleared
		await waitFor(() => {
			expect(screen.queryByText('Search: Doe')).not.toBeInTheDocument();
			expect(searchInput).toHaveValue('');
		});
	});

	test('shows empty state when search returns no results', async () => {
		const mockHousehold2 = {
			household_id: 'household-2',
			name: 'Smith Family',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			children: [],
		};

		mockUseHouseholdList.mockReturnValue({
			data: [mockHousehold, mockHousehold2],
			isLoading: false,
			error: null,
		} as any);

		mockUseMinistries.mockReturnValue({
			data: [mockMinistry],
			isLoading: false,
			error: null,
		} as any);

		renderWithProviders(<RegistrationsPage />);

		await waitFor(() => {
			expect(screen.getByText('Doe Family')).toBeInTheDocument();
		});

		// Search for something that doesn't exist
		const searchInput = screen.getByPlaceholderText(
			/Search by household or child name/
		);
		fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

		// Verify empty state message
		await waitFor(() => {
			expect(
				screen.getByText('No households match the current filter.')
			).toBeInTheDocument();
		});
	});
});

import React from 'react';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import crypto from 'crypto';

// Import database to set up test data
import { db } from '@/lib/db';

// Mock data that can be updated
let mockScriptureData = {
	scriptures: [
		{
			id: 'test-student-scripture-1',
			child_id: 'test-child',
			bible_bee_cycle_id: 'test-cycle-1',
			scripture_id: 'test-scripture-1',
			is_completed: false,
			status: 'assigned', // This is what the component checks for completion
			completed_at: undefined,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			scripture: {
				id: 'test-scripture-1',
				bible_bee_cycle_id: 'test-cycle-1',
				reference: 'John 3:16',
				text: 'For God so loved the world...',
				translation: 'NIV',
				counts_for: 1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		},
	],
	essays: [],
};

// Mock the hooks that the component needs
jest.mock('@/hooks/data', () => ({
	useChild: jest.fn().mockReturnValue({
		data: {
			id: 'test-child',
			household_id: 'test-household',
			first_name: 'Test',
			last_name: 'Child',
			birth_date: '2010-01-01',
			grade: '5',
		},
		isLoading: false,
	}),
	useHousehold: jest.fn().mockReturnValue({
		data: {
			id: 'test-household',
			name: 'Test Household',
		},
		isLoading: false,
	}),
	useHouseholdProfile: jest.fn().mockReturnValue({
		data: {
			household: {
				id: 'test-household',
				name: 'Test Household',
			},
			guardians: [
				{
					guardian_id: 'test-guardian-1',
					household_id: 'test-household',
					first_name: 'Test',
					last_name: 'Guardian',
					is_primary: true,
					relationship: 'Parent',
				},
			],
		},
		isLoading: false,
		error: null,
	}),
	useGuardians: jest.fn().mockReturnValue({
		data: [],
		isLoading: false,
	}),
	// Mock the missing Bible Bee hooks
	useStudentAssignmentsQuery: jest.fn().mockImplementation(() => ({
		data: mockScriptureData,
		isLoading: false,
	})),
	useToggleScriptureMutation: jest.fn().mockReturnValue({
		mutate: jest.fn().mockImplementation((variables) => {
			// Update the mock data
			mockScriptureData.scriptures[0].status = 'completed';
		}),
	}),
	useSubmitEssayMutation: jest.fn().mockReturnValue({
		mutate: jest.fn(),
	}),
	useBibleBeeStats: jest.fn().mockReturnValue({
		data: {
			bbStats: {
				requiredScriptures: 1,
				completedScriptures: 0,
				percentDone: 0,
				bonus: 0,
				division: {
					name: 'Test Division',
					min_grade: 1,
					max_grade: 5,
				},
				essayAssigned: false,
			},
			essaySummary: null,
			divisionEssayPrompts: [],
		},
		isLoading: false,
	}),
}));

const mockEnrollment = {
	id: 'test-enrollment-1',
	child_id: 'test-child',
	bible_bee_cycle_id: 'test-cycle-1',
	division_id: 'test-division-1',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const mockScripture = {
	id: 'test-scripture-1',
	bible_bee_cycle_id: 'test-cycle-1',
	reference: 'John 3:16',
	text: 'For God so loved the world...',
	translation: 'NIV',
	counts_for: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const mockStudentScripture = {
	id: 'test-student-scripture-1',
	child_id: 'test-child',
	bible_bee_cycle_id: 'test-cycle-1',
	scripture_id: 'test-scripture-1',
	is_completed: false,
	status: 'assigned', // This is what the component checks for completion
	completed_at: undefined,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

// Create mock dbAdapter
const mockDbAdapter = {
	listEnrollments: jest.fn().mockResolvedValue([mockEnrollment]),
	listScriptures: jest.fn().mockResolvedValue([mockScripture]),
	listStudentScriptures: jest.fn().mockResolvedValue([mockStudentScripture]),
	listStudentEssays: jest.fn().mockResolvedValue([]),
	listEssayPrompts: jest.fn().mockResolvedValue([]),
	createStudentScripture: jest.fn().mockResolvedValue(mockStudentScripture),
	updateStudentScripture: jest.fn().mockImplementation(async (id, data) => ({
		...mockStudentScripture,
		...data,
	})),
};

jest.mock('@/lib/dal', () => ({
	dbAdapter: mockDbAdapter,
	// Re-export any other DAL functions that might be needed
	shouldUseAdapter: jest.fn().mockReturnValue(true),
	getChild: jest.fn().mockResolvedValue({
		id: 'test-child',
		household_id: 'test-household',
		first_name: 'Test',
		last_name: 'Child',
		birth_date: '2010-01-01',
		grade: '5',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}),
	getHousehold: jest.fn().mockResolvedValue({
		id: 'test-household',
		name: 'Test Household',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}),
	listGuardians: jest.fn().mockResolvedValue([]),
	getEssayPromptsForYearAndDivision: jest.fn().mockResolvedValue([]),
	updateChildPhoto: jest.fn().mockResolvedValue(undefined),
}));

// Mock db-utils to return the same mocked dbAdapter
jest.mock('@/lib/db-utils', () => ({
	dbAdapter: mockDbAdapter,
	isSupabase: jest.fn().mockReturnValue(false),
	getDatabaseMode: jest.fn().mockReturnValue('indexeddb'),
}));

// Mock next/navigation useParams to return our test childId before importing the page
jest.mock('next/navigation', () => ({
	useParams: () => ({ childId: 'test-child' }),
}));

const ChildBibleBeePage =
	require('@/app/household/children/[childId]/bible-bee/page').default;

describe('Child Bible Bee UI', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	it('shows assigned scripture and calls toggle mutation when clicked', async () => {
		const mockMutate = jest.fn();
		const { useToggleScriptureMutation } = require('@/hooks/data');
		useToggleScriptureMutation.mockReturnValue({
			mutate: mockMutate,
		});

		renderWithAuth(<ChildBibleBeePage />, {
			user: mockUsers.guardian,
			userRole: 'GUARDIAN',
		});

		// wait for scripture card to appear
		await waitFor(() =>
			expect(screen.getByText(/John 3:16/)).toBeInTheDocument()
		);

		// find the mark-completed button (component renders a button with aria-label)
		const toggleBtn = screen.getByRole('button', { name: /Mark completed/i });
		expect(toggleBtn).toBeInTheDocument();
		expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');

		// toggle
		fireEvent.click(toggleBtn);

		// Check that the mutation was called with the correct parameters
		expect(mockMutate).toHaveBeenCalledWith({
			id: 'test-student-scripture-1',
			complete: true,
		});
	});
});

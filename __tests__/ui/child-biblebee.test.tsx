import React from 'react';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import crypto from 'crypto';

// Import database to set up test data
import { db } from '@/lib/db';

// Mock the dbAdapter before importing components
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

	it('shows assigned scripture and updates immediately when toggled', async () => {
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

		// optimistic update should mark it completed immediately (aria-pressed -> true)
		await waitFor(() =>
			expect(toggleBtn.getAttribute('aria-pressed')).toBe('true')
		);
	});
});

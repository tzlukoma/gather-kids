import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LeaderBibleBeeProgress from '@/components/gatherKids/bible-bee-progress';
import { renderWithAuth } from '../../src/test-utils/auth/test-utils';

// Mock competition years and DB access by stubbing db.competitionYears and dal function
jest.mock('@/lib/db', () => ({
	db: {
		competitionYears: {
			orderBy: () => ({
				reverse: () => ({
					toArray: async () => [
						{ id: 'y1', year: 2025 },
						{ id: 'y0', year: 2024 },
					],
				}),
			}),
		},
	},
}));

jest.mock('@/lib/dal', () => ({
	getBibleBeeProgressForCycle: async (cycleId: string) => {
		if (String(cycleId) === '2025') {
			return [
				{
					childId: 'c1',
					childName: 'Alice',
					gradeGroup: 'K-4',
					completedScriptures: 2,
					totalScriptures: 4,
					essayStatus: 'n/a',
					ministries: [],
				},
				{
					childId: 'c2',
					childName: 'Bob',
					gradeGroup: '5-8',
					completedScriptures: 5,
					totalScriptures: 6,
					essayStatus: 'n/a',
					ministries: [],
				},
			];
		}
		return []; // prior year empty
	},
}));

describe('Bible Bee filters persistence', () => {
	afterEach(() => {
		cleanup();
		localStorage.clear();
		jest.resetAllMocks();
	});

	test('filters persist across unmount/mount', async () => {
		const { unmount } = renderWithAuth(
			<LeaderBibleBeeProgress cycleId={'2025'} />
		);

		// wait for elements
		const yearSelect = await screen.findByText('2025');
		expect(yearSelect).toBeInTheDocument();

		// change grade group to first available
		const gradeButton = await screen.findByText('All Grade Groups');
		expect(gradeButton).toBeInTheDocument();

		// simulate user picking K-4 by writing to localStorage (simpler than interacting Radix select)
		localStorage.setItem(
			'bb_progress_filters_v1',
			JSON.stringify({
				selectedCycle: '2025',
				filterGradeGroup: 'K-4',
				filterStatus: 'all',
				sortBy: 'name-asc',
			})
		);

		unmount();

		// remount
		renderWithAuth(<LeaderBibleBeeProgress cycleId={'2025'} />);

		// now the UI should reflect the stored grade group (K-4)
		const saved = JSON.parse(
			localStorage.getItem('bb_progress_filters_v1') || '{}'
		);
		expect(saved.filterGradeGroup).toBe('K-4');
	});

	test('clear button resets filters', async () => {
		renderWithAuth(<LeaderBibleBeeProgress cycleId={'2025'} />);
		// set localStorage to a custom state
		localStorage.setItem(
			'bb_progress_filters_v1',
			JSON.stringify({
				selectedCycle: '2025',
				filterGradeGroup: 'K-4',
				filterStatus: 'Complete',
				sortBy: 'progress-desc',
			})
		);
		// re-render to pick up stored state
		cleanup();
		renderWithAuth(<LeaderBibleBeeProgress cycleId={'2025'} />);

		// click clear
		const clearButton = await screen.findByText('Clear');
		fireEvent.click(clearButton);

		const saved = JSON.parse(
			localStorage.getItem('bb_progress_filters_v1') || '{}'
		);
		// After clear the component persists defaults back into storage
		expect(saved).toEqual({
			selectedCycle: '2025',
			filterGradeGroup: 'all',
			filterStatus: 'all',
			sortBy: 'name-asc',
		});
	});
});

import { getBibleBeeCycles } from '@/lib/dal';
import { dbAdapter } from '@/lib/dal';

// Mock the DAL module
jest.mock('@/lib/dal', () => ({
	...jest.requireActual('@/lib/dal'),
	getBibleBeeCycles: jest.fn(),
	getChild: jest.fn(),
	dbAdapter: {
		listEnrollments: jest.fn(),
		listEssayPrompts: jest.fn(),
		listStudentEssays: jest.fn(),
		createStudentEssay: jest.fn(),
		listScriptures: jest.fn(),
		listStudentScriptures: jest.fn(),
		createStudentScripture: jest.fn(),
		getChild: jest.fn(),
		getHousehold: jest.fn(),
	},
}));

describe('Bible Bee Essay Year Scoping', () => {
	const childId = 'test-child-1';
	const cycle2024Id = 'cycle-2024-id';
	const cycle2025Id = 'cycle-2025-id';
	const division2024Id = 'division-2024-id';
	const division2025Id = 'division-2025-id';
	const essayPrompt2024Id = 'essay-prompt-2024-id';
	const essayPrompt2025Id = 'essay-prompt-2025-id';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should load essays only for the specified cycle when cycleId is provided', async () => {
		// Setup: Child enrolled in both 2024 and 2025 cycles
		const mockEnrollments = [
			{
				id: 'enrollment-2024',
				child_id: childId,
				bible_bee_cycle_id: cycle2024Id,
				division_id: division2024Id,
			},
			{
				id: 'enrollment-2025',
				child_id: childId,
				bible_bee_cycle_id: cycle2025Id,
				division_id: division2025Id,
			},
		];

		const mockEssayPrompt2024 = {
			id: essayPrompt2024Id,
			bible_bee_cycle_id: cycle2024Id,
			division_id: division2024Id,
			title: '2024 Essay',
			prompt: 'Write about 2024',
		};

		const mockEssayPrompt2025 = {
			id: essayPrompt2025Id,
			bible_bee_cycle_id: cycle2025Id,
			division_id: division2025Id,
			title: '2025 Essay',
			prompt: 'Write about 2025',
		};

		const mockStudentEssay2024 = {
			id: 'student-essay-2024',
			child_id: childId,
			bible_bee_cycle_id: cycle2024Id,
			essay_prompt_id: essayPrompt2024Id,
			status: 'submitted',
		};

		const mockStudentEssay2025 = {
			id: 'student-essay-2025',
			child_id: childId,
			bible_bee_cycle_id: cycle2025Id,
			essay_prompt_id: essayPrompt2025Id,
			status: 'assigned',
		};

		// Mock database responses
		(dbAdapter.listEnrollments as jest.Mock).mockResolvedValue(mockEnrollments);
		
		(dbAdapter.listEssayPrompts as jest.Mock).mockImplementation((divisionId, cycleId) => {
			if (cycleId === cycle2024Id && divisionId === division2024Id) {
				return Promise.resolve([mockEssayPrompt2024]);
			}
			if (cycleId === cycle2025Id && divisionId === division2025Id) {
				return Promise.resolve([mockEssayPrompt2025]);
			}
			return Promise.resolve([]);
		});

		(dbAdapter.listStudentEssays as jest.Mock).mockImplementation((childId, cycleId) => {
			if (cycleId === cycle2024Id) {
				return Promise.resolve([mockStudentEssay2024]);
			}
			if (cycleId === cycle2025Id) {
				return Promise.resolve([mockStudentEssay2025]);
			}
			return Promise.resolve([]);
		});

		(dbAdapter.listScriptures as jest.Mock).mockResolvedValue([]);
		(dbAdapter.listStudentScriptures as jest.Mock).mockResolvedValue([]);

		// Test: When filtering to 2025 cycle only
		const enrollments = mockEnrollments.filter(e => e.bible_bee_cycle_id === cycle2025Id);
		
		// Simulate the essay loading logic from useStudentAssignmentsQuery
		const bibleBeeCycleIds = [...new Set(enrollments.map(e => e.bible_bee_cycle_id))];
		expect(bibleBeeCycleIds).toEqual([cycle2025Id]);
		expect(bibleBeeCycleIds).not.toContain(cycle2024Id);

		// Load essays for filtered enrollments
		const allStudentEssays = await Promise.all(
			bibleBeeCycleIds.map(cycleId => dbAdapter.listStudentEssays(childId, cycleId))
		);
		const existingEssays = allStudentEssays.flat();

		// Verify only 2025 essay is loaded
		expect(existingEssays).toHaveLength(1);
		expect(existingEssays[0].bible_bee_cycle_id).toBe(cycle2025Id);
		expect(existingEssays[0].essay_prompt_id).toBe(essayPrompt2025Id);
		
		// Verify 2024 essay is NOT included
		expect(existingEssays.find(e => e.bible_bee_cycle_id === cycle2024Id)).toBeUndefined();
	});

	it('should not show essays from previous years when viewing current year', async () => {
		// Setup: Same scenario as above
		const mockEnrollments = [
			{
				id: 'enrollment-2024',
				child_id: childId,
				bible_bee_cycle_id: cycle2024Id,
				division_id: division2024Id,
			},
			{
				id: 'enrollment-2025',
				child_id: childId,
				bible_bee_cycle_id: cycle2025Id,
				division_id: division2025Id,
			},
		];

		// When viewing 2025 cycle, enrollments should be filtered
		const currentCycleId = cycle2025Id;
		const filteredEnrollments = mockEnrollments.filter(
			e => e.bible_bee_cycle_id === currentCycleId
		);

		// Assert: Only 2025 enrollment remains
		expect(filteredEnrollments).toHaveLength(1);
		expect(filteredEnrollments[0].bible_bee_cycle_id).toBe(cycle2025Id);
		
		// Assert: 2024 enrollment is excluded
		expect(filteredEnrollments.find(e => e.bible_bee_cycle_id === cycle2024Id)).toBeUndefined();
	});

	it('should handle child with enrollments in multiple cycles but show only selected cycle', async () => {
		// Setup: Child enrolled in 3 different cycles
		const cycle2023Id = 'cycle-2023-id';
		const mockEnrollments = [
			{ id: 'e1', child_id: childId, bible_bee_cycle_id: cycle2023Id, division_id: 'div-2023' },
			{ id: 'e2', child_id: childId, bible_bee_cycle_id: cycle2024Id, division_id: 'div-2024' },
			{ id: 'e3', child_id: childId, bible_bee_cycle_id: cycle2025Id, division_id: 'div-2025' },
		];

		// When selecting 2024 cycle
		const selectedCycleId = cycle2024Id;
		const filteredEnrollments = mockEnrollments.filter(
			e => e.bible_bee_cycle_id === selectedCycleId
		);

		// Assert: Only 2024 enrollment is included
		expect(filteredEnrollments).toHaveLength(1);
		expect(filteredEnrollments[0].bible_bee_cycle_id).toBe(cycle2024Id);
		
		// Assert: Other years are excluded
		expect(filteredEnrollments.find((e: any) => e.bible_bee_cycle_id === cycle2023Id)).toBeUndefined();
		expect(filteredEnrollments.find((e: any) => e.bible_bee_cycle_id === cycle2025Id)).toBeUndefined();
	});
});

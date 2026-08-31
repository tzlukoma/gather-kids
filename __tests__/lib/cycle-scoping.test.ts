import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/database/factory', () => {
	const mockAdapter = {
		listRegistrations: jest.fn(),
		listMinistryEnrollments: jest.fn(),
		listChildren: jest.fn(),
		listRegistrationCycles: jest.fn(),
		listHouseholds: jest.fn(),
	};
	return {
		createDatabaseAdapter: jest.fn(() => mockAdapter),
		db: mockAdapter,
	};
});

// CJS require after mock — matches existing DAL tests in this repo
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db: mockAdapter } = require('@/lib/database/factory') as {
	db: {
		listRegistrations: jest.Mock;
		listMinistryEnrollments: jest.Mock;
		listChildren: jest.Mock;
	};
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
	mergeChildIdsForCycleScope,
	getChildIdsForCycle,
	householdIdsForCycle,
	getRegistrationStatsForCycle,
} = require('@/lib/dal/cycle-scoping') as typeof import('@/lib/dal/cycle-scoping');

describe('mergeChildIdsForCycleScope', () => {
	it('returns registration ids only', () => {
		expect(
			mergeChildIdsForCycleScope(['a', 'b'], ['b', 'c'], 'registration').sort(),
		).toEqual(['a', 'b']);
	});

	it('returns enrollment ids only', () => {
		expect(
			mergeChildIdsForCycleScope(['a', 'b'], ['b', 'c'], 'enrollment').sort(),
		).toEqual(['b', 'c']);
	});

	it('unions registration and enrollment ids', () => {
		expect(
			mergeChildIdsForCycleScope(['a', 'b'], ['b', 'c'], 'union').sort(),
		).toEqual(['a', 'b', 'c']);
	});
});

describe('getChildIdsForCycle', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('includes registration-only and enrollment-only children in union mode', async () => {
		mockAdapter.listRegistrations.mockResolvedValue([
			{ child_id: 'reg-only' },
			{ child_id: 'both' },
		]);
		mockAdapter.listMinistryEnrollments.mockResolvedValue([
			{ child_id: 'both', status: 'enrolled' },
			{ child_id: 'enroll-only', status: 'enrolled' },
			{ child_id: 'interest-only', status: 'expressed_interest' },
		]);

		const ids = await getChildIdsForCycle('cycle-1', 'union');
		expect(ids.sort()).toEqual(['both', 'enroll-only', 'reg-only']);
	});

	it('excludes non-enrolled statuses in enrollment mode', async () => {
		mockAdapter.listRegistrations.mockResolvedValue([]);
		mockAdapter.listMinistryEnrollments.mockResolvedValue([
			{ child_id: 'enrolled', status: 'enrolled' },
			{ child_id: 'interest', status: 'expressed_interest' },
		]);

		const ids = await getChildIdsForCycle('cycle-1', 'enrollment');
		expect(ids).toEqual(['enrolled']);
	});

	it('uses registrations only when mode is registration', async () => {
		mockAdapter.listRegistrations.mockResolvedValue([{ child_id: 'a' }]);
		mockAdapter.listMinistryEnrollments.mockResolvedValue([
			{ child_id: 'b', status: 'enrolled' },
		]);

		const ids = await getChildIdsForCycle('cycle-1', 'registration');
		expect(ids).toEqual(['a']);
		expect(mockAdapter.listMinistryEnrollments).not.toHaveBeenCalled();
	});
});

describe('householdIdsForCycle and getRegistrationStatsForCycle', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('excludes inactive children from household and stats counts', async () => {
		mockAdapter.listRegistrations.mockResolvedValue([
			{ child_id: 'active-kid' },
			{ child_id: 'inactive-kid' },
		]);
		mockAdapter.listMinistryEnrollments.mockResolvedValue([]);
		mockAdapter.listChildren.mockResolvedValue([
			{
				child_id: 'active-kid',
				household_id: 'hh-1',
				is_active: true,
			},
			{
				child_id: 'inactive-kid',
				household_id: 'hh-2',
				is_active: false,
			},
			{
				child_id: 'other-active',
				household_id: 'hh-3',
				is_active: true,
			},
		]);

		const householdIds = await householdIdsForCycle('cycle-1', 'registration');
		expect(householdIds).toEqual(['hh-1']);

		const stats = await getRegistrationStatsForCycle('cycle-1', 'registration');
		expect(stats).toEqual({
			householdCount: 1,
			childCount: 1,
			cycleId: 'cycle-1',
		});
	});
});

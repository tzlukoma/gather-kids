import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/database/factory', () => {
	const mockAdapter = {
		listHouseholds: jest.fn(),
		listChildren: jest.fn(),
		listRegistrations: jest.fn(),
		listMinistryEnrollments: jest.fn(),
		listRegistrationCycles: jest.fn(),
	};
	return {
		createDatabaseAdapter: jest.fn(() => mockAdapter),
		db: mockAdapter,
	};
});

const { db: mockAdapter } = require('@/lib/database/factory') as {
	db: {
		listHouseholds: jest.Mock;
		listChildren: jest.Mock;
		listRegistrations: jest.Mock;
		listMinistryEnrollments: jest.Mock;
		listRegistrationCycles: jest.Mock;
	};
};

const {
	aggregateHouseholdRegistrationDates,
	queryHouseholdList,
} = require('@/lib/dal/households') as typeof import('@/lib/dal/households');

const ACTIVE_CYCLE = {
	cycle_id: 'cycle-2026',
	name: 'Fall 2026',
	is_active: true,
	start_date: '2026-08-01',
	end_date: '2027-06-30',
	updated_at: '2026-08-01T00:00:00.000Z',
};

const PRIOR_CYCLE_ID = 'cycle-2025';

const returningHousehold = {
	household_id: 'hh-returning',
	name: 'Returning Family',
	created_at: '2024-01-15T00:00:00.000Z',
	updated_at: '2024-01-15T00:00:00.000Z',
};

const otherHousehold = {
	household_id: 'hh-other',
	name: 'Other Family',
	created_at: '2023-09-01T00:00:00.000Z',
	updated_at: '2023-09-01T00:00:00.000Z',
};

const currentChild = {
	child_id: 'child-current',
	household_id: 'hh-returning',
	first_name: 'Maya',
	last_name: 'Returning',
	dob: '2016-04-01',
	is_active: true,
};

const siblingCurrent = {
	child_id: 'child-sibling',
	household_id: 'hh-returning',
	first_name: 'Noah',
	last_name: 'Returning',
	dob: '2018-09-01',
	is_active: true,
};

const historicalChild = {
	child_id: 'child-historical',
	household_id: 'hh-returning',
	first_name: 'Ava',
	last_name: 'Returning',
	dob: '2012-01-01',
	is_active: true,
};

const enrollmentOnlyChild = {
	child_id: 'child-enrolled-only',
	household_id: 'hh-returning',
	first_name: 'Eli',
	last_name: 'Returning',
	dob: '2017-02-01',
	is_active: true,
};

const otherCycleChild = {
	child_id: 'child-other',
	household_id: 'hh-other',
	first_name: 'Sam',
	last_name: 'Other',
	dob: '2015-01-01',
	is_active: true,
};

function setupAdapter({
	households = [returningHousehold, otherHousehold],
	children = [
		currentChild,
		siblingCurrent,
		historicalChild,
		enrollmentOnlyChild,
		otherCycleChild,
	],
	registrations = [],
	enrollments = [],
	cycles = [ACTIVE_CYCLE],
}: {
	households?: typeof returningHousehold[];
	children?: Array<Record<string, unknown>>;
	registrations?: Array<Record<string, unknown>>;
	enrollments?: Array<Record<string, unknown>>;
	cycles?: Array<Record<string, unknown>>;
} = {}) {
	mockAdapter.listHouseholds.mockResolvedValue(households);
	mockAdapter.listRegistrationCycles.mockResolvedValue(cycles);
	mockAdapter.listChildren.mockImplementation(async (filters?: { isActive?: boolean }) => {
		if (filters?.isActive) {
			return children.filter((child) => child.is_active !== false);
		}
		return children;
	});
	mockAdapter.listRegistrations.mockImplementation(async (filters?: { cycleId?: string }) => {
		if (filters?.cycleId) {
			return registrations.filter((row) => row.cycle_id === filters.cycleId);
		}
		return registrations;
	});
	mockAdapter.listMinistryEnrollments.mockImplementation(
		async (_childId?: string, _ministryId?: string, cycleId?: string) => {
			if (cycleId) {
				return enrollments.filter((row) => row.cycle_id === cycleId);
			}
			return enrollments;
		},
	);
}

describe('aggregateHouseholdRegistrationDates', () => {
	it('uses earliest household submission and latest active-cycle submission', () => {
		const result = aggregateHouseholdRegistrationDates(
			[
				{
					child_id: 'a',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-08-10T12:00:00.000Z',
				},
				{
					child_id: 'b',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-01T09:00:00.000Z',
				},
				{
					child_id: 'b',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-04T15:00:00.000Z',
				},
			],
			['a', 'b'],
			'cycle-2026',
		);

		expect(result.original_registration_submitted_at).toBe(
			'2025-08-10T12:00:00.000Z',
		);
		expect(result.latest_registration_submitted_at).toBe(
			'2026-09-04T15:00:00.000Z',
		);
	});

	it('does not substitute an enrollment timestamp when no active-cycle registration exists', () => {
		const result = aggregateHouseholdRegistrationDates(
			[
				{
					child_id: 'a',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-08-10T12:00:00.000Z',
				},
			],
			['a', 'enrolled-only'],
			'cycle-2026',
		);

		expect(result.original_registration_submitted_at).toBe(
			'2025-08-10T12:00:00.000Z',
		);
		expect(result.latest_registration_submitted_at).toBeNull();
	});
});

describe('queryHouseholdList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns original and latest registration dates for a returning household', async () => {
		setupAdapter({
			children: [currentChild, siblingCurrent],
			registrations: [
				{
					child_id: 'child-current',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-08-12T10:00:00.000Z',
				},
				{
					child_id: 'child-sibling',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-02T11:00:00.000Z',
				},
				{
					child_id: 'child-current',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-05T16:00:00.000Z',
				},
			],
		});

		const rows = await queryHouseholdList();
		expect(rows).toHaveLength(1);
		expect(rows[0].household_id).toBe('hh-returning');
		expect(rows[0].original_registration_submitted_at).toBe(
			'2025-08-12T10:00:00.000Z',
		);
		expect(rows[0].latest_registration_submitted_at).toBe(
			'2026-09-05T16:00:00.000Z',
		);
		expect(rows[0].children.map((child) => child.child_id).sort()).toEqual([
			'child-current',
			'child-sibling',
		]);
	});

	it('excludes historical-only children from the displayed child list', async () => {
		setupAdapter({
			children: [currentChild, historicalChild],
			registrations: [
				{
					child_id: 'child-historical',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-08-01T00:00:00.000Z',
				},
				{
					child_id: 'child-current',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-01T00:00:00.000Z',
				},
			],
		});

		const [row] = await queryHouseholdList();
		expect(row.children.map((child) => child.child_id)).toEqual(['child-current']);
		expect(row.original_registration_submitted_at).toBe(
			'2025-08-01T00:00:00.000Z',
		);
	});

	it('leaves latest registration blank when the household is in cycle only via enrollment', async () => {
		setupAdapter({
			children: [enrollmentOnlyChild, historicalChild],
			registrations: [
				{
					child_id: 'child-historical',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-07-01T00:00:00.000Z',
				},
			],
			enrollments: [
				{
					child_id: 'child-enrolled-only',
					ministry_id: 'min-choir',
					cycle_id: 'cycle-2026',
					status: 'enrolled',
				},
			],
		});

		const [row] = await queryHouseholdList();
		expect(row.children.map((child) => child.child_id)).toEqual([
			'child-enrolled-only',
		]);
		expect(row.original_registration_submitted_at).toBe(
			'2025-07-01T00:00:00.000Z',
		);
		expect(row.latest_registration_submitted_at).toBeNull();
	});

	it('keeps ministry-filter household eligibility and still cycle-scopes children', async () => {
		setupAdapter({
			children: [currentChild, historicalChild, otherCycleChild],
			registrations: [
				{
					child_id: 'child-current',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-01T00:00:00.000Z',
				},
				{
					child_id: 'child-other',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-01T00:00:00.000Z',
				},
			],
			enrollments: [
				{
					child_id: 'child-current',
					ministry_id: 'min-choir',
					cycle_id: 'cycle-2026',
					status: 'enrolled',
				},
				{
					child_id: 'child-other',
					ministry_id: 'min-sports',
					cycle_id: 'cycle-2026',
					status: 'enrolled',
				},
			],
		});

		const rows = await queryHouseholdList(undefined, 'min-choir');
		expect(rows.map((row) => row.household_id)).toEqual(['hh-returning']);
		expect(rows[0].children.map((child) => child.child_id)).toEqual([
			'child-current',
		]);
	});

	it('excludes inactive children even when they have an active-cycle registration', async () => {
		setupAdapter({
			children: [
				currentChild,
				{ ...historicalChild, child_id: 'child-inactive', is_active: false },
			],
			registrations: [
				{
					child_id: 'child-current',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-01T00:00:00.000Z',
				},
				{
					child_id: 'child-inactive',
					cycle_id: 'cycle-2026',
					submitted_at: '2026-09-03T00:00:00.000Z',
				},
			],
		});

		const [row] = await queryHouseholdList();
		expect(row.children.map((child) => child.child_id)).toEqual(['child-current']);
		expect(row.latest_registration_submitted_at).toBe(
			'2026-09-03T00:00:00.000Z',
		);
	});

	it('does not include households that only have prior-cycle activity', async () => {
		setupAdapter({
			households: [otherHousehold],
			children: [otherCycleChild],
			registrations: [
				{
					child_id: 'child-other',
					cycle_id: PRIOR_CYCLE_ID,
					submitted_at: '2025-08-01T00:00:00.000Z',
				},
			],
		});

		await expect(queryHouseholdList()).resolves.toEqual([]);
	});
});

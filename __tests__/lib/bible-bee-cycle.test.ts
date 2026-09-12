import {
	enrollmentsForActiveBibleBeeCycle,
	pickActiveBibleBeeCycle,
} from '@/lib/bible-bee-cycle';

describe('pickActiveBibleBeeCycle', () => {
	const fall2025 = {
		id: 'cycle-2025',
		name: 'Fall 2025 Bible Bee',
		is_active: false,
		created_at: '2025-08-01T00:00:00.000Z',
	};
	const fall2026 = {
		id: 'cycle-2026',
		name: 'Fall 2026 Bible Bee',
		is_active: true,
		created_at: '2026-08-01T00:00:00.000Z',
	};

	it('returns the cycle marked active', () => {
		expect(pickActiveBibleBeeCycle([fall2025, fall2026])?.id).toBe(
			'cycle-2026'
		);
	});

	it('falls back to the newest name when none are active', () => {
		expect(
			pickActiveBibleBeeCycle([
				fall2025,
				{ ...fall2026, is_active: false },
			])?.id
		).toBe('cycle-2026');
	});

	it('returns null for an empty list', () => {
		expect(pickActiveBibleBeeCycle([])).toBeNull();
	});
});

describe('enrollmentsForActiveBibleBeeCycle', () => {
	const cycles = [
		{
			id: 'cycle-2025',
			name: 'Fall 2025 Bible Bee',
			is_active: false,
		},
		{
			id: 'cycle-2026',
			name: 'Fall 2026 Bible Bee',
			is_active: true,
		},
	];

	it('keeps only enrollments for the active cycle', () => {
		const enrollments = [
			{ id: 'e1', bible_bee_cycle_id: 'cycle-2025' },
			{ id: 'e2', bible_bee_cycle_id: 'cycle-2026' },
		];

		expect(enrollmentsForActiveBibleBeeCycle(enrollments, cycles)).toEqual([
			{ id: 'e2', bible_bee_cycle_id: 'cycle-2026' },
		]);
	});

	it('returns no enrollments when there is no cycle to pick', () => {
		expect(
			enrollmentsForActiveBibleBeeCycle(
				[{ id: 'e1', bible_bee_cycle_id: 'cycle-2025' }],
				[]
			)
		).toEqual([]);
	});
});

import { pickActiveBibleBeeCycle } from '@/lib/bible-bee-cycle';

describe('Bible Bee Default Cycle Selection', () => {
	it('should prefer active cycle over older cycles', () => {
		const cycles = [
			{
				id: 'fall-2025',
				name: 'Fall 2025',
				is_active: false,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'summer-2026',
				name: 'Summer 2026',
				is_active: true,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		expect(picked?.id).toBe('summer-2026');
	});

	it('should pick newest by name when no cycle is active', () => {
		const cycles = [
			{
				id: 'fall-2025',
				name: 'Fall 2025',
				is_active: false,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'summer-2026',
				name: 'Summer 2026',
				is_active: false,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		// "Summer 2026" > "Fall 2025" alphabetically (descending)
		expect(picked?.id).toBe('summer-2026');
	});

	it('should pick newest by created_at when names are missing', () => {
		const cycles = [
			{
				id: 'cycle-1',
				is_active: false,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'cycle-2',
				is_active: false,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		expect(picked?.id).toBe('cycle-2');
	});

	it('should return null when no cycles are provided', () => {
		const picked = pickActiveBibleBeeCycle([]);
		expect(picked).toBeNull();
	});

	it('should handle multiple active cycles by picking the first one found', () => {
		const cycles = [
			{
				id: 'cycle-1',
				name: 'Cycle 1',
				is_active: true,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'cycle-2',
				name: 'Cycle 2',
				is_active: true,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		// Should pick the first active cycle found
		expect(picked?.id).toBe('cycle-1');
	});

	it('should handle is_active as number 1', () => {
		const cycles = [
			{
				id: 'cycle-1',
				name: 'Cycle 1',
				is_active: 0,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'cycle-2',
				name: 'Cycle 2',
				is_active: 1,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		expect(picked?.id).toBe('cycle-2');
	});

	it('should handle is_active as string "1" or "true"', () => {
		const cycles = [
			{
				id: 'cycle-1',
				name: 'Cycle 1',
				is_active: '0' as any,
				created_at: '2025-09-01T00:00:00Z',
			},
			{
				id: 'cycle-2',
				name: 'Cycle 2',
				is_active: '1' as any,
				created_at: '2026-07-01T00:00:00Z',
			},
		];

		const picked = pickActiveBibleBeeCycle(cycles);
		expect(picked?.id).toBe('cycle-2');
	});
});

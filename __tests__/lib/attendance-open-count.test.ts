import { countChildrenOnSite } from '@/lib/attendance-open-count';

describe('countChildrenOnSite', () => {
	it('is 0 when there are no rows', () => {
		expect(countChildrenOnSite([])).toBe(0);
	});

	it('counts a child once when two open rows exist for them', () => {
		expect(
			countChildrenOnSite([
				{ child_id: 'c1', check_out_at: null },
				{ child_id: 'c1', check_out_at: null },
			])
		).toBe(1);
	});

	it('counts distinct children who are still on site', () => {
		expect(
			countChildrenOnSite([
				{ child_id: 'c1', check_out_at: null },
				{ child_id: 'c2', check_out_at: null },
				{ child_id: 'c3', check_out_at: '2026-09-20T14:00:00.000Z' },
			])
		).toBe(2);
	});

	it('ignores rows without a child id', () => {
		expect(
			countChildrenOnSite([
				{ child_id: null, check_out_at: null },
				{ check_out_at: null },
			])
		).toBe(0);
	});
});

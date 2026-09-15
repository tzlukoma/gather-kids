import { registrationCycleLabel } from '@/lib/dal/registration-cycle-utils';
import type { RegistrationCycle } from '@/lib/types';

/**
 * Guardian-facing screens must show a cycle's name, never its `cycle_id`.
 * The id is "2026" locally but a UUID in UAT and production, so a component
 * that reads the wrong field looks fine in dev and leaks a UUID in prod.
 */

function cycle(overrides: Partial<RegistrationCycle> = {}): RegistrationCycle {
	return {
		cycle_id: '8f14e45f-ceea-467a-9c2b-7b1f2c0d3e4a',
		name: 'Fall 2026',
		start_date: '2026-08-01T00:00:00Z',
		end_date: '2027-05-31T00:00:00Z',
		is_active: true,
		...overrides,
	};
}

describe('registrationCycleLabel', () => {
	it('returns the cycle name', () => {
		expect(registrationCycleLabel(cycle(), 'current')).toBe('Fall 2026');
	});

	it('never returns the cycle id, even when the id looks readable', () => {
		const readableId = cycle({ cycle_id: '2026', name: 'Fall 2026' });

		expect(registrationCycleLabel(readableId, 'current')).toBe('Fall 2026');
		expect(registrationCycleLabel(readableId, 'current')).not.toBe('2026');
	});

	it('falls back to the caller wording rather than leaking a UUID', () => {
		const uuid = '8f14e45f-ceea-467a-9c2b-7b1f2c0d3e4a';

		for (const broken of [
			cycle({ name: '' }),
			cycle({ name: '   ' }),
			cycle({ name: undefined as unknown as string }),
		]) {
			const label = registrationCycleLabel(broken, 'current');
			expect(label).toBe('current');
			expect(label).not.toContain(uuid);
		}
	});

	it('handles a missing cycle', () => {
		expect(registrationCycleLabel(null, 'current')).toBe('current');
		expect(registrationCycleLabel(undefined, 'this year')).toBe('this year');
	});

	it('trims surrounding whitespace from the name', () => {
		expect(registrationCycleLabel(cycle({ name: '  Fall 2026  ' }), 'current')).toBe(
			'Fall 2026'
		);
	});
});

/**
 * #394 — the Done screen's "This Sunday" must be church-local.
 *
 * It previously used `new Date()` + `toLocaleDateString()`, which reads the
 * guardian's clock, so a parent registering from another timezone (or late on a
 * Saturday evening) was told to come on the wrong day. #449 already anchored
 * the door's service day to church-local time; this keeps the two in step.
 */

import { nextServiceSunday } from '@/components/gatherKids/registration-wizard/upcoming-service-day';

describe('nextServiceSunday', () => {
	it('returns the coming Sunday from a midweek day', () => {
		// Wednesday 23 Sep 2026, midday ET.
		const result = nextServiceSunday(new Date('2026-09-23T16:00:00.000Z'));

		expect(result.iso).toBe('2026-09-27');
		expect(result.label).toBe('Sunday, September 27');
		expect(result.isToday).toBe(false);
	});

	it('returns today when the family registers on a Sunday', () => {
		const result = nextServiceSunday(new Date('2026-09-27T15:00:00.000Z'));

		expect(result.iso).toBe('2026-09-27');
		expect(result.isToday).toBe(true);
	});

	it('returns tomorrow from a Saturday', () => {
		const result = nextServiceSunday(new Date('2026-09-26T15:00:00.000Z'));

		expect(result.iso).toBe('2026-09-27');
		expect(result.isToday).toBe(false);
	});

	/**
	 * The regression that motivated this. 02:00 UTC on Sunday is still 22:00
	 * Saturday in church-local time, so the answer must be the Sunday that is
	 * about to begin — not the one a week later, which is what reading the UTC
	 * day would give.
	 */
	it('uses the church-local day, not UTC, across the evening boundary', () => {
		const lateSaturdayEt = new Date('2026-09-27T02:00:00.000Z');

		const result = nextServiceSunday(lateSaturdayEt);

		expect(result.iso).toBe('2026-09-27');
		expect(result.isToday).toBe(false);
	});

	it('is stable regardless of the machine timezone', () => {
		const at = new Date('2026-09-23T16:00:00.000Z');
		const original = process.env.TZ;

		try {
			process.env.TZ = 'Pacific/Auckland';
			const auckland = nextServiceSunday(at);
			process.env.TZ = 'America/Los_Angeles';
			const la = nextServiceSunday(at);

			expect(auckland.iso).toBe('2026-09-27');
			expect(la.iso).toBe('2026-09-27');
		} finally {
			process.env.TZ = original;
		}
	});

	it('crosses a month boundary correctly', () => {
		// Wednesday 28 Oct 2026 → Sunday 1 Nov 2026.
		const result = nextServiceSunday(new Date('2026-10-28T16:00:00.000Z'));

		expect(result.iso).toBe('2026-11-01');
		expect(result.label).toBe('Sunday, November 1');
	});

	it('crosses a year boundary correctly', () => {
		// Wednesday 30 Dec 2026 → Sunday 3 Jan 2027.
		const result = nextServiceSunday(new Date('2026-12-30T16:00:00.000Z'));

		expect(result.iso).toBe('2027-01-03');
		expect(result.label).toBe('Sunday, January 3');
	});

	it('handles the DST change without drifting a day', () => {
		// US DST ends Sunday 1 Nov 2026; the Wednesday after is EST.
		const result = nextServiceSunday(new Date('2026-11-04T17:00:00.000Z'));

		expect(result.iso).toBe('2026-11-08');
		expect(result.label).toBe('Sunday, November 8');
	});
});

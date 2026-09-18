import {
	SERVICE_DAY_TIMEZONE,
	getPreviousServiceDay,
	getServiceDayIso,
	getServiceDayRangeUtc,
	getServiceDayStartMs,
} from '@/lib/utils/timezone';
import * as dal from '@/lib/dal';

/**
 * The defect this pins: attendance and incidents were stamped and queried by the
 * **UTC** calendar day, so the day rolled over at 8pm EDT / 7pm EST — mid-
 * evening. A child checked in before the rollover and the door screen asked for
 * the next day's rows afterwards, so they disappeared from the roster, the
 * on-site count and the check-out list while a guardian was arriving to collect
 * them (#447).
 *
 * Instants are explicit rather than derived from `Date.now()`, because the whole
 * point is behaviour at a specific wall-clock moment. They sit on both sides of a
 * DST switch, so a naive fixed-offset implementation fails here.
 */
describe('getServiceDayIso', () => {
	it('is anchored to the church timezone, not the runtime locale', () => {
		expect(SERVICE_DAY_TIMEZONE).toBe('America/New_York');
	});

	it('is reachable from the DAL barrel that screens import', () => {
		expect(dal.getServiceDayIso).toBe(getServiceDayIso);
		expect(dal.SERVICE_DAY_TIMEZONE).toBe(SERVICE_DAY_TIMEZONE);
	});

	// EDT (UTC-4): local midnight is 04:00 UTC, so the old rollover was 8pm.
	describe('during EDT', () => {
		it('keeps an evening service on one day across the UTC rollover', () => {
			// 6:45pm ET Wed 17 Sep 2026 -> 22:45 UTC Wed
			const beforeRollover = new Date('2026-09-17T22:45:00.000Z');
			// 8:05pm ET Wed 17 Sep 2026 -> 00:05 UTC Thu
			const afterRollover = new Date('2026-09-18T00:05:00.000Z');

			expect(getServiceDayIso(beforeRollover)).toBe('2026-09-17');
			expect(getServiceDayIso(afterRollover)).toBe('2026-09-17');
		});

		it('differs from the UTC day precisely where the old behaviour broke', () => {
			const afterRollover = new Date('2026-09-18T00:05:00.000Z');

			// The old implementation's answer, and the bug in one line.
			expect(afterRollover.toISOString().slice(0, 10)).toBe('2026-09-18');
			expect(getServiceDayIso(afterRollover)).toBe('2026-09-17');
		});

		it('rolls over at local midnight', () => {
			expect(getServiceDayIso(new Date('2026-09-18T03:59:00.000Z'))).toBe(
				'2026-09-17'
			);
			expect(getServiceDayIso(new Date('2026-09-18T04:00:00.000Z'))).toBe(
				'2026-09-18'
			);
		});

		it('leaves a Sunday morning service unchanged', () => {
			// 9:30am ET Sun -> 13:30 UTC; same day either way.
			const sundayMorning = new Date('2026-09-13T13:30:00.000Z');
			expect(getServiceDayIso(sundayMorning)).toBe('2026-09-13');
			expect(sundayMorning.toISOString().slice(0, 10)).toBe('2026-09-13');
		});
	});

	// EST (UTC-5): local midnight is 05:00 UTC, and the old rollover was 7pm.
	describe('during EST', () => {
		it('keeps an evening service on one day across the UTC rollover', () => {
			expect(getServiceDayIso(new Date('2026-01-14T23:45:00.000Z'))).toBe(
				'2026-01-14'
			);
			expect(getServiceDayIso(new Date('2026-01-15T00:20:00.000Z'))).toBe(
				'2026-01-14'
			);
		});

		it('rolls over at local midnight, an hour later in UTC than in EDT', () => {
			expect(getServiceDayIso(new Date('2026-01-15T04:59:00.000Z'))).toBe(
				'2026-01-14'
			);
			expect(getServiceDayIso(new Date('2026-01-15T05:00:00.000Z'))).toBe(
				'2026-01-15'
			);
		});
	});

	it('crosses the DST switch without a fixed offset', () => {
		// 2026 US DST begins Sun 8 Mar: 1:30am EST -> 06:30Z, 3:30am EDT -> 07:30Z.
		expect(getServiceDayIso(new Date('2026-03-08T06:30:00.000Z'))).toBe(
			'2026-03-08'
		);
		expect(getServiceDayIso(new Date('2026-03-08T07:30:00.000Z'))).toBe(
			'2026-03-08'
		);
		// 2026 US DST ends Sun 1 Nov.
		expect(getServiceDayIso(new Date('2026-11-01T05:30:00.000Z'))).toBe(
			'2026-11-01'
		);
	});

	it('returns YYYY-MM-DD with no time component', () => {
		expect(getServiceDayIso(new Date('2026-09-17T22:45:00.000Z'))).toMatch(
			/^\d{4}-\d{2}-\d{2}$/
		);
		expect(getServiceDayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('getServiceDayStartMs', () => {
	it('resolves local midnight, not UTC midnight', () => {
		expect(new Date(getServiceDayStartMs('2026-09-17')!).toISOString()).toBe(
			'2026-09-17T04:00:00.000Z'
		);
		expect(new Date(getServiceDayStartMs('2026-01-14')!).toISOString()).toBe(
			'2026-01-14T05:00:00.000Z'
		);
	});

	// The offset has to be re-read at the candidate instant: UTC midnight on a
	// spring-forward day sits in the *previous* offset.
	it('resolves local midnight on both DST transition days', () => {
		expect(new Date(getServiceDayStartMs('2026-03-08')!).toISOString()).toBe(
			'2026-03-08T05:00:00.000Z'
		);
		expect(new Date(getServiceDayStartMs('2026-11-01')!).toISOString()).toBe(
			'2026-11-01T04:00:00.000Z'
		);
	});

	it('round-trips every day it produces', () => {
		for (const date of [
			'2026-01-01',
			'2026-03-08',
			'2026-06-15',
			'2026-11-01',
			'2026-12-31',
			'2028-02-29',
		]) {
			expect(getServiceDayIso(new Date(getServiceDayStartMs(date)!))).toBe(date);
		}
	});

	// A shape check alone accepts 2026-02-30, which Date.parse normalises to
	// 2026-03-02 — answering for a day the caller never asked for.
	it.each([
		'2026-02-30',
		'2026-99-99',
		'2026-13-01',
		'2026-00-10',
		'2026-01-32',
		'not-a-date',
		'',
	])('rejects %p', (bad) => {
		expect(getServiceDayStartMs(bad)).toBeNull();
	});

	it('accepts a genuine leap day', () => {
		expect(getServiceDayStartMs('2028-02-29')).not.toBeNull();
	});
});

describe('getPreviousServiceDay', () => {
	it('steps back one calendar day on an ordinary day', () => {
		expect(getPreviousServiceDay('2026-09-17')).toBe('2026-09-16');
		expect(getPreviousServiceDay('2026-01-01')).toBe('2025-12-31');
	});

	// Regression, reported on #449. A fixed 24-hour subtraction is wrong at both
	// ends of a DST transition, in opposite directions.
	describe('across a DST transition', () => {
		const DAY_MS = 24 * 60 * 60 * 1000;

		// 11:30pm EST on the 25-hour fall-back day. Minus 24 hours is 12:30am EDT
		// on that *same* service day, so the previous day was never reached and
		// the staff pickup window silently collapsed to one day for that hour.
		it('still reaches the previous day in the last hour of a 25-hour day', () => {
			const lateOnFallBackDay = Date.parse('2026-11-02T04:30:00.000Z');

			expect(getServiceDayIso(new Date(lateOnFallBackDay))).toBe('2026-11-01');
			// What the fixed-duration version produced:
			expect(getServiceDayIso(new Date(lateOnFallBackDay - DAY_MS))).toBe(
				'2026-11-01'
			);
			// What it must produce:
			expect(getPreviousServiceDay('2026-11-01')).toBe('2026-10-31');
		});

		// 12:30am EDT the day after the 23-hour spring-forward day. Minus 24 hours
		// skips the previous day entirely and lands two days back — rejecting the
		// day that should be in the window and admitting one that should not.
		it('does not skip a day after a 23-hour day', () => {
			const earlyAfterSpringForward = Date.parse('2026-03-09T04:30:00.000Z');

			expect(getServiceDayIso(new Date(earlyAfterSpringForward))).toBe(
				'2026-03-09'
			);
			// What the fixed-duration version produced:
			expect(getServiceDayIso(new Date(earlyAfterSpringForward - DAY_MS))).toBe(
				'2026-03-07'
			);
			// What it must produce:
			expect(getPreviousServiceDay('2026-03-09')).toBe('2026-03-08');
		});

		it('steps back onto and off each transition day itself', () => {
			expect(getPreviousServiceDay('2026-03-08')).toBe('2026-03-07');
			expect(getPreviousServiceDay('2026-11-01')).toBe('2026-10-31');
			expect(getPreviousServiceDay('2026-11-02')).toBe('2026-11-01');
		});
	});

	it('never skips or repeats a day across a whole year', () => {
		let cursor = '2027-01-01';
		const seen: string[] = [];
		for (let i = 0; i < 365; i++) {
			const previous = getPreviousServiceDay(cursor)!;
			expect(previous).not.toBeNull();
			expect(previous < cursor).toBe(true);
			seen.push(previous);
			cursor = previous;
		}
		// 365 strictly decreasing steps back from 1 Jan 2027 must land on 1 Jan
		// 2026 exactly — one short or one long would miss it.
		expect(cursor).toBe('2026-01-01');
		expect(new Set(seen).size).toBe(365);
	});

	it.each(['2026-02-30', '2026-99-99', 'not-a-date'])('rejects %p', (bad) => {
		expect(getPreviousServiceDay(bad)).toBeNull();
	});
});

describe('getServiceDayRangeUtc', () => {
	it('brackets the local day as UTC instants', () => {
		expect(getServiceDayRangeUtc('2026-09-17')).toEqual({
			start: '2026-09-17T04:00:00.000Z',
			end: '2026-09-18T04:00:00.000Z',
		});
	});

	it('includes an incident logged after the old UTC rollover', () => {
		// 8:30pm ET on the 17th, which the old UTC window for '2026-09-17' excluded.
		const evening = '2026-09-18T00:30:00.000Z';
		const range = getServiceDayRangeUtc('2026-09-17')!;

		expect(evening >= range.start).toBe(true);
		expect(evening < range.end).toBe(true);
	});

	// The end bound must be the next local midnight, not start + 24h: a
	// spring-forward day is 23 hours long and a fall-back day 25.
	it('sizes a spring-forward day at 23 hours', () => {
		const range = getServiceDayRangeUtc('2026-03-08')!;
		expect(range).toEqual({
			start: '2026-03-08T05:00:00.000Z',
			end: '2026-03-09T04:00:00.000Z',
		});
		expect(Date.parse(range.end) - Date.parse(range.start)).toBe(23 * 3600_000);
	});

	it('sizes a fall-back day at 25 hours', () => {
		const range = getServiceDayRangeUtc('2026-11-01')!;
		expect(Date.parse(range.end) - Date.parse(range.start)).toBe(25 * 3600_000);
	});

	it('crosses a year boundary', () => {
		expect(getServiceDayRangeUtc('2026-12-31')).toEqual({
			start: '2026-12-31T05:00:00.000Z',
			end: '2027-01-01T05:00:00.000Z',
		});
	});

	it('is half-open, so consecutive days neither overlap nor gap', () => {
		const first = getServiceDayRangeUtc('2026-03-08')!;
		const second = getServiceDayRangeUtc('2026-03-09')!;
		expect(first.end).toBe(second.start);
	});

	it.each(['2026-02-30', '2026-99-99', 'not-a-date'])('rejects %p', (bad) => {
		expect(getServiceDayRangeUtc(bad)).toBeNull();
	});
});

describe('getTodayIsoDate', () => {
	// Deliberately still the UTC day: its only remaining caller is age
	// arithmetic, where moving the boundary would shift ministry eligibility.
	it('stays on the UTC day', () => {
		expect(dal.getTodayIsoDate()).toBe(new Date().toISOString().slice(0, 10));
	});
});

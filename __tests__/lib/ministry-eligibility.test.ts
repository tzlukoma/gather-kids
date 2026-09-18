import {
	describeIneligibility,
	evaluateMinistryEligibility,
	evaluateMinistryEligibilityOn,
	isEligibleForMinistry,
	isEligibleForMinistryOn,
	isMinistryWindowOpenOn,
	isWithinMinistryWindow,
} from '@/lib/ministry-eligibility';

/**
 * The boundaries are the whole point of this module. #400 exists because four
 * partial copies of this rule disagreed, and the one the registration wizard
 * used was "no rule at all" — so a guardian could select an ineligible child,
 * have persistence silently drop it, and still be told the child was enrolled.
 */

const choir = { min_age: 8, max_age: 12 };
const bibleBee = { min_age: 8, max_age: 12, open_at: '2025-07-01', close_at: '2025-08-15' };
const openToAll = {};

/** Noon UTC keeps the fixture away from the church-local day boundary. */
const on = (day: string) => new Date(`${day}T17:00:00.000Z`);

describe('age bounds', () => {
	it('accepts a child exactly at the minimum', () => {
		// Turns 8 on the day being evaluated.
		expect(isEligibleForMinistry(choir, { dob: '2017-09-18' }, on('2025-09-18'))).toBe(
			true
		);
	});

	it('accepts a child exactly at the maximum', () => {
		expect(isEligibleForMinistry(choir, { dob: '2013-09-18' }, on('2025-09-18'))).toBe(
			true
		);
	});

	it('refuses a child one day short of the minimum', () => {
		// Turns 8 tomorrow.
		expect(
			evaluateMinistryEligibility(choir, { dob: '2017-09-19' }, on('2025-09-18'))
		).toEqual({ eligible: false, reason: 'too_young' });
	});

	it('refuses a child the day after ageing out', () => {
		// Turned 13 yesterday.
		expect(
			evaluateMinistryEligibility(choir, { dob: '2012-09-17' }, on('2025-09-18'))
		).toEqual({ eligible: false, reason: 'too_old' });
	});

	it('applies only the bound that is set', () => {
		expect(isEligibleForMinistry({ min_age: 8 }, { dob: '2000-01-01' }, on('2025-09-18'))).toBe(true);
		expect(isEligibleForMinistry({ max_age: 12 }, { dob: '2024-01-01' }, on('2025-09-18'))).toBe(true);
	});

	it('treats a bound of 0 as a real bound rather than an absent one', () => {
		// `max_age: 0` — a nursery ministry for children under one — must not be
		// read as "no maximum" by a falsy check. (`min_age: 0` cannot be told
		// apart the same way, since no real child is younger than 0; the code
		// uses `!= null` for both so the two read alike.)
		expect(
			evaluateMinistryEligibility({ max_age: 0 }, { dob: '2020-01-01' }, on('2025-09-18'))
		).toEqual({ eligible: false, reason: 'too_old' });
		expect(
			isEligibleForMinistry({ max_age: 0 }, { dob: '2025-01-01' }, on('2025-09-18'))
		).toBe(true);
	});

	it('does not refuse a child whose date of birth is missing or unreadable', () => {
		// Both registration paths guarded their age check with `age !== null`;
		// keeping a family out of a ministry over a blank field would be worse
		// than letting an administrator see the gap.
		for (const dob of [undefined, null, '', 'not-a-date']) {
			expect(isEligibleForMinistry(choir, { dob }, on('2025-09-18'))).toBe(true);
		}
	});
});

describe('enrolment window', () => {
	it('is open on the opening day and the closing day', () => {
		expect(isWithinMinistryWindow(bibleBee, on('2025-07-01'))).toBe(true);
		expect(isWithinMinistryWindow(bibleBee, on('2025-08-15'))).toBe(true);
	});

	it('is shut the day before it opens and the day after it closes', () => {
		expect(isWithinMinistryWindow(bibleBee, on('2025-06-30'))).toBe(false);
		expect(isWithinMinistryWindow(bibleBee, on('2025-08-16'))).toBe(false);
	});

	it('reports which side of the window it fell outside', () => {
		const child = { dob: '2015-01-01' };
		expect(evaluateMinistryEligibility(bibleBee, child, on('2025-06-30'))).toEqual({
			eligible: false,
			reason: 'not_open_yet',
		});
		expect(evaluateMinistryEligibility(bibleBee, child, on('2025-08-16'))).toEqual({
			eligible: false,
			reason: 'closed',
		});
	});

	it('is always open when no window is configured', () => {
		expect(isWithinMinistryWindow(openToAll, on('2025-09-18'))).toBe(true);
		expect(isWithinMinistryWindow({ open_at: '2025-01-01' }, on('2030-01-01'))).toBe(true);
		expect(isWithinMinistryWindow({ close_at: '2030-01-01' }, on('2025-01-01'))).toBe(true);
	});

	it('accepts a full timestamp as well as a bare date', () => {
		const withTimestamps = {
			open_at: '2025-07-01T00:00:00.000Z',
			close_at: '2025-08-15T23:59:59.000Z',
		};
		expect(isWithinMinistryWindow(withTimestamps, on('2025-07-01'))).toBe(true);
		expect(isWithinMinistryWindow(withTimestamps, on('2025-08-15'))).toBe(true);
		expect(isWithinMinistryWindow(withTimestamps, on('2025-08-16'))).toBe(false);
	});

	it('ignores a bound it cannot read rather than closing the ministry', () => {
		// The two failures are not symmetric: refusing an unreadable date would
		// remove a ministry from registration with nothing on screen to say why.
		expect(isWithinMinistryWindow({ open_at: 'soon' }, on('2025-09-18'))).toBe(true);
		expect(isWithinMinistryWindow({ close_at: 'when we finish' }, on('2025-09-18'))).toBe(
			true
		);
	});

	it('does not invent a window for a ministry that has none', () => {
		// The legacy screen defaulted Bible Bee to 1 Jan – 8 Oct when the dates
		// were unset, so it closed itself on a date nobody had configured.
		const unconfiguredBibleBee = { min_age: 8, max_age: 12 };
		expect(
			isEligibleForMinistry(unconfiguredBibleBee, { dob: '2015-01-01' }, on('2025-12-25'))
		).toBe(true);
	});
});

describe('age and window together', () => {
	it('reports the age problem first when both apply', () => {
		// The age is the more actionable of the two: a window reopens, a child
		// who is too old for a ministry stays too old.
		expect(
			evaluateMinistryEligibility(bibleBee, { dob: '2000-01-01' }, on('2025-06-01'))
		).toEqual({ eligible: false, reason: 'too_old' });
	});

	it('is eligible only when both hold', () => {
		const child = { dob: '2015-01-01' };
		expect(isEligibleForMinistry(bibleBee, child, on('2025-07-15'))).toBe(true);
		expect(isEligibleForMinistry(bibleBee, child, on('2025-09-15'))).toBe(false);
	});

	it('carries the inclusive window bounds through the eligibility check', () => {
		// The callers use `evaluateMinistryEligibility`, not the window predicate
		// directly, so the boundary is asserted on the path they actually take.
		const child = { dob: '2015-01-01' };
		expect(isEligibleForMinistry(bibleBee, child, on('2025-07-01'))).toBe(true);
		expect(isEligibleForMinistry(bibleBee, child, on('2025-08-15'))).toBe(true);
		expect(isEligibleForMinistry(bibleBee, child, on('2025-06-30'))).toBe(false);
		expect(isEligibleForMinistry(bibleBee, child, on('2025-08-16'))).toBe(false);
	});
});

describe('describeIneligibility', () => {
	it('says something a guardian can act on', () => {
		expect(describeIneligibility('too_young', choir)).toBe('Opens at age 8');
		expect(describeIneligibility('too_old', choir)).toBe('For ages 8–12');
		expect(describeIneligibility('not_open_yet', choir)).toBe(
			'Registration has not opened yet'
		);
		expect(describeIneligibility('closed', choir)).toBe('Registration has closed');
	});

	it('does not print "undefined" when the lower bound is unset', () => {
		expect(describeIneligibility('too_old', { max_age: 12 })).toBe('For ages 0–12');
	});
});

describe('callers holding a calendar day', () => {
	it('does not shift the day backwards the way `new Date(day)` would', () => {
		// `new Date('2025-08-25')` is UTC midnight, which is 24 August in a
		// church-local timezone behind UTC — so routing a day string through a
		// Date takes a year off every child on their birthday. Turning 10 today
		// ages a child out of a ministry capped at 9.
		const child = { dob: '2015-08-25' };
		const cappedAtNine = { max_age: 9 };

		expect(evaluateMinistryEligibilityOn(cappedAtNine, child, '2025-08-25')).toEqual({
			eligible: false,
			reason: 'too_old',
		});
		expect(isEligibleForMinistryOn(cappedAtNine, child, '2025-08-25')).toBe(false);

		// The Date-taking form is given a real instant, so it agrees.
		expect(isEligibleForMinistry(cappedAtNine, child, on('2025-08-25'))).toBe(false);
	});

	it('accepts a full timestamp where a day is expected', () => {
		expect(
			isEligibleForMinistryOn({ max_age: 9 }, { dob: '2015-08-25' }, '2025-08-25T04:00:00.000Z')
		).toBe(false);
	});

	it('applies the same inclusive window bounds', () => {
		expect(isMinistryWindowOpenOn(bibleBee, '2025-07-01')).toBe(true);
		expect(isMinistryWindowOpenOn(bibleBee, '2025-08-15')).toBe(true);
		expect(isMinistryWindowOpenOn(bibleBee, '2025-06-30')).toBe(false);
		expect(isMinistryWindowOpenOn(bibleBee, '2025-08-16')).toBe(false);
	});

	it('refuses to turn an unreadable day into a refusal', () => {
		expect(isMinistryWindowOpenOn(bibleBee, 'today')).toBe(true);
		expect(isEligibleForMinistryOn(choir, { dob: '2000-01-01' }, 'today')).toBe(true);
	});
});

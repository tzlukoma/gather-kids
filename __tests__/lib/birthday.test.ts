import { isBirthdayThisWeek } from '@/lib/birthday';

describe('isBirthdayThisWeek', () => {
	const today = new Date(2026, 8, 28); // Sep 28, 2026

	it('is false without a date of birth', () => {
		expect(isBirthdayThisWeek(undefined, today)).toBe(false);
		expect(isBirthdayThisWeek('', today)).toBe(false);
	});

	it('counts birthdays up to seven days either side', () => {
		expect(isBirthdayThisWeek('2017-09-28', today)).toBe(true);
		expect(isBirthdayThisWeek('2017-10-04', today)).toBe(true);
		expect(isBirthdayThisWeek('2017-09-22', today)).toBe(true);
	});

	it('does not count birthdays further away', () => {
		expect(isBirthdayThisWeek('2017-10-10', today)).toBe(false);
		expect(isBirthdayThisWeek('2017-03-14', today)).toBe(false);
	});

	it('wraps across the new year', () => {
		expect(isBirthdayThisWeek('2017-12-30', new Date(2027, 0, 2))).toBe(true);
		expect(isBirthdayThisWeek('2017-01-02', new Date(2026, 11, 30))).toBe(true);
	});

	it('is false for an unparseable date', () => {
		expect(isBirthdayThisWeek('not-a-date', today)).toBe(false);
	});
});

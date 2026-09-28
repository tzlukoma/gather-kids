import {
	addDays,
	addYears,
	isWithinInterval,
	parseISO,
	setYear,
	subDays,
	subYears,
} from 'date-fns';

/**
 * Whether a birthday falls within seven days either side of `today`.
 *
 * Lifted out of `child-card.tsx` so the GatherSystem child page (#378) shows
 * the badge on exactly the same days the staff card does. The previous and
 * next year's dates are checked too, so a late-December birthday still counts
 * in the first week of January and the other way round.
 */
export function isBirthdayThisWeek(dob?: string | null, today: Date = new Date()): boolean {
	if (!dob) return false;
	try {
		const birthDate = parseISO(dob);
		const currentYearBirthday = setYear(birthDate, today.getFullYear());
		const window = { start: subDays(today, 7), end: addDays(today, 7) };

		return [
			currentYearBirthday,
			addYears(currentYearBirthday, 1),
			subYears(currentYearBirthday, 1),
		].some((date) => isWithinInterval(date, window));
	} catch {
		return false;
	}
}

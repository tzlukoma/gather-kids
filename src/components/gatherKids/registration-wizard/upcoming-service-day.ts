/**
 * The next Sunday a family should turn up, in church-local time.
 *
 * The Done screen used to work this out with `new Date()` and
 * `toLocaleDateString()`, which reads the *guardian's* clock. A parent
 * registering from a different timezone — or late on a Saturday evening east of
 * the church — was told to come on the wrong day. #449 already anchored the
 * door's service day to church-local time for exactly this reason; this uses
 * the same anchor so the two screens cannot disagree.
 *
 * `at` is injectable so the Saturday/Sunday boundary can be tested without
 * faking the clock.
 */

import { getServiceDayIso, SERVICE_DAY_TIMEZONE } from '@/lib/utils/timezone';

export type UpcomingServiceDay = {
	/** Church-local calendar day, YYYY-MM-DD. */
	iso: string;
	/** Human label, e.g. "Sunday, September 27". */
	label: string;
	/** True when the service day is today, so copy can say so. */
	isToday: boolean;
};

const LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
	// The ISO day is re-read as UTC below, so the label must be formatted in UTC
	// too — formatting it in the church zone would shift it back a day.
	timeZone: 'UTC',
	weekday: 'long',
	month: 'long',
	day: 'numeric',
});

/** Parse a YYYY-MM-DD service day as a UTC instant, free of local-zone drift. */
function isoToUtcDate(iso: string): Date {
	return new Date(`${iso}T00:00:00.000Z`);
}

function addDaysIso(iso: string, days: number): string {
	const d = isoToUtcDate(iso);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

/**
 * The upcoming service Sunday.
 *
 * When today *is* Sunday the answer is today, not next week: a family that
 * registers on a Sunday morning is being told when to arrive, and pointing them
 * at a date seven days away would be wrong.
 */
export function nextServiceSunday(at: Date = new Date()): UpcomingServiceDay {
	const todayIso = getServiceDayIso(at);
	const dayOfWeek = isoToUtcDate(todayIso).getUTCDay();
	const iso = dayOfWeek === 0 ? todayIso : addDaysIso(todayIso, 7 - dayOfWeek);

	return {
		iso,
		label: LABEL_FORMATTER.format(isoToUtcDate(iso)),
		isToday: iso === todayIso,
	};
}

export { SERVICE_DAY_TIMEZONE };

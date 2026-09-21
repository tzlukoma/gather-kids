/**
 * Timezone utilities for America/New_York comparisons
 */

/**
 * Compare a date against another date in America/New_York timezone
 * @param nowDate - Current date (can be Date or ISO string)
 * @param compareDate - Date to compare against (can be Date or ISO string) 
 * @returns true if nowDate is on or after compareDate in America/New_York timezone
 */
export function isOnOrAfterInET(nowDate: Date | string, compareDate: Date | string): boolean {
    const now = typeof nowDate === 'string' ? new Date(nowDate) : nowDate;
    const target = typeof compareDate === 'string' ? new Date(compareDate) : compareDate;
    
    // Convert both dates to ET (America/New_York) timezone
    // This handles both EST and EDT automatically
    const nowInET = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const targetInET = new Date(target.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    return nowInET >= targetInET;
}

/**
 * Format a date for display in America/New_York timezone
 * @param date - Date to format (can be Date or ISO string)
 * @returns Formatted date string like "Sep 28, 2025"
 */
export function formatDateInET(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(targetDate);
}

/**
 * Get current date/time in America/New_York timezone
 * @returns Date object representing current time in ET
 */
export function getCurrentDateInET(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

/**
 * The timezone the **service day** is defined in.
 *
 * gatherKids serves one congregation, and this module already pinned
 * America/New_York for Bible Bee competition-start comparisons, so the service
 * day follows the same convention. If gatherKids ever serves congregations in
 * another timezone, this constant is the single place to make configurable.
 */
export const SERVICE_DAY_TIMEZONE = 'America/New_York';

/**
 * Calendar parts in church-local time.
 *
 * Do **not** use `DateTimeFormat#format()` with an ISO-shaped locale such as
 * `en-CA`. That API can emit `YYYY-MM-DD`, and some runtimes treat that string
 * as a UTC date and ignore `timeZone`. Production then queried
 * `attendance?date=eq.` the UTC day after 8pm EDT, so tonight's open check-ins
 * vanished from the door (#488). `formatToParts` plus an explicit `en-US`
 * locale keeps year/month/day in `America/New_York` without going through that
 * ISO string.
 */
const SERVICE_DAY_CALENDAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVICE_DAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function churchLocalCalendarParts(at: Date): {
    year: string;
    month: string;
    day: string;
} {
    const read: Record<string, string> = {};
    for (const part of SERVICE_DAY_CALENDAR_FORMATTER.formatToParts(at)) {
        if (part.type !== 'literal') read[part.type] = part.value;
    }
    const { year, month, day } = read;
    if (!year || !month || !day) {
        throw new Error('getServiceDayIso: failed to read church-local calendar parts');
    }
    return { year, month, day };
}

/**
 * The **service day** for an instant, as a YYYY-MM-DD string in church-local
 * time.
 *
 * Attendance is stamped and queried by calendar day, and using the UTC day put
 * that boundary at 8pm EDT / 7pm EST — the middle of an evening programme. A
 * child checked in at 6:45pm got `date = Wed`; at 8:05pm the door screen asked
 * for `date = Thu` and they vanished from the roster, the on-site count and the
 * check-out list, at exactly the moment a guardian arrived to collect them.
 *
 * Anchoring the day to church-local time moves the rollover to local midnight,
 * when nothing is in progress. Widening the query to a two-day window was the
 * alternative and is worse here: nothing ever closes an open attendance row, so
 * a two-day window would report children who went home yesterday without being
 * checked out as still on site.
 *
 * `at` is injectable so the boundary can be tested without faking the clock.
 */
export const getServiceDayIso = (at: Date = new Date()): string => {
    const { year, month, day } = churchLocalCalendarParts(at);
    return `${year}-${month}-${day}`;
};

const SERVICE_DAY_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVICE_DAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

/**
 * The church-local wall clock at `ms`, re-read as if it were UTC.
 *
 * Subtracting the real instant gives the zone's offset at that instant, which is
 * the only way to turn a local calendar day back into a UTC instant without a
 * timezone library.
 */
function serviceZoneWallClockMs(ms: number): number {
    const parts = SERVICE_DAY_PARTS_FORMATTER.formatToParts(new Date(ms));
    const read: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') read[part.type] = part.value;
    }
    return Date.parse(
        `${read.year}-${read.month}-${read.day}T${read.hour}:${read.minute}:${read.second}.000Z`,
    );
}

const serviceZoneOffsetMs = (ms: number): number =>
    serviceZoneWallClockMs(ms) - ms;

/**
 * Midnight that starts the service day `date`, as a UTC epoch millisecond value,
 * or `null` when `date` is not a real calendar day.
 *
 * A shape check alone is not enough. `^\d{4}-\d{2}-\d{2}$` accepts
 * `2026-02-30`, which `Date.parse` silently normalises to 2026-03-02, so a
 * caller would be answered for a different day than the one it asked for with no
 * error; it also accepts `2026-99-99`, which parses to `NaN`. Requiring the
 * parsed day to round-trip to exactly the string supplied rejects both.
 *
 * One offset read is enough **for this zone**, and that is a precondition rather
 * than a general truth. The offset is sampled at UTC midnight, while the answer
 * needs the offset at local midnight; reading once is only safe if no DST
 * transition falls between them. US Eastern is 4-5 hours behind UTC and switches
 * at 2am local (06:00-07:00 UTC), so local midnight is always 04:00-05:00 UTC —
 * before any transition. Verified across every day from 1990 to 2050: a second,
 * corrective read at the candidate instant never changes the result. A zone east
 * of UTC, or one that switches at midnight, would need that second read.
 */
export function getServiceDayStartMs(date: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const asUtcMidnight = Date.parse(`${date}T00:00:00.000Z`);
    if (Number.isNaN(asUtcMidnight)) return null;
    if (new Date(asUtcMidnight).toISOString().slice(0, 10) !== date) return null;

    return asUtcMidnight - serviceZoneOffsetMs(asUtcMidnight);
}

/**
 * The service day before `date`, or `null` when `date` is not a real calendar
 * day.
 *
 * Derived from the calendar rather than by subtracting 24 hours, because a DST
 * transition day is 23 or 25 hours long and a fixed duration lands on the wrong
 * day at both ends of it:
 *
 * - 11:30pm EST on the 25-hour fall-back day, minus 24h, is still *that same*
 *   service day — so the previous day is never reached and the window silently
 *   collapses to one day for that final hour.
 * - 12:30am EDT on the day after the 23-hour spring-forward day, minus 24h,
 *   skips the previous day entirely and lands two days back.
 *
 * Stepping back 12 hours from this day's local midnight always lands inside the
 * previous local day, whether that day is 23, 24 or 25 hours long.
 */
export function getPreviousServiceDay(date: string): string | null {
    const start = getServiceDayStartMs(date);
    if (start === null) return null;
    return getServiceDayIso(new Date(start - 12 * 60 * 60 * 1000));
}

/**
 * The half-open UTC instant range `[start, end)` covering the service day
 * `date`, as ISO strings, or `null` when `date` is not a real calendar day.
 *
 * `end` is the *next* service day's midnight rather than `start + 24h`, because
 * a DST transition day is 23 or 25 hours long. Adding a fixed day would bleed an
 * hour of the following day into a spring-forward query and drop the last hour
 * of a fall-back one.
 */
export function getServiceDayRangeUtc(
    date: string,
): { start: string; end: string } | null {
    const start = getServiceDayStartMs(date);
    if (start === null) return null;
    // Noon the following local day is far from any transition, so formatting it
    // yields the next calendar day regardless of a 23- or 25-hour day.
    const nextDay = getServiceDayIso(new Date(start + 36 * 60 * 60 * 1000));
    const end = getServiceDayStartMs(nextDay);
    if (end === null) return null;
    return {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
    };
}

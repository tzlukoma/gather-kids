/**
 * Who may join which ministry — the single rule.
 *
 * Before this module the question was answered in four places that did not
 * agree: `checkEligibility` in `src/app/register/page-legacy.tsx` (age, plus an
 * enrolment window applied only to Bible Bee), an inline age check in
 * `src/lib/dal/registration.ts`, another in
 * `src/lib/database/canonical-dal.ts`, and `isEligibleForChoir` in
 * `src/lib/dal/ministries.ts`. The GatherSystem registration wizard answered it
 * nowhere at all, which is what #400 is about: the wizard offered every
 * ministry to every child, persistence quietly dropped the ineligible ones, and
 * the confirmation screen — built from the form rather than from what was
 * stored — told the guardian their child was enrolled in a ministry that had
 * no enrolment.
 *
 * This module has no database access and no React, so the wizard, both
 * registration paths and the DAL can share it.
 */

import type { Ministry } from './types';
import { getServiceDayIso } from './utils/timezone';

/** Why a child cannot join, when they cannot. */
export type MinistryIneligibilityReason =
	| 'too_young'
	| 'too_old'
	| 'not_open_yet'
	| 'closed';

/** The only thing the rule needs to know about a child. */
export interface EligibilityChild {
	dob?: string | null;
}

/**
 * A discriminated union rather than `{ eligible: boolean; reason: ... | null }`
 * so that `if (!result.eligible)` narrows `reason` to a real reason — callers
 * get the wording without asserting the value is there.
 */
export type MinistryEligibility =
	| { eligible: true; reason: null }
	| { eligible: false; reason: MinistryIneligibilityReason };

const ELIGIBLE: MinistryEligibility = { eligible: true, reason: null };

/**
 * The `YYYY-MM-DD` day of an `open_at` / `close_at`, or `null` when the value
 * cannot be read.
 *
 * Ministry windows are configured as calendar dates, sometimes bare
 * (`2025-10-08`) and sometimes as a full timestamp. Only the day matters, so
 * both are reduced to the same shape and compared as strings — which orders
 * correctly for `YYYY-MM-DD` and cannot be thrown off by a time of day.
 */
function toIsoDay(value: string | null | undefined): string | null {
	if (!value) return null;
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * Age in whole years on `day`, or `null` when the child has no readable date of
 * birth.
 *
 * A missing DOB means the age rules cannot be applied, not that the child is
 * refused: both registration paths already guarded their age checks with
 * `age !== null`, and turning an incomplete record into a refusal would keep a
 * family out of a ministry over a blank field.
 */
function ageOnDay(dob: string | null | undefined, day: string): number | null {
	if (!dob) return null;
	const birth = toIsoDay(dob);
	if (!birth) return null;

	const [by, bm, bd] = birth.split('-').map(Number);
	const [ty, tm, td] = day.split('-').map(Number);

	let age = ty - by;
	if (tm < bm || (tm === bm && td < bd)) age -= 1;
	return age;
}

/**
 * Whether `at` falls inside a ministry's enrolment window.
 *
 * Bounds are **inclusive**: a window that opens on the 1st is open on the 1st.
 * A ministry with neither bound set is always open.
 *
 * A bound that cannot be read is ignored rather than treated as closed. The
 * two failures are not symmetric — refusing to read a date would remove a
 * ministry from registration entirely and give the guardian no way to tell why,
 * whereas ignoring it leaves the ministry offered and the mistake visible to an
 * administrator.
 */
export function isWithinMinistryWindow(
	ministry: Pick<Ministry, 'open_at' | 'close_at'>,
	at: Date = new Date()
): boolean {
	return isMinistryWindowOpenOn(ministry, getServiceDayIso(at));
}

/**
 * `isWithinMinistryWindow` for a caller that already holds a calendar day
 * rather than an instant.
 */
export function isMinistryWindowOpenOn(
	ministry: Pick<Ministry, 'open_at' | 'close_at'>,
	day: string
): boolean {
	const isoDay = toIsoDay(day);
	// An unreadable "today" cannot close a ministry, for the same reason an
	// unreadable bound cannot.
	if (!isoDay) return true;
	return windowStatus(ministry, isoDay) === null;
}

/**
 * Which side of its enrolment window `day` falls outside, or `null` when the
 * window is open. The only place the window comparison is written.
 */
function windowStatus(
	ministry: Pick<Ministry, 'open_at' | 'close_at'>,
	day: string
): Extract<MinistryIneligibilityReason, 'not_open_yet' | 'closed'> | null {
	const open = toIsoDay(ministry.open_at);
	if (open && day < open) return 'not_open_yet';

	const close = toIsoDay(ministry.close_at);
	if (close && day > close) return 'closed';

	return null;
}

/**
 * Whether a child may join a ministry, and why not when they may not.
 *
 * Age bounds are inclusive, so a ministry for ages 8–12 accepts a child who is
 * exactly 8 and one who is exactly 12. The enrolment window applies to **any**
 * ministry that configures one — the legacy screen applied it only to Bible Bee
 * and invented a January-to-October default for it when unset, which meant a
 * ministry could close itself on a date nobody had configured. A window is now
 * only enforced where one is actually set.
 */
export function evaluateMinistryEligibility(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	child: EligibilityChild,
	at: Date = new Date()
): MinistryEligibility {
	return evaluateMinistryEligibilityOn(ministry, child, getServiceDayIso(at));
}

/**
 * `evaluateMinistryEligibility` for a caller that already holds a calendar day.
 *
 * Callers with a `YYYY-MM-DD` in hand must use this rather than
 * `new Date(day)`: that parses as UTC midnight, which in a church-local
 * timezone behind UTC is the *previous* day, shifting every age and window
 * boundary by one.
 */
export function evaluateMinistryEligibilityOn(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	child: EligibilityChild,
	day: string
): MinistryEligibility {
	const isoDay = toIsoDay(day);
	// An unreadable day cannot be the grounds for a refusal.
	if (!isoDay) return ELIGIBLE;
	return evaluateOnIsoDay(ministry, child, isoDay);
}

function evaluateOnIsoDay(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	child: EligibilityChild,
	day: string
): MinistryEligibility {
	const age = ageOnDay(child.dob, day);

	if (age !== null) {
		if (ministry.min_age != null && age < ministry.min_age) {
			return { eligible: false, reason: 'too_young' };
		}
		if (ministry.max_age != null && age > ministry.max_age) {
			return { eligible: false, reason: 'too_old' };
		}
	}

	const window = windowStatus(ministry, day);
	if (window) return { eligible: false, reason: window };

	return ELIGIBLE;
}

/** `evaluateMinistryEligibility` when only the answer is needed. */
export function isEligibleForMinistry(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	child: EligibilityChild,
	at: Date = new Date()
): boolean {
	return evaluateMinistryEligibility(ministry, child, at).eligible;
}

/** `evaluateMinistryEligibilityOn` when only the answer is needed. */
export function isEligibleForMinistryOn(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	child: EligibilityChild,
	day: string
): boolean {
	return evaluateMinistryEligibilityOn(ministry, child, day).eligible;
}

/**
 * Wording for a child who cannot join, for a screen that chooses to say so
 * rather than simply hide the option.
 */
export function describeIneligibility(
	reason: MinistryIneligibilityReason,
	ministry: Pick<Ministry, 'min_age' | 'max_age'>
): string {
	switch (reason) {
		case 'too_young':
			return `Opens at age ${ministry.min_age}`;
		case 'too_old':
			return `For ages ${ministry.min_age ?? 0}–${ministry.max_age}`;
		case 'not_open_yet':
			return 'Registration has not opened yet';
		case 'closed':
			return 'Registration has closed';
	}
}

/**
 * Pure view-model for the GatherSystem child page (`/household/children/[id]`,
 * #378).
 *
 * Same reasoning as `guardian-home.ts`: Radix does not render in this repo's
 * jsdom, so everything the page says about a child is decided here, where it
 * can be tested, and the component only lays it out.
 *
 * Nothing here fetches. Every input is part of the guardian's own household
 * profile, which they could already read on the legacy page.
 */

import { format, parseISO, isValid } from 'date-fns';
import { ageOn } from '@/lib/dal/utils';
import { formatPhone } from '@/lib/phone-utils';
import { SERVICE_DAY_TIMEZONE } from '@/lib/utils/timezone';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import {
	BIBLE_BEE_MINISTRY_CODE,
	enrollmentsForCycle,
} from '@/lib/guardian-home';

type EnrollmentLike = {
	enrollment_id?: string | null;
	cycle_id?: string | null;
	ministryName?: string | null;
	ministry_code?: string | null;
	status?: string | null;
};

type ChildLike = {
	child_id: string;
	dob?: string | null;
	grade?: string | number | null;
	allergies?: string | null;
	medical_notes?: string | null;
	special_needs?: boolean | null;
	special_needs_notes?: string | null;
	child_mobile?: string | null;
	enrollmentsByCycle?: Record<string, EnrollmentLike[]>;
	enrollments?: EnrollmentLike[];
};

type PersonLike = {
	first_name?: string | null;
	last_name?: string | null;
	mobile_phone?: string | null;
	relationship?: string | null;
};

/** The age a child turns self-check-out eligible, matching `child-card.tsx`. */
export const SELF_CHECKOUT_MIN_AGE = 13;

function fullName(person: PersonLike | null | undefined): string {
	return [person?.first_name, person?.last_name]
		.map((part) => (part ?? '').trim())
		.filter(Boolean)
		.join(' ');
}

/** Age in whole years on `todayIso`, or null without a usable date of birth. */
export function ageFromDob(
	dob: string | null | undefined,
	todayIso: string
): number | null {
	return ageOn(todayIso, dob ?? undefined);
}

/**
 * `3rd Grade · Age 9 · Born Mar 14, 2017 · Bennett Household`.
 *
 * Every part is optional in the data and each is dropped rather than printed
 * empty. The grade uses `normalizeGradeDisplay` like the home, and `Unknown`
 * is its "no grade on file" answer, so it is left out the same way.
 */
export function buildChildHeaderMeta(input: {
	grade?: string | number | null;
	dob?: string | null;
	householdName?: string | null;
	todayIso: string;
}): string {
	const parts: string[] = [];
	const gradeLabel = normalizeGradeDisplay(input.grade ?? undefined).trim();
	if (gradeLabel && gradeLabel !== 'Unknown') parts.push(gradeLabel);

	const age = ageFromDob(input.dob, input.todayIso);
	if (age !== null && age >= 0) parts.push(`Age ${age}`);

	if (input.dob) {
		const born = parseISO(input.dob);
		if (isValid(born)) parts.push(`Born ${format(born, 'MMM d, yyyy')}`);
	}

	// Printed as stored. Registration already names a household
	// `Bennett Household`, so adding the word again would double it.
	const household = (input.householdName ?? '').trim();
	if (household) parts.push(household);

	return parts.join(' · ');
}

const NO_ALLERGY_ANSWERS = new Set(['none', 'n/a', 'na', 'no', 'nka', 'nkda']);

/**
 * The allergy text for the red box, or null when there is nothing to warn
 * about. Registration lets a guardian type "None", and a red box announcing
 * "None" reads as an alarm about nothing, so the common no-allergy answers are
 * treated as empty.
 */
export function allergyAlert(allergies: string | null | undefined): string | null {
	const text = (allergies ?? '').trim();
	if (!text) return null;
	if (NO_ALLERGY_ANSWERS.has(text.toLowerCase().replace(/\.$/, ''))) return null;
	return text;
}

/** `Yes` / `No`, with the notes on their own line when there are any. */
export function specialNeedsSummary(child: ChildLike): {
	label: string;
	notes: string | null;
} {
	const notes = (child.special_needs_notes ?? '').trim();
	return {
		label: child.special_needs ? 'Yes' : 'No',
		notes: child.special_needs && notes ? notes : null,
	};
}

export type EnrollmentStatus = 'enrolled' | 'interested';

export type ChildEnrollmentRow = {
	key: string;
	name: string;
	status: EnrollmentStatus;
	isBibleBee: boolean;
};

/**
 * The child's programs for the active cycle.
 *
 * Withdrawn enrollments are left out: the card lists what the child is doing
 * this cycle, and the household page keeps the full record. The Bible Bee row
 * is found by ministry code, like the home, so a cycle that renames the
 * ministry still gets its "View progress" link.
 */
export function buildEnrollmentRows(
	child: ChildLike,
	activeCycleId: string | null | undefined
): ChildEnrollmentRow[] {
	const rows: ChildEnrollmentRow[] = [];
	const seen = new Set<string>();
	for (const enrollment of enrollmentsForCycle(child, activeCycleId) as EnrollmentLike[]) {
		if (enrollment.status === 'withdrawn') continue;
		const name = (enrollment.ministryName ?? '').trim();
		if (!name || seen.has(name)) continue;
		seen.add(name);
		rows.push({
			key: enrollment.enrollment_id || name,
			name,
			status: enrollment.status === 'expressed_interest' ? 'interested' : 'enrolled',
			isBibleBee: enrollment.ministry_code === BIBLE_BEE_MINISTRY_CODE,
		});
	}
	return rows;
}

/** `FALL 2026 CYCLE` above the enrollment rows, or null between cycles. */
export function cycleEyebrow(
	cycleNames: Record<string, string> | null | undefined,
	activeCycleId: string | null | undefined
): string | null {
	if (!activeCycleId) return null;
	const name = (cycleNames?.[activeCycleId] ?? '').trim();
	return name ? `${name} cycle` : null;
}

/**
 * The self check-out line. Mirrors the legacy card's rule — 13 or older and a
 * mobile number on file — and says which half is missing when the child is
 * not eligible, so the guardian knows what would change it.
 */
export function selfCheckoutLine(
	child: ChildLike,
	todayIso: string
): { eligible: boolean; text: string } {
	const age = ageFromDob(child.dob, todayIso);
	if (age === null || age < SELF_CHECKOUT_MIN_AGE) {
		return { eligible: false, text: `Not eligible — under ${SELF_CHECKOUT_MIN_AGE}` };
	}
	if (!(child.child_mobile ?? '').trim()) {
		return { eligible: false, text: 'Not eligible — no phone on file' };
	}
	return { eligible: true, text: 'Eligible' };
}

/** `Renee Hall (Aunt)` and the formatted phone, or null with no contact. */
export function emergencyContactLines(
	contact: PersonLike | null | undefined
): { name: string; phone: string | null } | null {
	const name = fullName(contact);
	if (!name) return null;
	const relationship = (contact?.relationship ?? '').trim();
	const phone = (contact?.mobile_phone ?? '').trim();
	return {
		name: relationship ? `${name} (${relationship})` : name,
		phone: phone ? formatPhone(phone) : null,
	};
}

/**
 * The household's guardians, listed as the people approved for pickup. The
 * legacy card listed them with phone numbers, so the numbers are kept.
 */
export function pickupGuardians(
	guardians: PersonLike[] | null | undefined
): { name: string; phone: string | null }[] {
	return (guardians ?? [])
		.map((guardian) => {
			const phone = (guardian.mobile_phone ?? '').trim();
			return { name: fullName(guardian), phone: phone ? formatPhone(phone) : null };
		})
		.filter((row) => row.name);
}

type AttendanceLike = {
	child_id?: string | null;
	check_out_at?: string | null;
	check_in_at?: string | null;
	event_name?: string | null;
};

/**
 * `9:42 AM`, in the church's time zone rather than the viewer's, so a guardian
 * travelling or on a misconfigured phone still reads the time the door saw.
 */
export function formatCheckInTime(checkInAt: string | null | undefined): string | null {
	if (!checkInAt) return null;
	const at = new Date(checkInAt);
	if (Number.isNaN(at.getTime())) return null;
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: SERVICE_DAY_TIMEZONE,
	}).format(at);
}

/**
 * The event and time for the Today card while the child is checked in, or
 * null when they are not. Reads the same open row `derivePresence` does, so
 * the pill and these details can never disagree. Deliberately no "by …": the
 * data only knows which staff member checked the child in, and naming staff to
 * guardians was not approved (#378).
 */
export function todayCheckIn(
	childId: string,
	attendance: AttendanceLike[] | null | undefined
): { eventName: string | null; time: string | null } | null {
	const open = (attendance ?? []).find(
		(row) => row.child_id === childId && !row.check_out_at
	);
	if (!open) return null;
	return {
		eventName: (open.event_name ?? '').trim() || null,
		time: formatCheckInTime(open.check_in_at),
	};
}

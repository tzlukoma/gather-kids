/**
 * Pure view-model for the GatherSystem guardian home (`1r home`, #371).
 *
 * Everything the home screen shows is derived here rather than inside the
 * component: the greeting, the household line, each child's row, and the Bible
 * Bee summary copy. Radix does not render in this repo's jsdom, so logic that
 * lives in a component cannot be tested; logic that lives here can be, and all
 * of it is.
 *
 * These functions never fetch. They take data the guardian is already
 * authorized to see — their own household profile, and attendance rows scoped
 * to their own children — and decide what the screen says about it.
 */

import { normalizeGradeDisplay } from '@/lib/gradeUtils';

/** Greeting slot. The screen only ever shows one of these three. */
export type GreetingSlot = 'morning' | 'afternoon' | 'evening';

/** Whether a child is on site right now, as the home screen states it. */
export type ChildPresence = 'on-site' | 'not-checked-in';

export type GuardianChildRow = {
	childId: string;
	name: string;
	initials: string;
	/** `1st grade · Sunday School`, or just the grade, or just the ministries. */
	meta: string;
	presence: ChildPresence;
};

type AttendanceRow = {
	child_id?: string | null;
	check_out_at?: string | null;
};

type EnrollmentLike = {
	cycle_id?: string | null;
	ministryName?: string | null;
	ministry_code?: string | null;
};

type ChildLike = {
	child_id: string;
	first_name?: string | null;
	last_name?: string | null;
	grade?: string | number | null;
	is_active?: boolean | null;
	enrollmentsByCycle?: Record<string, EnrollmentLike[]>;
	enrollments?: EnrollmentLike[];
};

type GuardianLike = {
	first_name?: string | null;
	last_name?: string | null;
	is_primary?: boolean | null;
};

/**
 * Local-time greeting slot. Morning runs to noon and afternoon to 17:00, which
 * is where the words stop being true rather than where the clock divides
 * evenly.
 */
export function greetingSlotForHour(hour: number): GreetingSlot {
	if (hour < 12) return 'morning';
	if (hour < 17) return 'afternoon';
	return 'evening';
}

const GREETING_TEXT: Record<GreetingSlot, string> = {
	morning: 'Good morning',
	afternoon: 'Good afternoon',
	evening: 'Good evening',
};

/**
 * `Good morning, Tasha` — or `Good morning` alone when we have no first name.
 * A greeting addressed to nobody still reads; `Good morning, ` does not.
 */
export function buildGreeting(
	slot: GreetingSlot,
	firstName?: string | null
): string {
	const trimmed = (firstName ?? '').trim();
	return trimmed ? `${GREETING_TEXT[slot]}, ${trimmed}` : GREETING_TEXT[slot];
}

/**
 * The name to greet. Prefers the guardian who is marked primary, because that
 * is the household's own answer to "whose name is on this"; falls back to the
 * first guardian on file so a household that never set the flag is still
 * greeted by name.
 */
export function pickGreetedGuardianName(
	guardians: GuardianLike[] | null | undefined
): string | null {
	const list = guardians ?? [];
	const primary = list.find((guardian) => guardian.is_primary);
	const chosen = primary ?? list[0];
	const first = (chosen?.first_name ?? '').trim();
	return first || null;
}

/**
 * `Bennett household · Fall 2026 cycle`.
 *
 * Both halves are optional in the data: a household row may have no `name`, and
 * a site between cycles has no active cycle. Each half is dropped rather than
 * printed empty, and an empty result tells the caller to omit the line.
 */
export function buildHouseholdLine(
	householdName: string | null | undefined,
	cycleName: string | null | undefined
): string {
	const parts: string[] = [];
	const household = (householdName ?? '').trim();
	const cycle = (cycleName ?? '').trim();
	if (household) parts.push(`${household} household`);
	if (cycle) parts.push(`${cycle} cycle`);
	return parts.join(' · ');
}

/** `AB` for Amara Bennett. Falls back to `?` so the avatar tile is never blank. */
export function initialsForName(
	firstName?: string | null,
	lastName?: string | null
): string {
	const initials = [firstName, lastName]
		.map((part) => (part ?? '').trim()[0] ?? '')
		.filter(Boolean)
		.join('')
		.toUpperCase();
	return initials || '?';
}

/**
 * A child is on site when they have an attendance row for the day that has not
 * been checked out. Rows for other children are ignored rather than trusted —
 * the caller scopes the query to this household, and this keeps a wider result
 * set from ever colouring the wrong row.
 */
export function derivePresence(
	childId: string,
	attendance: AttendanceRow[] | null | undefined
): ChildPresence {
	const open = (attendance ?? []).some(
		(row) => row.child_id === childId && !row.check_out_at
	);
	return open ? 'on-site' : 'not-checked-in';
}

export const PRESENCE_LABEL: Record<ChildPresence, string> = {
	'on-site': 'On site',
	'not-checked-in': 'Not checked in',
};

/**
 * Ministry names the child is enrolled in for the active cycle, in enrollment
 * order and without duplicates. Falls back to the flat `enrollments` list when
 * there is no active cycle, so a household viewed between cycles still shows
 * what its children are signed up for.
 */
export function ministryNamesForCycle(
	child: ChildLike,
	activeCycleId: string | null | undefined
): string[] {
	const byCycle = child.enrollmentsByCycle ?? {};
	const enrollments =
		(activeCycleId ? byCycle[activeCycleId] : undefined) ??
		child.enrollments ??
		[];

	const names: string[] = [];
	for (const enrollment of enrollments) {
		const name = (enrollment.ministryName ?? '').trim();
		if (name && !names.includes(name)) names.push(name);
	}
	return names;
}

/**
 * `1st Grade · Sunday School`. Either half may be missing; neither is faked.
 *
 * The grade string comes from `normalizeGradeDisplay`, which is what the door
 * and the rosters already print, so the same child reads the same way on every
 * screen. That is also why the casing is `1st Grade` and not the `1st grade` in
 * the Figma frame — the repository's existing display wins over the mock.
 * `Unknown` is its "no grade on file" answer and is dropped rather than shown.
 */
export function buildChildMeta(
	grade: string | number | null | undefined,
	ministryNames: string[]
): string {
	const parts: string[] = [];
	const gradeLabel = normalizeGradeDisplay(grade ?? undefined).trim();
	if (gradeLabel && gradeLabel !== 'Unknown') parts.push(gradeLabel);
	if (ministryNames.length > 0) parts.push(ministryNames.join(', '));
	return parts.join(' · ');
}

/**
 * The `CHILDREN` list. Inactive children are left out — they are not part of
 * this cycle's household and a row for them would read as an omission on the
 * guardian's part rather than on ours.
 */
export function buildChildRows(
	children: ChildLike[] | null | undefined,
	attendance: AttendanceRow[] | null | undefined,
	activeCycleId: string | null | undefined
): GuardianChildRow[] {
	return (children ?? [])
		.filter((child) => child.is_active !== false)
		.map((child) => ({
			childId: child.child_id,
			name: [child.first_name, child.last_name]
				.map((part) => (part ?? '').trim())
				.filter(Boolean)
				.join(' '),
			initials: initialsForName(child.first_name, child.last_name),
			meta: buildChildMeta(
				child.grade,
				ministryNamesForCycle(child, activeCycleId)
			),
			presence: derivePresence(child.child_id, attendance),
		}));
}

const SMALL_NUMBER_WORDS = [
	'Zero',
	'One',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Eleven',
	'Twelve',
	'Thirteen',
	'Fourteen',
	'Fifteen',
	'Sixteen',
	'Seventeen',
	'Eighteen',
	'Nineteen',
	'Twenty',
];

/**
 * Sentence-leading count, spelled out through twenty to match the Figma copy
 * (`Eleven left ...`) and numeric above it, where words stop being easier to
 * read than digits.
 */
export function countWord(count: number): string {
	if (!Number.isFinite(count) || count < 0) return '0';
	const whole = Math.floor(count);
	return SMALL_NUMBER_WORDS[whole] ?? String(whole);
}

/**
 * The line under the Bible Bee progress bar.
 *
 * The signed frame reads `Eleven left before the Nov 15 competition.` There is
 * no competition date in the schema (`bible_bee_cycles` has id, cycle_id, name,
 * description, is_active only), so the clause naming it is dropped rather than
 * invented. Recorded as a discrepancy on the PR; adding the column is a schema
 * decision that belongs to its own issue.
 */
export function buildScriptureProgressCopy(
	completed: number,
	total: number
): string {
	if (total <= 0) return 'No scriptures assigned yet.';
	const remaining = Math.max(total - completed, 0);
	if (remaining === 0) return 'Every scripture memorized.';
	const noun = remaining === 1 ? 'scripture' : 'scriptures';
	return `${countWord(remaining)} ${noun} left to memorize.`;
}

/** Bar fill, clamped so bad data cannot paint past the track or negative. */
export function progressPercent(completed: number, total: number): number {
	if (!Number.isFinite(total) || total <= 0) return 0;
	const ratio = completed / total;
	if (!Number.isFinite(ratio)) return 0;
	return Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
}

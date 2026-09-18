import { format, parseISO } from 'date-fns';

/**
 * Pure presentation logic for the GatherSystem door check-in screen
 * (`check-in-content-gathersystem.tsx`, Figma `17:2` · "Door Check-in · 1a").
 *
 * The screen itself is built from Radix primitives (Tabs, Dialog) that this
 * repo's jsdom setup cannot drive, so the arithmetic and the filtering live
 * here where they can be unit-tested directly. Nothing in this module reads or
 * writes data: the caller has already fetched an authorized roster.
 */

/**
 * URL/filter contract shared with the legacy screen and the admin dashboard
 * deep links (`/check-in?filter=checkedIn`). `checkedOut` means "not currently
 * on site" — it is the historical wire value for the "Not checked in" tab and
 * must not be renamed without updating those links.
 */
export type DoorStatusFilter = 'all' | 'checkedIn' | 'checkedOut';

/** The minimum shape the door screen needs from an enriched child row. */
export interface DoorRosterEntry {
	child_id: string;
	/** Today's open attendance row, or null when the child is not on site. */
	activeAttendance: {
		attendance_id: string;
		check_in_at?: string;
	} | null;
	household?: { name?: string } | null;
}

/** The minimum shape the door screen needs from an incident. */
export interface DoorIncidentEntry {
	admin_acknowledged_at?: string | null;
}

export interface DoorStats {
	/** Children on the roster with an open attendance row. */
	onSite: number;
	/** Roster size — the "of M" denominator. */
	total: number;
	/** Children on the roster with no open attendance row. */
	notCheckedIn: number;
	/** Today's incidents still awaiting admin acknowledgement. */
	openIncidents: number;
}

export interface DoorStatusCounts {
	all: number;
	checkedIn: number;
	notCheckedIn: number;
}

export type DoorRowStatus = 'checkedIn' | 'notCheckedIn';

export interface DoorRowState {
	status: DoorRowStatus;
	/** Attendance id to check out against, or null when not on site. */
	attendanceId: string | null;
	/** ISO check-in timestamp, when the attendance row carries one. */
	checkInAt: string | null;
}

/** True when the child currently has an open (not checked out) attendance row. */
export function isOnSite(entry: DoorRosterEntry): boolean {
	return entry.activeAttendance !== null && entry.activeAttendance !== undefined;
}

/**
 * Per-row status derivation for the Status and Action columns.
 *
 * `attendanceId` is what the check-out path needs: the door screen passes it
 * straight to `useCheckOutMutation` as `{ attendanceId, verifier }`, matching
 * the legacy `check-in-view.tsx` contract.
 */
export function deriveDoorRowStatus(entry: DoorRosterEntry): DoorRowState {
	const attendance = entry.activeAttendance;
	if (!attendance) {
		return { status: 'notCheckedIn', attendanceId: null, checkInAt: null };
	}
	return {
		status: 'checkedIn',
		attendanceId: attendance.attendance_id,
		checkInAt: attendance.check_in_at ?? null,
	};
}

/**
 * Status chip copy. Checked-in rows carry the check-in time when the
 * attendance row has one ("Checked in 9:04 AM"); a row without a timestamp
 * falls back to the bare label rather than rendering "Invalid Date".
 */
export function formatDoorStatusLabel(state: DoorRowState): string {
	if (state.status === 'notCheckedIn') return 'Not checked in';
	if (!state.checkInAt) return 'Checked in';
	try {
		const at = parseISO(state.checkInAt);
		if (Number.isNaN(at.getTime())) return 'Checked in';
		return `Checked in ${format(at, 'h:mm a')}`;
	} catch {
		return 'Checked in';
	}
}

/**
 * The three stats cards.
 *
 * All three roster numbers share one denominator — the active-cycle roster the
 * table below renders — so "on site" + "not checked in" always reconciles with
 * the "of M" total and with the tab counts. (The legacy screen derived its
 * on-site number from the raw attendance rows instead, which can disagree with
 * the roster when an attendance row exists for a child outside the active
 * cycle.)
 */
export function computeDoorStats(
	roster: DoorRosterEntry[],
	incidents: DoorIncidentEntry[] = []
): DoorStats {
	const onSite = roster.filter(isOnSite).length;
	return {
		onSite,
		total: roster.length,
		notCheckedIn: roster.length - onSite,
		openIncidents: incidents.filter((i) => !i.admin_acknowledged_at).length,
	};
}

/** Live counts for the All / Checked in / Not checked in tabs. */
export function countDoorStatuses(roster: DoorRosterEntry[]): DoorStatusCounts {
	const checkedIn = roster.filter(isOnSite).length;
	return {
		all: roster.length,
		checkedIn,
		notCheckedIn: roster.length - checkedIn,
	};
}

/** Status-tab predicate. `all` matches everything. */
export function matchesDoorStatusFilter(
	entry: DoorRosterEntry,
	filter: DoorStatusFilter
): boolean {
	if (filter === 'all') return true;
	if (filter === 'checkedIn') return isOnSite(entry);
	return !isOnSite(entry);
}

/** Convenience wrapper over `matchesDoorStatusFilter` for a whole list. */
export function filterByDoorStatus(
	roster: DoorRosterEntry[],
	filter: DoorStatusFilter
): DoorRosterEntry[] {
	if (filter === 'all') return roster;
	return roster.filter((entry) => matchesDoorStatusFilter(entry, filter));
}

const UNKNOWN_HOUSEHOLD = 'Unknown household';

/**
 * Sticky-dock household summary, e.g. "Bennett ×2 · Alvarez ×1".
 *
 * Households are ordered by how many of their children are selected (most
 * first), then alphabetically, so the busiest household reads first at the
 * door. The list is capped so the dock cannot overflow on a wide selection.
 */
export function summarizeSelectedHouseholds(
	roster: DoorRosterEntry[],
	selectedChildIds: Iterable<string>,
	maxHouseholds = 3
): string {
	const selected = new Set(selectedChildIds);
	if (selected.size === 0) return '';

	const counts = new Map<string, number>();
	for (const entry of roster) {
		if (!selected.has(entry.child_id)) continue;
		const name = entry.household?.name?.trim() || UNKNOWN_HOUSEHOLD;
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	if (counts.size === 0) return '';

	const ordered = Array.from(counts.entries()).sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
	);
	const shown = ordered.slice(0, maxHouseholds);
	const parts = shown.map(([name, count]) =>
		count > 1 ? `${name} ×${count}` : name
	);
	const hidden = ordered.length - shown.length;
	if (hidden > 0) parts.push(`+${hidden} more`);
	return parts.join(' · ');
}

/**
 * Children that a bulk "Confirm check-in" would actually act on: selected and
 * not already on site. The dock disables itself when this is empty.
 */
export function selectableForCheckIn<T extends DoorRosterEntry>(
	roster: T[],
	selectedChildIds: Iterable<string>
): T[] {
	const selected = new Set(selectedChildIds);
	return roster.filter((entry) => selected.has(entry.child_id) && !isOnSite(entry));
}

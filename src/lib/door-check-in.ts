import { format, parseISO } from 'date-fns';
import { getEventName } from '@/lib/constants';

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
 * The screen's internal filter state, shared with the legacy screen.
 *
 * `checkedOut` is a misnomer worth knowing about: it has never meant "has been
 * checked out", only **"not currently on site"**, which lumps a child who has
 * already gone home together with one who never arrived. Both screens have
 * always behaved that way. It stays as the internal value because the admin
 * dashboard deep-links it and older links exist in the wild; `notCheckedIn` is
 * the spelling to write in new links, and `parseDoorStatusFilter` maps it here.
 */
export type DoorStatusFilter = 'all' | 'checkedIn' | 'checkedOut';

/**
 * Read a `?filter=` value off the URL, or `null` when it is not one we know.
 *
 * `notCheckedIn` is the documented spelling, and says what the tab actually
 * does. `checkedOut` is accepted as an alias so every link already out there —
 * including `/check-in?filter=checkedIn`'s sibling on the admin dashboard —
 * keeps working; a URL is a contract we do not get to break quietly.
 *
 * Unknown values return `null` so the caller can fall back to `all` rather
 * than showing an empty roster because of a typo in a hand-typed link.
 */
export function parseDoorStatusFilter(
	value: string | null | undefined
): DoorStatusFilter | null {
	if (typeof value !== 'string') return null;

	// Case and separators are ignored. These links get typed into an address
	// bar, and an exact-match parser answers `checkedout` or `not-checked-in`
	// by silently falling back to the full roster — which reads on screen as
	// "the filter did nothing" rather than as "that value was not understood".
	const normalized = value.trim().toLowerCase().replace(/[-_\s]/g, '');

	switch (normalized) {
		case 'all':
			return 'all';
		case 'checkedin':
			return 'checkedIn';
		case 'notcheckedin':
		case 'checkedout':
			return 'checkedOut';
		default:
			return null;
	}
}

/** The minimum shape the door screen needs from an enriched child row. */
export interface DoorRosterEntry {
	child_id: string;
	/**
	 * Today's open attendance row, or null when the child is not on site.
	 *
	 * `event_id` matters: a child can be on site at an event other than the one
	 * the door is currently running. The legacy `ChildCard` compared this against
	 * the selected event and refused to offer a check-out for another event's
	 * row; everything below preserves that.
	 */
	activeAttendance: {
		attendance_id: string;
		check_in_at?: string;
		event_id?: string | null;
	} | null;
	household?: { name?: string } | null;
}

/** The minimum shape the door screen needs from an incident. */
export interface DoorIncidentEntry {
	admin_acknowledged_at?: string | null;
}

export interface DoorStats {
	/** Children on the roster checked in to the *selected* event. */
	onSite: number;
	/** Roster size — the "of M" denominator. */
	total: number;
	/** Children on the roster not checked in to the selected event. */
	notCheckedIn: number;
	/**
	 * Of those `notCheckedIn`, how many are on site at a different event.
	 * Surfaced as a sub-label so the "not checked in" number cannot be read as
	 * "not in the building" when some of those children demonstrably are.
	 */
	checkedInElsewhere: number;
	/** Today's incidents still awaiting admin acknowledgement. */
	openIncidents: number;
}

export interface DoorStatusCounts {
	all: number;
	checkedIn: number;
	notCheckedIn: number;
}

export type DoorRowStatus = 'checkedIn' | 'checkedInElsewhere' | 'notCheckedIn';

export interface DoorRowState {
	status: DoorRowStatus;
	/**
	 * Attendance id to check out against. Non-null **only** for `checkedIn` —
	 * a row belonging to another event is never a check-out target, because
	 * releasing a child from Children's Church while standing at the Sunday
	 * School door is not something door staff can have meant.
	 */
	attendanceId: string | null;
	/** ISO check-in timestamp, when the attendance row carries one. */
	checkInAt: string | null;
	/** The other event's id, set only for `checkedInElsewhere`. */
	elsewhereEventId: string | null;
}

/**
 * True when the child has an open attendance row for **any** event, i.e. they
 * are somewhere in the building. This is the check-in guard: the legacy card
 * disabled Check In on `!!checkedInEvent`, not on "checked in here", so a child
 * cannot be checked into two events at once.
 */
export function isOnSite(entry: DoorRosterEntry): boolean {
	return entry.activeAttendance !== null && entry.activeAttendance !== undefined;
}

/**
 * True when the child's open attendance row belongs to `eventId`.
 *
 * This is the single predicate behind the row's own status, the status tabs and
 * the stats cards, so that they cannot give different answers about the same
 * row — see `deriveDoorRowStatus`, which is defined in terms of it.
 *
 * A row carrying no `event_id` at all belongs to **whichever door is asking**.
 * `Attendance.event_id` is non-optional in the schema, so this is a defence
 * against data drift rather than a routine case, and the alternative is worse:
 * a row that matches no door can be closed from none of them, leaving a child
 * marked on site after they have gone home.
 */
export function isCheckedInTo(entry: DoorRosterEntry, eventId: string): boolean {
	const attendance = entry.activeAttendance;
	if (!attendance) return false;
	const rowEvent = attendance.event_id ?? null;
	if (rowEvent === null) return true;
	return rowEvent === eventId;
}

/**
 * Per-row status derivation for the Status and Action columns.
 *
 * `attendanceId` is what the check-out path needs: the door screen passes it
 * straight to `useCheckOutMutation` as `{ attendanceId, verifier }`, matching
 * the legacy `check-in-view.tsx` contract.
 *
 * The three states come straight from `isCheckedInTo`, so this row's action,
 * the tab it falls into and the number on the card can never disagree about it
 * — including for a row with no `event_id`, whose policy lives in that
 * predicate.
 */
export function deriveDoorRowStatus(
	entry: DoorRosterEntry,
	selectedEvent: string
): DoorRowState {
	const attendance = entry.activeAttendance;
	if (!attendance) {
		return {
			status: 'notCheckedIn',
			attendanceId: null,
			checkInAt: null,
			elsewhereEventId: null,
		};
	}

	if (!isCheckedInTo(entry, selectedEvent)) {
		return {
			status: 'checkedInElsewhere',
			attendanceId: null,
			checkInAt: attendance.check_in_at ?? null,
			elsewhereEventId: attendance.event_id ?? null,
		};
	}

	return {
		status: 'checkedIn',
		attendanceId: attendance.attendance_id,
		checkInAt: attendance.check_in_at ?? null,
		elsewhereEventId: null,
	};
}

/**
 * Status chip copy. Checked-in rows carry the check-in time when the
 * attendance row has one ("Checked in 9:04 AM"); a row without a timestamp
 * falls back to the bare label rather than rendering "Invalid Date".
 */
export function formatDoorStatusLabel(state: DoorRowState): string {
	if (state.status === 'notCheckedIn') return 'Not checked in';
	if (state.status === 'checkedInElsewhere') {
		const name = getEventName(state.elsewhereEventId);
		return name ? `In ${name}` : 'In another event';
	}
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
 *
 * "On site" is scoped to the selected event, matching the table beneath it.
 * `checkedInElsewhere` accounts for the difference so the two numbers are never
 * silently at odds with the building.
 */
export function computeDoorStats(
	roster: DoorRosterEntry[],
	incidents: DoorIncidentEntry[] = [],
	selectedEvent = ''
): DoorStats {
	const onSite = roster.filter((entry) =>
		isCheckedInTo(entry, selectedEvent)
	).length;
	const elsewhere = roster.filter(
		(entry) => isOnSite(entry) && !isCheckedInTo(entry, selectedEvent)
	).length;
	return {
		onSite,
		total: roster.length,
		notCheckedIn: roster.length - onSite,
		checkedInElsewhere: elsewhere,
		openIncidents: incidents.filter((i) => !i.admin_acknowledged_at).length,
	};
}

/** Live counts for the All / Checked in / Not checked in tabs. */
export function countDoorStatuses(
	roster: DoorRosterEntry[],
	selectedEvent = ''
): DoorStatusCounts {
	const checkedIn = roster.filter((entry) =>
		isCheckedInTo(entry, selectedEvent)
	).length;
	return {
		all: roster.length,
		checkedIn,
		notCheckedIn: roster.length - checkedIn,
	};
}

/**
 * Status-tab predicate. `all` matches everything, and `checkedIn` means
 * "checked in to the selected event" — so the tab partitions the roster the
 * same way the cards count it.
 */
export function matchesDoorStatusFilter(
	entry: DoorRosterEntry,
	filter: DoorStatusFilter,
	selectedEvent = ''
): boolean {
	if (filter === 'all') return true;
	if (filter === 'checkedIn') return isCheckedInTo(entry, selectedEvent);
	return !isCheckedInTo(entry, selectedEvent);
}

/** Convenience wrapper over `matchesDoorStatusFilter` for a whole list. */
export function filterByDoorStatus(
	roster: DoorRosterEntry[],
	filter: DoorStatusFilter,
	selectedEvent = ''
): DoorRosterEntry[] {
	if (filter === 'all') return roster;
	return roster.filter((entry) =>
		matchesDoorStatusFilter(entry, filter, selectedEvent)
	);
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
 *
 * Deliberately `isOnSite` and not `isCheckedInTo`: a child already checked in
 * to another event must not be swept into this event by a bulk action, which
 * is the same rule the legacy card enforced with `disabled={!!checkedInEvent}`.
 */
export function selectableForCheckIn<T extends DoorRosterEntry>(
	roster: T[],
	selectedChildIds: Iterable<string>
): T[] {
	const selected = new Set(selectedChildIds);
	return roster.filter((entry) => selected.has(entry.child_id) && !isOnSite(entry));
}

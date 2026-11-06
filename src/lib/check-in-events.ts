import { EVENT_OPTIONS, getEventName } from '@/lib/constants';

/**
 * Check-in events as the screens use them: the persisted `events` table, not a
 * list compiled into the app (#561 review, #565). Admins add, rename, archive
 * and delete them on the Events screen; ids never change, so historical
 * attendance keeps pointing at the same event.
 */
export interface CheckInEvent {
	id: string;
	name: string;
	/** Archived events keep their history and name but take no new check-ins. */
	archived?: boolean;
}

/**
 * The compiled-in events, used only until the persisted list has loaded and if
 * it cannot be loaded, so the door keeps working on a bad connection.
 */
export const FALLBACK_CHECK_IN_EVENTS: CheckInEvent[] = EVENT_OPTIONS.map(
	(event) => ({ id: event.id, name: event.name, archived: false })
);

/** Longest event name the screens are laid out for. */
export const MAX_EVENT_NAME_LENGTH = 60;

/**
 * Persisted events in display order. The three long-standing events keep the
 * order staff already know; any other event follows, alphabetically. A row
 * without a name shows its id rather than a blank option.
 */
export function toCheckInEvents(
	rows: ReadonlyArray<{
		event_id: string;
		name?: string | null;
		archived_at?: string | null;
	}>
): CheckInEvent[] {
	const legacyOrder = new Map<string, number>(
		EVENT_OPTIONS.map((event, index) => [event.id, index])
	);
	return rows
		.filter((row) => !!row.event_id)
		.map((row) => ({
			id: row.event_id,
			name: row.name?.trim() || row.event_id,
			archived: !!row.archived_at,
		}))
		.sort((a, b) => {
			const ai = legacyOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
			const bi = legacyOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
			return ai - bi || a.name.localeCompare(b.name);
		});
}

/** Events that take new check-ins and transfers: everything not archived. */
export function activeCheckInEvents(
	events: ReadonlyArray<CheckInEvent>
): CheckInEvent[] {
	return events.filter((event) => !event.archived);
}

/**
 * Events a door or roster's event picker offers: every active event, plus any
 * archived event that still has children on site today.
 *
 * Archiving must not strand a child (#565): check-out and transfer out happen
 * at the door of the event the child is in, so that door has to stay
 * reachable until the last child has left. It drops out of the picker on its
 * own once nobody is there.
 */
export function doorEventOptions(
	events: ReadonlyArray<CheckInEvent>,
	onSiteEventIds: Iterable<string | null | undefined>
): CheckInEvent[] {
	const occupied = new Set(onSiteEventIds);
	return events.filter((event) => !event.archived || occupied.has(event.id));
}

/**
 * Name lookup over `events`, archived ones included so history reads
 * correctly, falling back to the compiled-in names and then the raw id — so an
 * event that has since been deleted still reads sensibly on an old row.
 */
export function eventNameLookup(
	events: ReadonlyArray<CheckInEvent>
): (eventId: string | null | undefined) => string {
	const names = new Map(events.map((event) => [event.id, event.name]));
	return (eventId) => {
		if (!eventId) return '';
		return names.get(eventId) ?? getEventName(eventId);
	};
}

/** Collapse whitespace so " Joy   Bells " and "Joy Bells" are the same name. */
export function normalizeEventName(name: string): string {
	return name.replace(/\s+/g, ' ').trim();
}

/**
 * Why a proposed event name cannot be used, or null when it can.
 *
 * Names must be unique across every event, archived ones included: two
 * "Joy Bells" in a report could not be told apart. Renaming an event to its
 * own name (a change of case or spacing) is allowed.
 */
export function validateEventName(
	name: string,
	events: ReadonlyArray<CheckInEvent>,
	exceptId?: string
): string | null {
	const normalized = normalizeEventName(name);
	if (!normalized) return 'Enter a name for the event.';
	if (normalized.length > MAX_EVENT_NAME_LENGTH) {
		return `Keep the name to ${MAX_EVENT_NAME_LENGTH} characters or fewer.`;
	}
	const clash = events.find(
		(event) =>
			event.id !== exceptId &&
			normalizeEventName(event.name).toLowerCase() === normalized.toLowerCase()
	);
	if (clash) {
		return clash.archived
			? `An archived event is already called "${clash.name}". Restore it instead, or choose another name.`
			: `An event called "${clash.name}" already exists.`;
	}
	return null;
}

/**
 * A new event's id, derived once from its first name and never changed after:
 * "Joy Bells" becomes `evt_joy_bells`, matching the existing ids. If that id
 * is taken (including by an event since renamed), a number is appended.
 */
export function newEventId(name: string, takenIds: Iterable<string>): string {
	const taken = new Set(takenIds);
	const slug =
		normalizeEventName(name)
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 40) || 'event';
	const base = `evt_${slug}`;
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) {
		const candidate = `${base}_${n}`;
		if (!taken.has(candidate)) return candidate;
	}
}

/** How a picker names an event: archived ones say so. */
export function eventPickerLabel(event: CheckInEvent): string {
	return event.archived ? `${event.name} (archived)` : event.name;
}

/** Event ids with an open attendance row in `attendance`: who is on site where. */
export function onSiteEventIds(
	attendance: ReadonlyArray<{ event_id?: string | null; check_out_at?: string | null }>
): string[] {
	return attendance
		.filter((row) => !row.check_out_at && !!row.event_id)
		.map((row) => row.event_id as string);
}

/**
 * Status copy for a checked-in child where the screen is not tied to one
 * event (Rosters, #566): "Checked in · Teen Church". Uses the persisted name
 * lookup, so a renamed or newly added event reads correctly. A row with no
 * event id falls back to the bare label rather than a dangling separator.
 */
export function checkedInStatusLabel(
	eventId: string | null | undefined,
	nameOf: (eventId: string | null | undefined) => string
): string {
	const name = eventId ? nameOf(eventId) : '';
	return name ? `Checked in · ${name}` : 'Checked in';
}

import { EVENT_OPTIONS, getEventName } from '@/lib/constants';

/**
 * Check-in events as the screens use them: the persisted `events` table, not a
 * list compiled into the app (#561 review). Adding a row there makes it a
 * check-in event and a transfer destination; renaming one renames it
 * everywhere these helpers are used. The id never changes, so historical
 * attendance keeps pointing at the same event.
 *
 * Every row in `events` is treated as a check-in event. The table has no
 * enabled/archived flag yet; that belongs with event management.
 */
export interface CheckInEvent {
	id: string;
	name: string;
}

/**
 * The compiled-in events, used only until the persisted list has loaded and if
 * it cannot be loaded, so the door keeps working on a bad connection.
 */
export const FALLBACK_CHECK_IN_EVENTS: CheckInEvent[] = EVENT_OPTIONS.map(
	(event) => ({ id: event.id, name: event.name })
);

/**
 * Persisted events in display order. The three long-standing events keep the
 * order staff already know; any other event follows, alphabetically. A row
 * without a name shows its id rather than a blank option.
 */
export function toCheckInEvents(
	rows: ReadonlyArray<{ event_id: string; name?: string | null }>
): CheckInEvent[] {
	const legacyOrder = new Map<string, number>(
		EVENT_OPTIONS.map((event, index) => [event.id, index])
	);
	return rows
		.filter((row) => !!row.event_id)
		.map((row) => ({ id: row.event_id, name: row.name?.trim() || row.event_id }))
		.sort((a, b) => {
			const ai = legacyOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
			const bi = legacyOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
			return ai - bi || a.name.localeCompare(b.name);
		});
}

/**
 * Name lookup over `events`, falling back to the compiled-in names and then
 * the raw id — so an event that has since been deleted from the table still
 * reads sensibly on an old attendance row.
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

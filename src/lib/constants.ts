/**
 * Shared application constants to avoid duplication across files.
 */

/** Human-readable display names for event IDs. */
export const EVENT_NAMES: Record<string, string> = {
	evt_sunday_school: 'Sunday School',
	evt_childrens_church: "Children's Church",
	evt_teen_church: 'Teen Church',
};

/** Ordered list of event options for selects/radio groups. */
export const EVENT_OPTIONS = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: "Children's Church" },
	{ id: 'evt_teen_church', name: 'Teen Church' },
] as const;

/** Returns the display name for an event ID, falling back to the raw ID. */
export function getEventName(eventId: string | null | undefined): string {
	if (!eventId) return '';
	return EVENT_NAMES[eventId] ?? eventId;
}

/**
 * Shown on the check-in screens and Rosters when the `events` table answered
 * with no events to offer (#567 review). Without it the event picker is
 * simply empty and a check-in would be refused with no explanation.
 */
export function NoCheckInEventsNotice() {
	return (
		<div
			role="alert"
			className="rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
			No check-in events are set up, so children cannot be checked in yet. An administrator
			can add one under <strong>Events</strong>.
		</div>
	);
}

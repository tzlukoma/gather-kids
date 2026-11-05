/**
 * DAL — Events domain
 *
 * Check-in events (#561, #565). Writes are admin-only, enforced by the
 * database (RLS on `events`); the database also refuses a blank name, refuses
 * to delete an event with attendance history, and refuses new check-ins and
 * transfers into an archived event. What is checked here is for a clear
 * message before the round trip, not for authority.
 */

import { db as dbAdapter } from '../database/factory';
import {
    newEventId,
    normalizeEventName,
    toCheckInEvents,
    validateEventName,
    type CheckInEvent,
} from '../check-in-events';

/** Every persisted event, archived ones included, in display order. */
export async function getCheckInEvents(): Promise<CheckInEvent[]> {
    return toCheckInEvents(await dbAdapter.listEvents());
}

export interface EventUsage {
    /** Attendance rows the event has ever had. Any history means archive, not delete. */
    attendanceCount: number;
    /** Children checked in there today. */
    onSiteCount: number;
}

/** Usage per event id, for the admin Events screen. */
export async function getEventUsage(): Promise<Record<string, EventUsage>> {
    const rows = await dbAdapter.getEventAttendanceSummary();
    return Object.fromEntries(
        rows.map((row) => [
            row.event_id,
            { attendanceCount: row.attendance_count, onSiteCount: row.on_site_count },
        ]),
    );
}

export type EventManagementFailure =
    | 'invalid_name'
    | 'has_history'
    | 'forbidden'
    | 'not_found'
    | 'failed';

export class EventManagementError extends Error {
    readonly reason: EventManagementFailure;

    constructor(reason: EventManagementFailure, message: string) {
        super(message);
        this.name = 'EventManagementError';
        this.reason = reason;
    }
}

function codeOf(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('code' in error)) return '';
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
}

/** Turn a database refusal into something an admin can act on. */
function toEventError(error: unknown, action: string): EventManagementError {
    if (error instanceof EventManagementError) return error;
    switch (codeOf(error)) {
        case '23503':
            return new EventManagementError(
                'has_history',
                'This event has attendance history, so it cannot be deleted. Archive it instead.',
            );
        case '23514':
            return new EventManagementError('invalid_name', 'Enter a name for the event.');
        case '23505':
            return new EventManagementError(
                'failed',
                'Another event was just created with the same id. Please try again.',
            );
        case '42501':
            return new EventManagementError('forbidden', 'Only admins can manage events.');
        case 'PGRST116':
            // An update or delete that reached no row: hidden by RLS, or gone.
            return new EventManagementError(
                'not_found',
                'That event could not be changed. It may have been removed, or you may not be allowed to manage events.',
            );
        default:
            return new EventManagementError(
                'failed',
                `The event could not be ${action}. Please try again.`,
            );
    }
}

/**
 * Create an event. `existing` is the current list (archived included), used to
 * refuse a duplicate name and to pick an id that is not taken.
 */
export async function createCheckInEvent(
    name: string,
    existing: ReadonlyArray<CheckInEvent>,
): Promise<CheckInEvent> {
    const problem = validateEventName(name, existing);
    if (problem) throw new EventManagementError('invalid_name', problem);
    const cleanName = normalizeEventName(name);
    try {
        const created = await dbAdapter.createCheckInEvent({
            event_id: newEventId(cleanName, existing.map((event) => event.id)),
            name: cleanName,
        });
        return toCheckInEvents([created])[0];
    } catch (error) {
        throw toEventError(error, 'created');
    }
}

/** Rename an event. Its id, and so every attendance row, is unchanged. */
export async function renameCheckInEvent(
    eventId: string,
    name: string,
    existing: ReadonlyArray<CheckInEvent>,
): Promise<void> {
    const problem = validateEventName(name, existing, eventId);
    if (problem) throw new EventManagementError('invalid_name', problem);
    try {
        await dbAdapter.updateCheckInEvent(eventId, { name: normalizeEventName(name) });
    } catch (error) {
        throw toEventError(error, 'renamed');
    }
}

/**
 * Archive or restore an event. Archiving keeps the event, its name and its
 * history; it stops new check-ins and transfers into it. Children already
 * there can still be checked out or transferred out.
 */
export async function setCheckInEventArchived(
    eventId: string,
    archived: boolean,
): Promise<void> {
    try {
        await dbAdapter.updateCheckInEvent(eventId, {
            archived_at: archived ? new Date().toISOString() : null,
        });
    } catch (error) {
        throw toEventError(error, archived ? 'archived' : 'restored');
    }
}

/**
 * Delete an event that has never had attendance. The database refuses if it
 * has any (`has_history`), whatever this screen last saw.
 */
export async function deleteCheckInEvent(eventId: string): Promise<void> {
    let stillThere: Awaited<ReturnType<typeof dbAdapter.getEvent>>;
    try {
        await dbAdapter.deleteEvent(eventId);
        // A delete that RLS does not admit removes nothing and reports no
        // error, so confirm the row is actually gone before saying it is.
        stillThere = await dbAdapter.getEvent(eventId);
    } catch (error) {
        throw toEventError(error, 'deleted');
    }
    if (stillThere) {
        throw new EventManagementError(
            'forbidden',
            'The event was not deleted. Only admins can delete events.',
        );
    }
}

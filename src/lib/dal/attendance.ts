/**
 * DAL — Attendance domain
 *
 * All functions delegate to the Supabase adapter (dbAdapter).
 */

import { db as dbAdapter } from '../database/factory';
import type { Attendance, Child, Incident, IncidentSeverity } from '../types';
import { countChildrenOnSite } from '../attendance-open-count';
import { getServiceDayIso } from './utils';
import { v4 as uuidv4 } from 'uuid';

export const ALREADY_CHECKED_IN_MESSAGE =
    'This child is already checked in to another event.';

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
    );
}

// ---------------------------------------------------------------------------
// Attendance queries
// ---------------------------------------------------------------------------

/**
 * Get all attendance records for a specific date.
 */
export async function getAttendanceForDate(dateISO: string): Promise<Attendance[]> {
    return dbAdapter.listAttendance({ date: dateISO });
}

/**
 * Get the count of children currently checked in for a specific date.
 */
export async function getCheckedInCount(dateISO: string): Promise<number> {
    const attendance = await dbAdapter.listAttendance({ date: dateISO });
    return countChildrenOnSite(attendance);
}

/**
 * Get children who are currently checked in for a specific date.
 */
export async function getCheckedInChildren(dateISO: string): Promise<Child[]> {
    const attendance = await dbAdapter.listAttendance({ date: dateISO });
    const checkedInAttendance = attendance.filter(a => !a.check_out_at);
    const childIds = checkedInAttendance.map(a => a.child_id);

    if (childIds.length === 0) return [];

    const allChildren = await dbAdapter.listChildren({ isActive: true });
    return allChildren.filter(c => childIds.includes(c.child_id));
}

// ---------------------------------------------------------------------------
// Check-in / check-out mutations
// ---------------------------------------------------------------------------

/**
 * Record a child check-in event.
 *
 * Throws if the child already has an active (not checked-out) attendance
 * record for today.
 */
export async function recordCheckIn(
    childId: string,
    eventId: string,
    timeslotId?: string,
    userId?: string,
): Promise<string> {
    const today = getServiceDayIso();

    const activeCheckIns = await dbAdapter.listAttendance({
        childId: childId,
        date: today,
    });

    const activeCheckIn = activeCheckIns.find(rec => !rec.check_out_at);
    if (activeCheckIn) {
        throw new Error(ALREADY_CHECKED_IN_MESSAGE);
    }

    try {
        const attendanceRecord = await dbAdapter.createAttendance({
            event_id: eventId,
            child_id: childId,
            date: today,
            timeslot_id: timeslotId,
            check_in_at: new Date().toISOString(),
            checked_in_by: userId,
        });

        return attendanceRecord.attendance_id;
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new Error(ALREADY_CHECKED_IN_MESSAGE);
        }
        throw error;
    }
}

/**
 * Record a child check-out event.
 */
export async function recordCheckOut(
    attendanceId: string,
    verifier: { method: 'PIN' | 'other'; value: string; pickedUpBy?: string },
    userId?: string,
): Promise<string> {
    const attendanceRecord = await dbAdapter.getAttendance(attendanceId);
    if (!attendanceRecord) throw new Error('Attendance record not found');

    const updatedRecord = await dbAdapter.updateAttendance(attendanceId, {
        check_out_at: new Date().toISOString(),
        checked_out_by: userId,
        pickup_method: verifier.method,
        picked_up_by:
            verifier.pickedUpBy ||
            (verifier.method === 'other' ? verifier.value : undefined),
    });

    return updatedRecord.attendance_id;
}

/**
 * Why a transfer did not complete, so the screen can say what to do next.
 *
 * The first four are **confirmed**: the database answered, and its transaction
 * was rolled back, so the child is where they were.
 *
 * - `forbidden`: the signed-in user may not move this child.
 * - `stale`: the child is no longer on that row (already checked out, or
 *   already moved by someone else). The roster needs refreshing. Also used
 *   when a transfer whose answer was lost turns out to have committed but the
 *   child has been picked up or moved on since; `currentEventId` then names
 *   where they are, if still on site.
 * - `invalid`: the destination is not a valid choice.
 * - `failed`: the database refused for another reason; nothing changed.
 *
 * - `unknown`: no answer came back (a dropped connection, a timeout, a gateway
 *   error). The transfer may have committed before the response was lost, so
 *   "nothing changed" would be a guess. `currentEventId` carries the child's
 *   location when a fresh read could establish it.
 */
export type TransferFailureReason = 'forbidden' | 'stale' | 'invalid' | 'failed' | 'unknown';

export class AttendanceTransferError extends Error {
    readonly reason: TransferFailureReason;
    /** Where the child is now, when a fresh read established it. */
    readonly currentEventId: string | null;

    constructor(reason: TransferFailureReason, message: string, currentEventId: string | null = null) {
        super(message);
        this.name = 'AttendanceTransferError';
        this.reason = reason;
        this.currentEventId = currentEventId;
    }
}

const TRANSFER_REASON_BY_SQLSTATE: Record<string, TransferFailureReason> = {
    '42501': 'forbidden',
    P0002: 'stale',
    '22023': 'invalid',
};

const TRANSFER_FALLBACK_MESSAGE: Record<Exclude<TransferFailureReason, 'unknown'>, string> = {
    forbidden: 'You are not allowed to transfer this child.',
    stale: 'This child is no longer checked in there. The roster has been refreshed.',
    invalid: 'Choose a different event to transfer to.',
    failed: 'The transfer was refused and nothing was changed. Please try again.',
};

const UNCONFIRMED_MESSAGE =
    'Unable to confirm the transfer because the connection dropped. Check where the child is on the roster before trying again. Trying again is safe.';

function errorField(error: unknown, field: 'code' | 'message'): string {
    if (typeof error !== 'object' || error === null || !(field in error)) return '';
    const value = (error as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : '';
}

/**
 * True when the error is an answer from the database or PostgREST — a SQLSTATE
 * or a `PGRST…` code — rather than a lost response. Only an answer proves the
 * transaction did not commit. SQLSTATE classes are two digits or one of the
 * few lettered ones (P0 PL/pgSQL, XX internal, F0 config, HV FDW), which also
 * keeps a transport code such as `EPIPE` from passing for one.
 */
function isConfirmedRefusal(code: string): boolean {
    return /^(?:[0-9]{2}|P0|XX|F0|HV)[0-9A-Z]{3}$/.test(code) || code.startsWith('PGRST');
}

type AttendanceRow = NonNullable<Awaited<ReturnType<typeof dbAdapter.getAttendance>>>;

/** Hops followed along a transfer chain before giving up; a day never has this many. */
const MAX_TRANSFER_HOPS = 20;

/**
 * Follow `transferred_to_attendance_id` from `row` to the newest row in the
 * chain: the child's open row if they are still on site, or the row they were
 * picked up from. Returns null when a link cannot be read.
 */
async function latestInTransferChain(row: AttendanceRow): Promise<AttendanceRow | null> {
    let current = row;
    for (let hop = 0; hop < MAX_TRANSFER_HOPS && current.transferred_to_attendance_id; hop++) {
        const next = await dbAdapter.getAttendance(current.transferred_to_attendance_id);
        if (!next) return null;
        current = next;
    }
    return current.transferred_to_attendance_id ? null : current;
}

/**
 * After a lost response, read the attendance back to find out what actually
 * happened, and say only what that read establishes.
 *
 * Resolves with the destination row only when the transfer committed **and
 * the child is still there** — the same condition the RPC's retry path uses.
 * Everything else throws, carrying the child's current event when the read
 * establishes one:
 *
 * - committed, then the child was picked up, or moved on to another event,
 *   before this read: `stale`, naming where they are now (never "still on
 *   site" at the destination);
 * - not committed, or someone else moved the child: `unknown`, with the
 *   child's current location.
 */
async function reconcileLostTransfer(attendanceId: string, toEventId: string): Promise<string> {
    let source: AttendanceRow | null;
    let destination: AttendanceRow | null = null;
    let latest: AttendanceRow | null = null;
    try {
        source = await dbAdapter.getAttendance(attendanceId);
        if (source?.transferred_to_attendance_id) {
            destination = await dbAdapter.getAttendance(source.transferred_to_attendance_id);
            latest = destination ? await latestInTransferChain(destination) : null;
        }
    } catch {
        throw new AttendanceTransferError('unknown', UNCONFIRMED_MESSAGE);
    }

    if (destination && !latest) {
        // The chain could not be read to its end.
        throw new AttendanceTransferError('unknown', UNCONFIRMED_MESSAGE);
    }

    if (destination && latest && destination.event_id === toEventId) {
        if (latest.attendance_id === destination.attendance_id && !latest.check_out_at) {
            // It went through and the child is still there; only the answer was lost.
            return destination.attendance_id;
        }
        if (!latest.check_out_at) {
            throw new AttendanceTransferError(
                'stale',
                'The transfer went through, but the child has since been moved to another event.',
                latest.event_id,
            );
        }
        throw new AttendanceTransferError(
            'stale',
            'The transfer went through, but the child has since been checked out.',
        );
    }

    if (destination && latest) {
        throw new AttendanceTransferError(
            'unknown',
            latest.check_out_at
                ? 'Unable to confirm this transfer. The child was moved to another event and has since been checked out.'
                : 'Unable to confirm this transfer, and the child has been moved to another event since.',
            latest.check_out_at ? null : latest.event_id,
        );
    }
    if (source && !source.check_out_at) {
        throw new AttendanceTransferError(
            'unknown',
            'Unable to confirm the transfer because the connection dropped. A fresh check shows the child has not moved. Trying again is safe.',
            source.event_id,
        );
    }
    if (source) {
        throw new AttendanceTransferError(
            'unknown',
            'Unable to confirm the transfer, and the child has been checked out since.',
        );
    }
    throw new AttendanceTransferError('unknown', UNCONFIRMED_MESSAGE);
}

/**
 * Move a checked-in child from one event to another without them leaving the
 * building (#561).
 *
 * One atomic database call (`transfer_attendance`): the source row is closed as
 * a transfer — not a pickup — and an ordinary open row is created at the
 * destination, so the child stays on site and pickup at the destination still
 * goes through `CheckoutDialog`. The database decides who may do this and
 * which destinations are valid; nothing here is an authorization input.
 * Repeating a transfer that already happened resolves to the same row, so a
 * retry is always safe.
 *
 * A refusal from the database is reported as such. A lost response is not
 * treated as a refusal: the transfer may have committed, so the outcome is
 * reconciled against the stored attendance before anything is said.
 *
 * Ministry enrollment is untouched: this moves event attendance only.
 */
export async function transferCheckIn(
    attendanceId: string,
    toEventId: string,
): Promise<string> {
    try {
        return await dbAdapter.transferAttendance(attendanceId, toEventId);
    } catch (error) {
        const code = errorField(error, 'code');
        if (!isConfirmedRefusal(code)) {
            return reconcileLostTransfer(attendanceId, toEventId);
        }
        const reason = TRANSFER_REASON_BY_SQLSTATE[code] ?? 'failed';
        // For a stale row or a bad destination the database's own message is
        // written for staff ("this child has already been moved to another
        // event"). A permission error can come from PostgREST as well as the
        // function, so it, like any other refusal, gets a fixed message
        // rather than a raw driver error.
        const serverMessage =
            reason === 'stale' || reason === 'invalid' ? errorField(error, 'message') : '';
        const message = serverMessage
            ? serverMessage.charAt(0).toUpperCase() + serverMessage.slice(1) + '.'
            : TRANSFER_FALLBACK_MESSAGE[reason as Exclude<TransferFailureReason, 'unknown'>];
        throw new AttendanceTransferError(reason, message);
    }
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

/**
 * Read incidents through the server route that scopes them to the session.
 *
 * These used to call `listIncidents()` and filter in the browser, which handed
 * every leader every child's name and incident description whatever the UI
 * rendered (#428). Incidents are sensitive and RLS does not cover the table,
 * so the scope has to be applied somewhere the caller cannot reach.
 */
async function fetchScopedIncidents(
    options: { unacknowledged?: boolean; date?: string } = {},
): Promise<Incident[]> {
    const params = new URLSearchParams();
    if (options.unacknowledged) params.set('unacknowledged', 'true');
    if (options.date) params.set('date', options.date);
    const query = params.size > 0 ? `?${params.toString()}` : '';
    const response = await fetch(`/api/incidents${query}`);

    if (!response.ok) {
        throw new Error(`Failed to load incidents (${response.status})`);
    }

    const body = (await response.json()) as { incidents?: Incident[] };
    return body.incidents ?? [];
}

/**
 * Unacknowledged incidents the signed-in user may see.
 *
 * Feeds the admin dashboard's pending card. An admin sees every pending
 * incident; anyone else sees only their own.
 */
export async function getUnacknowledgedIncidents(): Promise<Incident[]> {
    return fetchScopedIncidents({ unacknowledged: true });
}

/**
 * Incidents on a given day that the signed-in user may see.
 *
 * The door/roster view, and scoped differently from the other two on purpose:
 * **all staff see the day's incidents, not only their own.** Check-in renders
 * an incident marker per child, and a child hurt in an earlier service has to
 * stay flagged to whoever hands them back at pickup, whichever leader logged
 * it. Guardians can open check-in too, and they now see only their own.
 *
 * Confirmed as a deliberate visibility decision by @tzlukoma on #430.
 */
export async function getIncidentsForDate(dateISO: string): Promise<Incident[]> {
    return fetchScopedIncidents({ date: dateISO });
}

/**
 * Incidents visible to the signed-in user.
 *
 * An admin sees every incident, anyone else only the incidents they logged —
 * the same visible set the client-side filter produced, now resolved by
 * `/api/incidents` from the validated session and applied as a database
 * predicate.
 *
 * `user` is retained for call-site compatibility and is deliberately **not**
 * used to decide scope: an argument supplied by client code cannot be an
 * authorization input.
 */
export async function getIncidentsForUser(_user?: unknown): Promise<Incident[]> {
    return fetchScopedIncidents();
}

/**
 * Acknowledge an incident (admin action).
 */
export async function acknowledgeIncident(incidentId: string): Promise<number | string> {
    const updatedIncident = await dbAdapter.updateIncident(incidentId, {
        admin_acknowledged_at: new Date().toISOString(),
    });
    return updatedIncident.incident_id;
}

/**
 * Log a new incident.
 */
export async function logIncident(data: {
    child_id: string;
    child_name: string;
    description: string;
    severity: IncidentSeverity;
    leader_id: string;
    event_id?: string;
}): Promise<string> {
    const incident: Omit<Incident, 'incident_id'> = {
        child_id: data.child_id,
        child_name: data.child_name,
        event_id: data.event_id,
        description: data.description,
        severity: data.severity,
        leader_id: data.leader_id,
        timestamp: new Date().toISOString(),
        admin_acknowledged_at: null,
    };

    const created = await dbAdapter.createIncident(incident);
    return created.incident_id;
}

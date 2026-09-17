/**
 * DAL — Attendance domain
 *
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { Attendance, Child, Incident, IncidentSeverity } from '../types';
import { getTodayIsoDate } from './utils';
import { v4 as uuidv4 } from 'uuid';

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
    const checkedIn = attendance.filter(a => !a.check_out_at);
    return checkedIn.length;
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
    const today = getTodayIsoDate();

    const activeCheckIns = await dbAdapter.listAttendance({
        childId: childId,
        date: today,
    });

    const activeCheckIn = activeCheckIns.find(rec => !rec.check_out_at);
    if (activeCheckIn) {
        throw new Error('This child is already checked in to another event.');
    }

    const attendanceRecord = await dbAdapter.createAttendance({
        event_id: eventId,
        child_id: childId,
        date: today,
        timeslot_id: timeslotId,
        check_in_at: new Date().toISOString(),
        checked_in_by: userId,
    });

    return attendanceRecord.attendance_id;
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

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

/**
 * Read incidents through the server route that scopes them to the session.
 *
 * Incidents are sensitive and RLS does not constrain them, so the browser must
 * not query the table directly.
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
 * Get unacknowledged incidents the signed-in user is allowed to see.
 *
 * Scoped server-side by `/api/incidents`; see the note on
 * `getIncidentsForUser`.
 */
export async function getUnacknowledgedIncidents(): Promise<Incident[]> {
    return fetchScopedIncidents({ unacknowledged: true });
}

/**
 * Incidents on a given day that the signed-in user is allowed to see.
 *
 * Scoped server-side by `/api/incidents`; see the note on `getIncidentsForUser`.
 *
 * This is the door/roster view, and it stays visible to all **staff**, not just
 * the leader who logged the incident: check-in renders a marker per child, and a
 * child hurt earlier must still be flagged to whoever hands them back at pickup.
 * Guardians reach check-in too, and they no longer see other people's incidents.
 */
export async function getIncidentsForDate(dateISO: string): Promise<Incident[]> {
    return fetchScopedIncidents({ date: dateISO });
}

/**
 * Incidents visible to the signed-in user.
 *
 * The scope is resolved by `/api/incidents` from the session: an admin sees
 * every incident, anyone else only the incidents they logged. It used to read
 * the whole `incidents` table into the browser and filter in JavaScript, which
 * handed every leader every child's name and incident description whatever the
 * UI chose to render (#428).
 *
 * `user` is retained for call-site compatibility and is deliberately **not**
 * used to decide scope — an argument supplied by client code cannot be an
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

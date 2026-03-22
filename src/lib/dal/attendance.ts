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
 * Get all unacknowledged incidents.
 */
export async function getUnacknowledgedIncidents(): Promise<Incident[]> {
    const incidents = await dbAdapter.listIncidents();
    return incidents.filter(incident => !incident.admin_acknowledged_at);
}

/**
 * Get incidents for a specific date.
 */
export async function getIncidentsForDate(dateISO: string): Promise<Incident[]> {
    const incidents = await dbAdapter.listIncidents();
    return incidents.filter(i => i.timestamp.startsWith(dateISO));
}

/**
 * Get incidents visible to a given user.
 *
 * Ministry leaders only see incidents they logged; admins see all.
 */
export async function getIncidentsForUser(user: unknown): Promise<Incident[]> {
    function isMinistryLeaderUser(u: unknown): boolean {
        if (!u || typeof u !== 'object') return false;
        const rec = u as Record<string, unknown>;
        const meta = rec?.metadata as Record<string, unknown> | undefined;
        return (meta?.role as unknown) === 'MINISTRY_LEADER';
    }

    function extractUserId(u: unknown): string | undefined {
        const rec = u as Record<string, unknown> | undefined;
        return (rec?.uid as string | undefined) || (rec?.id as string | undefined) || (rec?.user_id as string | undefined);
    }

    const allIncidents = await dbAdapter.listIncidents();

    if (isMinistryLeaderUser(user)) {
        const leaderId = extractUserId(user);
        if (!leaderId) return [];
        return allIncidents.filter(incident => incident.leader_id === leaderId);
    }

    return allIncidents.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
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

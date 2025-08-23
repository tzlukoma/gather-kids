

import { db } from './db';
import type { Attendance, Child, Guardian, Household, Incident, IncidentSeverity, Ministry, MinistryEnrollment, Registration, User } from './types';
import { differenceInYears, isAfter, isBefore, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Utility Functions
export const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

export function ageOn(dateISO: string, dobISO?: string): number | null {
    if (!dobISO) return null;
    try {
        const date = parseISO(dateISO);
        const dob = parseISO(dobISO);
        return differenceInYears(date, dob);
    } catch (e) {
        return null;
    }
}

export async function isEligibleForChoir(ministryId: string, childId: string): Promise<boolean> {
    const ministry = await db.ministries.get(ministryId);
    const child = await db.children.get(childId);
    if (!ministry || !child || !child.dob) return false;

    const childAge = ageOn(getTodayIsoDate(), child.dob);
    if (childAge === null) return false;

    const minAge = ministry.min_age ?? 0;
    const maxAge = ministry.max_age ?? 99;

    return childAge >= minAge && childAge <= maxAge;
}

export async function isWithinWindow(ministryId: string, todayISO: string): Promise<boolean> {
    const ministry = await db.ministries.get(ministryId);
    if (!ministry) return false;
    const today = parseISO(todayISO);
    
    const isOpen = ministry.open_at ? isAfter(today, parseISO(ministry.open_at)) : true;
    const isClosed = ministry.close_at ? isBefore(today, parseISO(ministry.close_at)) : true;
    
    return isOpen && isClosed;
}


// --- Data Access Layer ---

// Query Functions
export async function querySundaySchoolRoster(dateISO: string, timeslotId?: string) {
    let query = db.attendance.where({ date: dateISO, event_id: 'evt_sunday_school' });
    if (timeslotId) {
        query = query.and(a => a.timeslot_id === timeslotId);
    }
    const attendanceRecords = await query.toArray();
    const childIds = attendanceRecords.map(a => a.child_id);
    const children = await db.children.where('child_id').anyOf(childIds).toArray();
    // In a real app with data profiles, you would filter fields here.
    return children;
}

export async function queryRostersForMinistry(ministryId: string, cycleId: string) {
    const enrollments = await db.ministry_enrollments.where({ ministry_id: ministryId, cycle_id: cycleId }).toArray();
    const childIds = enrollments.map(e => e.child_id);

    const children = await db.children.where('child_id').anyOf(childIds).toArray();
    const childProfiles = await db.child_year_profiles.where('[child_id+cycle_id]').anyOf(childIds.map(cid => [cid, cycleId])).toArray();
    
    const profileMap = new Map(childProfiles.map(p => [p.child_id, p]));

    return children.map(child => ({
        ...child,
        profile: profileMap.get(child.child_id)
    }));
}

export async function queryDashboardMetrics(cycleId: string) {
    const totalRegistrations = await db.registrations.where({ cycle_id: cycleId }).count();
    const activeRegistrations = await db.registrations.where({ cycle_id: cycleId, status: 'active' }).toArray();
    
    const completionPct = totalRegistrations > 0 ? Math.round((activeRegistrations.length / totalRegistrations) * 100) : 0;
    
    let missingConsentsCount = 0;
    for (const reg of activeRegistrations) {
        const hasLiability = reg.consents.some(c => c.type === 'liability' && c.accepted_at);
        const hasPhoto = reg.consents.some(c => c.type === 'photoRelease' && c.accepted_at);
        if (!hasLiability || !hasPhoto) {
            missingConsentsCount++;
        }
    }

    const choirMinistry = await db.ministries.get('min_choir_kids');
    const choirEnrollments = await db.ministry_enrollments.where({ ministry_id: 'min_choir_kids', cycle_id: cycleId }).toArray();
    const choirChildIds = choirEnrollments.map(e => e.child_id);
    const choirChildren = await db.children.where('child_id').anyOf(choirChildIds).toArray();

    const choirEligibilityWarnings: { child_id: string; child_name: string; ministry_id: string; reason: string }[] = [];
    for (const child of choirChildren) {
        if (!child.dob) continue;
        const age = ageOn(getTodayIsoDate(), child.dob);
        if (age === null) continue;
        
        if (age < (choirMinistry?.min_age ?? 7) || age > (choirMinistry?.max_age ?? 12)) {
            choirEligibilityWarnings.push({
                child_id: child.child_id,
                child_name: `${child.first_name} ${child.last_name}`,
                ministry_id: 'min_choir_kids',
                reason: `Age ${age} is outside range (${choirMinistry?.min_age}-${choirMinistry?.max_age})`
            });
        }
    }

    return {
        completionPct,
        missingConsentsCount,
        choirEligibilityWarnings,
        totalCount: totalRegistrations,
        completedCount: activeRegistrations.length,
    };
}


// Mutation Functions
export async function recordCheckIn(childId: string, eventId: string, timeslotId?: string, userId?: string): Promise<string> {
    const today = getTodayIsoDate();
    
    // Find if the child has any active check-in record for today.
    const activeCheckIn = await db.attendance
        .where({ child_id: childId, date: today })
        .filter(rec => !rec.check_out_at)
        .first();

    if (activeCheckIn) {
        throw new Error("This child is already checked in to another event.");
    }
    
    // No active record, create a new one.
    const attendanceRecord: Attendance = {
        attendance_id: uuidv4(),
        event_id: eventId,
        child_id: childId,
        date: today,
        timeslot_id: timeslotId,
        check_in_at: new Date().toISOString(),
        checked_in_by: userId,
    };
    return db.attendance.add(attendanceRecord);
}

export async function recordCheckOut(attendanceId: string, verifier: { method: "PIN" | "other", value: string }, userId?: string): Promise<string> {
    const attendanceRecord = await db.attendance.get(attendanceId);
    if (!attendanceRecord) throw new Error("Attendance record not found");

    const updatedRecord: Attendance = {
        ...attendanceRecord,
        check_out_at: new Date().toISOString(),
        checked_out_by: userId,
        pickup_method: verifier.method,
        picked_up_by: verifier.method === 'other' ? verifier.value : undefined,
    };
    // Using put to ensure live queries are triggered correctly.
    return db.attendance.put(updatedRecord);
}

export function acknowledgeIncident(incidentId: string): Promise<number> {
    return db.incidents.update(incidentId, { admin_acknowledged_at: new Date().toISOString() });
}

export async function logIncident(data: {child_id: string, child_name: string, description: string, severity: IncidentSeverity, leader_id: string, event_id?: string}) {
    const incident: Incident = {
        incident_id: uuidv4(),
        ...data,
        timestamp: new Date().toISOString(),
        admin_acknowledged_at: null,
    }
    return db.incidents.add(incident);
}

// Registration Logic
export async function registerHousehold(data: any) {
    const householdId = uuidv4();
    const now = new Date().toISOString();

    const household: Household = {
        household_id: householdId,
        name: data.household.name || `${data.guardians[0].last_name} Household`,
        address_line1: data.household.address_line1,
        created_at: now,
        updated_at: now,
    };

    const guardians: Guardian[] = data.guardians.map((g: any) => ({
        guardian_id: uuidv4(),
        household_id: householdId,
        ...g,
        created_at: now,
        updated_at: now,
    }));

    const emergencyContact = {
        contact_id: uuidv4(),
        household_id: householdId,
        ...data.emergencyContact
    };
    
    const children: Child[] = data.children.map((c: any) => ({
        child_id: uuidv4(),
        household_id: householdId,
        is_active: true,
        ...c,
        created_at: now,
        updated_at: now,
    }));

    // Transaction
    await db.transaction('rw', db.households, db.guardians, db.emergency_contacts, db.children, db.registrations, db.ministry_enrollments, db.ministries, async () => {
        await db.households.add(household);
        await db.guardians.bulkAdd(guardians);
        await db.emergency_contacts.add(emergencyContact);
        await db.children.bulkAdd(children);

        for (const [index, child] of children.entries()) {
            const childData = data.children[index];

            const registration: Registration = {
                registration_id: uuidv4(),
                child_id: child.child_id,
                cycle_id: "2025", // Current cycle
                status: 'active',
                pre_registered_sunday_school: true,
                consents: [
                    { type: 'liability', accepted_at: data.consents.liability ? now : null, signer_id: guardians[0].guardian_id, signer_name: `${guardians[0].first_name} ${guardians[0].last_name}` },
                    { type: 'photoRelease', accepted_at: data.consents.photoRelease ? now : null, signer_id: guardians[0].guardian_id, signer_name: `${guardians[0].first_name} ${guardians[0].last_name}` }
                ],
                submitted_at: now,
                submitted_via: 'web',
            };
            await db.registrations.add(registration);

            // Auto-enroll in Sunday School
            const sundaySchoolEnrollment: MinistryEnrollment = {
                enrollment_id: uuidv4(),
                child_id: child.child_id,
                cycle_id: "2025",
                ministry_id: "min_sunday_school",
                status: 'enrolled',
            };
            await db.ministry_enrollments.add(sundaySchoolEnrollment);

            const ministrySelections = childData.ministrySelections || {};
            const isJoyBell = ministrySelections['choir-joy-bells'];
            const isKeita = ministrySelections['choir-keita'];
            const isTeenChoir = ministrySelections['choir-teen'];

            // Handle Choir selections
            if (isJoyBell) {
                 if (await isEligibleForChoir('min_choir_kids', child.child_id)) {
                    const choirEnrollment: MinistryEnrollment = {
                        enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: "2025",
                        ministry_id: "choir-joy-bells", status: 'enrolled',
                    };
                    await db.ministry_enrollments.add(choirEnrollment);
                }
            }
             if (isKeita) {
                 if (await isEligibleForChoir('min_choir_kids', child.child_id)) {
                    const choirEnrollment: MinistryEnrollment = {
                        enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: "2025",
                        ministry_id: "choir-keita", status: 'enrolled',
                    };
                    await db.ministry_enrollments.add(choirEnrollment);
                }
            }
             if (isTeenChoir) {
                 if (await isEligibleForChoir('min_choir_kids', child.child_id)) {
                    const choirEnrollment: MinistryEnrollment = {
                        enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: "2025",
                        ministry_id: "choir-teen", status: 'enrolled',
                    };
                    await db.ministry_enrollments.add(choirEnrollment);
                }
            }


            // Handle Bible Bee selection
            if (ministrySelections['bible-bee']) {
                 if (await isWithinWindow('min_bible_bee', now)) {
                     const bibleBeeEnrollment: MinistryEnrollment = {
                        enrollment_id: uuidv4(),
                        child_id: child.child_id,
                        cycle_id: "2025",
                        ministry_id: "min_bible_bee",
                        status: 'interest_only',
                    };
                    await db.ministry_enrollments.add(bibleBeeEnrollment);
                 }
            }
        }
    });
}

// CSV Export Functions
function convertToCSV(data: any[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(',')
      )
    ];
    return csvRows.join('\r\n');
}


export async function exportEmergencySnapshotCSV(dateISO: string): Promise<Blob> {
    const roster = await querySundaySchoolRoster(dateISO);
    const householdIds = roster.map(r => r.household_id);
    
    const guardians = await db.guardians.where('household_id').anyOf(householdIds).and(g => g.is_primary).toArray();
    const contacts = await db.emergency_contacts.where('household_id').anyOf(householdIds).toArray();

    const guardianMap = new Map(guardians.map(g => [g.household_id, g]));
    const contactMap = new Map(contacts.map(c => [c.household_id, c]));

    const exportData = roster.map(child => ({
        child_name: `${child.first_name} ${child.last_name}`,
        dob: child.dob,
        grade: child.grade,
        allergies: child.allergies,
        medical_notes: child.medical_notes,
        primary_guardian: guardianMap.get(child.household_id)?.first_name + ' ' + guardianMap.get(child.household_id)?.last_name,
        guardian_phone: guardianMap.get(child.household_id)?.mobile_phone,
        emergency_contact: contactMap.get(child.household_id)?.first_name + ' ' + contactMap.get(child.household_id)?.last_name,
        emergency_phone: contactMap.get(child.household_id)?.mobile_phone,
    }));
    
    const csv = convertToCSV(exportData);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

export async function exportAttendanceRollupCSV(startISO: string, endISO: string): Promise<Blob> {
    const startDate = startISO.split('T')[0];
    const endDate = endISO.split('T')[0];

    const attendanceRecords = await db.attendance
        .where('date').between(startDate, endDate, true, true)
        .toArray();

    const childIds = [...new Set(attendanceRecords.map(a => a.child_id))];
    const children = await db.children.where('child_id').anyOf(childIds).toArray();
    const childMap = new Map(children.map(c => [c.child_id, c]));

    const exportData = attendanceRecords.map(att => {
        const child = childMap.get(att.child_id);
        return {
            date: att.date,
            child_name: `${child?.first_name} ${child?.last_name}`,
            grade: child?.grade,
            check_in: att.check_in_at ? new Date(att.check_in_at).toLocaleTimeString() : '',
            check_out: att.check_out_at ? new Date(att.check_out_at).toLocaleTimeString() : '',
            event: att.event_id,
        }
    });

    const csv = convertToCSV(exportData);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

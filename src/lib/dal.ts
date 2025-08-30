













import { db } from './db';
import { getApplicableGradeRule } from './bibleBee';
import { AuthRole } from './auth-types';
import type { Attendance, Child, Guardian, Household, Incident, IncidentSeverity, Ministry, MinistryEnrollment, Registration, User, EmergencyContact, LeaderAssignment, LeaderProfile, MinistryLeaderMembership, MinistryAccount, BrandingSettings  } from './types';
import { differenceInYears, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Utility Functions
export const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

export function ageOn(dateISO: string, dobISO?: string): number | null {
    if (!dobISO) return null;
    const date = parseISO(dateISO);
    const dob = parseISO(dobISO);
    if (!isValid(date) || !isValid(dob)) return null;
    const years = differenceInYears(date, dob);
    // differenceInYears can return NaN in edge cases; guard against that
    if (Number.isNaN(years)) return null;
    return years;
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

export async function queryHouseholdList(leaderMinistryIds?: string[], ministryId?: string) {
    let households = await db.households.orderBy('created_at').reverse().toArray();
    let householdIds = households.map(h => h.household_id);

    let ministryFilterIds = leaderMinistryIds;

    // If a specific ministryId filter is applied, it takes precedence
    if (ministryId) {
        ministryFilterIds = [ministryId];
    }

    if (ministryFilterIds && ministryFilterIds.length > 0) {
        const enrollments = await db.ministry_enrollments
            .where('ministry_id').anyOf(ministryFilterIds)
            .and(e => e.cycle_id === '2025')
            .toArray();
        const relevantChildIds = [...new Set(enrollments.map(e => e.child_id))];
        const relevantChildren = await db.children.where('child_id').anyOf(relevantChildIds).toArray();
        const relevantHouseholdIds = [...new Set(relevantChildren.map(c => c.household_id))];

        households = households.filter(h => relevantHouseholdIds.includes(h.household_id));
        householdIds = households.map(h => h.household_id);
    }

    const allChildren = await db.children.where('household_id').anyOf(householdIds).toArray();

    const childrenByHousehold = new Map<string, (Child & { age: number | null })[]>();
    for (const child of allChildren) {
        if (!childrenByHousehold.has(child.household_id)) {
            childrenByHousehold.set(child.household_id, []);
        }
        childrenByHousehold.get(child.household_id)!.push({
            ...child,
            age: child.dob ? ageOn(new Date().toISOString(), child.dob) : null
        });
    }

    return households.map(h => ({
        ...h,
        children: childrenByHousehold.get(h.household_id) || []
    }));
}

type EnrichedEnrollment = MinistryEnrollment & { ministryName?: string; customQuestions?: any[] };
export interface HouseholdProfileData {
    household: Household | null;
    guardians: Guardian[];
    emergencyContact: EmergencyContact | null;
    children: (Child & { age: number | null, enrollmentsByCycle: Record<string, EnrichedEnrollment[]> })[];
}

export async function getHouseholdProfile(householdId: string): Promise<HouseholdProfileData> {
    const household = await db.households.get(householdId) ?? null;
    const guardians = await db.guardians.where({ household_id: householdId }).toArray();
    const emergencyContact = await db.emergency_contacts.where({ household_id: householdId }).first() ?? null;
    const children = await db.children.where({ household_id: householdId }).toArray(); // Fetch all, including inactive

    const childIds = children.map(c => c.child_id);
    const allEnrollments = await db.ministry_enrollments.where('child_id').anyOf(childIds).toArray();
    const allMinistries = await db.ministries.toArray();
    const ministryMap = new Map(allMinistries.map(m => [m.ministry_id, m]));

    const childrenWithEnrollments = children.map(child => {
        const enrollmentsByCycle = allEnrollments
            .filter(e => e.child_id === child.child_id)
            .reduce((acc, e) => {
                const ministry = ministryMap.get(e.ministry_id);
                if (!ministry) return acc;

                const enrichedEnrollment: EnrichedEnrollment = {
                    ...e,
                    ministryName: ministry.name,
                    customQuestions: ministry.custom_questions
                };

                if (!acc[e.cycle_id]) {
                    acc[e.cycle_id] = [];
                }
                acc[e.cycle_id].push(enrichedEnrollment);
                return acc;
            }, {} as Record<string, EnrichedEnrollment[]>);

        return {
            ...child,
            age: child.dob ? ageOn(new Date().toISOString(), child.dob) : null,
            enrollmentsByCycle: enrollmentsByCycle,
        };
    });

    return {
        household,
        guardians,
        emergencyContact,
        children: childrenWithEnrollments,
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

export async function logIncident(data: { child_id: string, child_name: string, description: string, severity: IncidentSeverity, leader_id: string, event_id?: string }) {
    const incident: Incident = {
        incident_id: uuidv4(),
        ...data,
        timestamp: new Date().toISOString(),
        admin_acknowledged_at: null,
    }
    return db.incidents.add(incident);
}

const fetchFullHouseholdData = async (householdId: string, cycleId: string) => {
    const household = await db.households.get(householdId);
    const guardians = await db.guardians.where({ household_id: householdId }).toArray();
    const emergencyContact = await db.emergency_contacts.where({ household_id: householdId }).first();
    const children = await db.children.where({ household_id: householdId }).and(c => c.is_active).toArray();
    const childIds = children.map(c => c.child_id);
    const enrollments = await db.ministry_enrollments.where('child_id').anyOf(childIds).and(e => e.cycle_id === cycleId).toArray();
    const allMinistries = await db.ministries.toArray();
    const ministryMap = new Map(allMinistries.map(m => [m.ministry_id, m]));

    const childrenWithSelections = children.map(child => {
        const childEnrollments = enrollments.filter(e => e.child_id === child.child_id);
        const ministrySelections: { [key: string]: boolean | undefined } = {};
        const interestSelections: { [key: string]: boolean | undefined } = {};
        let customData: any = {};

        childEnrollments.forEach(enrollment => {
            const ministry = ministryMap.get(enrollment.ministry_id);
            if (!ministry) return;

            if (enrollment.status === 'enrolled') {
                ministrySelections[ministry.code] = true;
                if (enrollment.custom_fields) {
                    customData = { ...customData, ...enrollment.custom_fields };
                }
            } else if (enrollment.status === 'expressed_interest') {
                interestSelections[ministry.code] = true;
            }
        });

        return { ...child, ministrySelections, interestSelections, customData };
    });

    return {
        household,
        guardians,
        emergencyContact,
        children: childrenWithSelections,
        consents: { liability: true, photoRelease: true } // Assume consents were given
    };
};


// Find existing household and registration data by email
export async function findHouseholdByEmail(email: string, currentCycleId: string) {
    const guardian = await db.guardians.where('email').equalsIgnoreCase(email).first();
    if (!guardian) return null;

    const householdId = guardian.household_id;
    const householdChildren = await db.children.where({ household_id: householdId }).toArray();
    const householdChildIds = householdChildren.map(c => c.child_id);

    if (householdChildIds.length === 0) return null; // No children in household, so no registration

    // 1. Check for an existing registration in the CURRENT cycle.
    const currentEnrollmentExists = await db.ministry_enrollments
        .where('child_id').anyOf(householdChildIds)
        .and(e => e.cycle_id === currentCycleId)
        .first();

    if (currentEnrollmentExists) {
        return {
            isCurrentYear: true,
            isPrefill: false,
            data: await fetchFullHouseholdData(householdId, currentCycleId)
        };
    }

    // 2. If no current registration, check for a registration in the PRIOR cycle to pre-fill from.
    const priorCycleId = String(parseInt(currentCycleId, 10) - 1);
    const priorRegExists = await db.ministry_enrollments
        .where('child_id').anyOf(householdChildIds)
        .and(e => e.cycle_id === priorCycleId)
        .first();

    if (priorRegExists) {
        const priorData = await fetchFullHouseholdData(householdId, priorCycleId);
        return {
            isCurrentYear: false,
            isPrefill: true,
            data: priorData
        };
    }

    // 3. No registration found in current or prior year.
    return null;
}


// Registration Logic
export async function registerHousehold(data: any, cycle_id: string, isPrefill: boolean) {
    const householdId = data.household.household_id || uuidv4();
    const isUpdate = !!data.household.household_id;
    const now = new Date().toISOString();

    await (db as any).transaction('rw', db.households, db.guardians, db.emergency_contacts, db.children, db.registrations, db.ministry_enrollments, db.ministries, async () => {

        // This block handles overwriting an existing registration for the *current* cycle.
        // It should NOT run for a pre-fill from a previous year.
        if (isUpdate && !isPrefill) {
            const childIds = (await db.children.where({ household_id: householdId }).toArray()).map(c => c.child_id);

            // Delete previous registrations and enrollments for this cycle
            await db.registrations.where('[child_id+cycle_id]').anyOf(childIds.map(cid => [cid, cycle_id])).delete();
            await db.ministry_enrollments.where('[child_id+cycle_id]').anyOf(childIds.map(cid => [cid, cycle_id])).delete();
        }

        // Always clear and re-add guardians/contacts on any update/prefill submission
        if (isUpdate) {
            await db.guardians.where({ household_id: householdId }).delete();
            await db.emergency_contacts.where({ household_id: householdId }).delete();
        }

        const household: Household = {
            household_id: householdId,
            name: data.household.name || `${data.guardians[0].last_name} Household`,
            address_line1: data.household.address_line1,
            created_at: isUpdate ? (await db.households.get(householdId))!.created_at : now,
            updated_at: now,
        };
        await db.households.put(household);

        const guardians: Guardian[] = data.guardians.map((g: any) => ({
            guardian_id: uuidv4(),
            household_id: householdId,
            ...g,
            created_at: now,
            updated_at: now,
        }));
        await db.guardians.bulkAdd(guardians);

        const emergencyContact: EmergencyContact = {
            contact_id: uuidv4(),
            household_id: householdId,
            ...data.emergencyContact
        };
        await db.emergency_contacts.add(emergencyContact);

        const existingChildren = isUpdate ? await db.children.where({ household_id: householdId }).toArray() : [];
        const incomingChildIds = data.children.map((c: any) => c.child_id).filter(Boolean);

        const childrenToUpsert: Child[] = data.children.map((c: any) => {
            const { ministrySelections, interestSelections, customData, ...childCore } = c;
            const existingChild = childCore.child_id ? existingChildren.find(ec => ec.child_id === childCore.child_id) : undefined;
            return {
                ...childCore,
                child_id: childCore.child_id || uuidv4(),
                household_id: householdId,
                is_active: true, // All children submitted are considered active for this registration
                created_at: existingChild?.created_at || now,
                updated_at: now,
            }
        });
        await db.children.bulkPut(childrenToUpsert);

        // Deactivate children who were in the household but removed from the form on an update
        if (isUpdate) {
            const childrenToRemove = existingChildren
                .filter(c => c.is_active) // Only consider currently active children
                .map(c => c.child_id)
                .filter(id => !incomingChildIds.includes(id));
            if (childrenToRemove.length > 0) {
                await db.children.where('child_id').anyOf(childrenToRemove).modify({ is_active: false });
            }
        }

        // Re-create registrations and enrollments for the current cycle
        for (const [index, child] of childrenToUpsert.entries()) {
            const childData = data.children[index];

            const registration: Registration = {
                registration_id: uuidv4(),
                child_id: child.child_id,
                cycle_id: cycle_id,
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
                cycle_id: cycle_id,
                ministry_id: "min_sunday_school",
                status: 'enrolled',
            };
            await db.ministry_enrollments.add(sundaySchoolEnrollment);

            const allSelections = { ...(childData.ministrySelections || {}), ...(childData.interestSelections || {}) };
            const allMinistries = await db.ministries.toArray();
            const ministryMap = new Map(allMinistries.map(m => [m.code, m]));

            for (const ministryCode in allSelections) {
                if (allSelections[ministryCode] && ministryCode !== 'min_sunday_school') {
                    const ministry = ministryMap.get(ministryCode);
                    if (ministry) {
                        const age = child.dob ? ageOn(now, child.dob) : null;
                        const minAge = ministry.min_age ?? -1;
                        const maxAge = ministry.max_age ?? 999;
                        if (age !== null && (age < minAge || age > maxAge)) {
                            console.warn(`Skipping enrollment for ${child.first_name} in ${ministry.name} due to age restrictions.`);
                            continue;
                        }

                        const custom_fields: { [key: string]: any } = {};
                        if (childData.customData && ministry.custom_questions) {
                            for (const q of ministry.custom_questions) {
                                if (childData.customData[q.id] !== undefined) {
                                    custom_fields[q.id] = childData.customData[q.id];
                                }
                            }
                        }

                        const enrollment: MinistryEnrollment = {
                            enrollment_id: uuidv4(),
                            child_id: child.child_id,
                            cycle_id: cycle_id,
                            ministry_id: ministry.ministry_id,
                            status: ministry.enrollment_type,
                            custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                        };
                        await db.ministry_enrollments.add(enrollment);
                    }
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

export async function exportRosterCSV(children: any[]): Promise<Blob> {
    const exportData = children.map(child => {
        const primaryGuardian = child.guardians?.find((g: Guardian) => g.is_primary) || child.guardians?.[0];

        return {
            child_name: `${child.first_name} ${child.last_name}`,
            grade: child.grade,
            status: child.activeAttendance ? 'Checked In' : 'Checked Out',
            check_in_time: child.activeAttendance?.check_in_at ? new Date(child.activeAttendance.check_in_at).toLocaleTimeString() : 'N/A',
            event: child.activeAttendance?.event_id || 'N/A',
            allergies: child.allergies || 'None',
            medical_notes: child.medical_notes || 'None',
            household: child.household?.name || 'N/A',
            primary_guardian: primaryGuardian ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}` : 'N/A',
            guardian_phone: primaryGuardian ? primaryGuardian.mobile_phone : 'N/A',
            guardian_email: primaryGuardian ? primaryGuardian.email : 'N/A',
        };
    });

    const csv = convertToCSV(exportData);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

// Ministry Configuration CRUD
export async function createMinistry(ministryData: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at' | 'data_profile'>): Promise<string> {
    const now = new Date().toISOString();
    const newMinistry: Ministry = {
        ...ministryData,
        ministry_id: ministryData.code, // Use code as ID for simplicity
        created_at: now,
        updated_at: now,
        data_profile: 'Basic', // Default data profile
        is_active: ministryData.is_active ?? true,
    };
    return db.ministries.add(newMinistry);
}

export async function updateMinistry(ministryId: string, updates: Partial<Ministry>): Promise<number> {
    const now = new Date().toISOString();
    return db.ministries.update(ministryId, { ...updates, updated_at: now });
}

export async function deleteMinistry(ministryId: string): Promise<void> {
    // In a real app, you would handle cascading deletes or archiving.
    // For this prototype, we will just delete the ministry.
    return db.ministries.delete(ministryId);
}

// Leader Management
export async function queryLeaders() {
    const leaders = await db.users.where('role').equals(AuthRole.MINISTRY_LEADER).sortBy('name');
    const leaderIds = leaders.map(l => l.user_id);
    const assignments = await db.leader_assignments.where('leader_id').anyOf(leaderIds).and(a => a.cycle_id === '2025').toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m.name]));

    return leaders.map(leader => {
        const leaderAssignments = assignments
            .filter(a => a.leader_id === leader.user_id)
            .map(a => ({ ...a, ministryName: ministryMap.get(a.ministry_id) || 'Unknown Ministry' }));

        const isActive = leader.is_active && leaderAssignments.length > 0;

        return {
            ...leader,
            is_active: isActive,
            assignments: leaderAssignments,
        };
    });
}

export async function getLeaderProfile(leaderId: string, cycleId: string) {
    const leader = await db.users.get(leaderId);
    const assignments = await db.leader_assignments.where({ leader_id: leaderId, cycle_id: cycleId }).toArray();

    // Fetch all ministries and then filter by is_active in code.
    const allMinistriesRaw = await db.ministries.toArray();
    const allMinistries = allMinistriesRaw
        .filter(m => m.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));

    return { leader, assignments, allMinistries };
}

export async function getLeaderAssignmentsForCycle(leaderId: string, cycleId: string) {
    return db.leader_assignments.where({ leader_id: leaderId, cycle_id: cycleId }).toArray();
}

export async function getLeaderBibleBeeProgress(leaderId: string, cycleId: string) {
    // Find ministries this leader is assigned to for the cycle
    const assignments = await getLeaderAssignmentsForCycle(leaderId, cycleId);
    const ministryIds = assignments.map(a => a.ministry_id);
    if (ministryIds.length === 0) return [];

    // Find children enrolled in those ministries for the cycle
    const enrollments = await db.ministry_enrollments.where('ministry_id').anyOf(ministryIds).and(e => e.cycle_id === cycleId).toArray();
    const childIds = [...new Set(enrollments.map(e => e.child_id))];
    if (childIds.length === 0) return [];

    const children = await db.children.where('child_id').anyOf(childIds).toArray();

    // Find the competition year matching the numeric cycle year (if present)
    const yearNum = Number(cycleId);
    const compYear = await db.competitionYears.where('year').equals(yearNum).first();

    // For each child compute scripture and essay progress for the found competition year
    const results: any[] = [];
    // Build a map of childId -> ministries they are enrolled in
    const allEnrollmentsForChildren = await db.ministry_enrollments.where('child_id').anyOf(childIds).and(e => e.cycle_id === cycleId).toArray();
    const ministryList = await db.ministries.toArray();
    const ministryMap = new Map(ministryList.map(m => [m.ministry_id, m]));

    // Prefetch guardians for all households to avoid per-child queries
    const householdIds = children.map(c => c.household_id).filter(Boolean);
    const allGuardians = householdIds.length ? await db.guardians.where('household_id').anyOf(householdIds).toArray() : [];
    const guardianMap = new Map<string, any>();
    for (const g of allGuardians) {
        if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
        guardianMap.get(g.household_id).push(g);
    }

    for (const child of children) {
        let scriptures: any[] = [];
        let essays: any[] = [];
        if (compYear) {
            scriptures = await db.studentScriptures.where({ childId: child.child_id, competitionYearId: compYear.id }).toArray();
            essays = await db.studentEssays.where({ childId: child.child_id, competitionYearId: compYear.id }).toArray();
        }

        const totalScriptures = scriptures.length;
        const completedScriptures = scriptures.filter(s => s.status === 'completed').length;
        const essayStatus = essays.length ? essays[0].status : 'none';

        const childEnrolls = allEnrollmentsForChildren.filter(e => e.child_id === child.child_id).map(e => ({ ...e, ministryName: ministryMap.get(e.ministry_id)?.name || 'Unknown' }));

        // Identify primary guardian from pre-fetched guardians
        let primaryGuardian = null;
        const guardiansForHouse = guardianMap.get(child.household_id) || [];
        primaryGuardian = guardiansForHouse.find((g: any) => g.is_primary) || guardiansForHouse[0] || null;

        // Determine required/scripture target for this child's grade using grade rules
        let requiredScriptures: number | null = null;
        let gradeGroup: string | null = null;
        try {
            const gradeNum = child.grade ? Number(child.grade) : NaN;
            const rule = !isNaN(gradeNum) && compYear ? await getApplicableGradeRule(compYear.id, gradeNum) : null;
            requiredScriptures = rule?.targetCount ?? null;
            if (rule) {
                if (rule.minGrade === rule.maxGrade) gradeGroup = `Grade ${rule.minGrade}`;
                else gradeGroup = `Grades ${rule.minGrade}-${rule.maxGrade}`;
            }
        } catch (err) {
            requiredScriptures = null;
            gradeGroup = null;
        }

        // Derive completion status per user request: Not Started, In-Progress (some but not enough), Complete (has completed the minimum)
        const target = requiredScriptures ?? totalScriptures;
        let bibleBeeStatus: 'Not Started' | 'In-Progress' | 'Complete' = 'Not Started';
        if (completedScriptures === 0) {
            bibleBeeStatus = 'Not Started';
        } else if (completedScriptures >= target) {
            bibleBeeStatus = 'Complete';
        } else {
            bibleBeeStatus = 'In-Progress';
        }

        results.push({
            childId: child.child_id,
            childName: `${child.first_name} ${child.last_name}`,
            totalScriptures,
            completedScriptures,
            requiredScriptures: requiredScriptures ?? totalScriptures,
            bibleBeeStatus,
            gradeGroup,
            essayStatus,
            ministries: childEnrolls,
            primaryGuardian,
            child,
        });
    }

    // sort by child name
    return results.sort((a, b) => a.childName.localeCompare(b.childName));
}

export async function getBibleBeeProgressForCycle(cycleId: string) {
    // Find enrollments for the bible-bee ministry for the cycle
    const enrollments = await db.ministry_enrollments
        .where('ministry_id').equals('bible-bee')
        .and(e => e.cycle_id === cycleId)
        .toArray();

    const childIds = [...new Set(enrollments.map(e => e.child_id))];
    if (childIds.length === 0) return [];

    const children = await db.children.where('child_id').anyOf(childIds).toArray();

    // Find the competition year matching the numeric cycle year (if present)
    const yearNum = Number(cycleId);
    const compYear = await db.competitionYears.where('year').equals(yearNum).first();

    const results: any[] = [];
    const allEnrollmentsForChildren = await db.ministry_enrollments.where('child_id').anyOf(childIds).and(e => e.cycle_id === cycleId).toArray();
    const ministryList = await db.ministries.toArray();
    const ministryMap = new Map(ministryList.map(m => [m.ministry_id, m]));

    for (const child of children) {
        let scriptures: any[] = [];
        let essays: any[] = [];
        if (compYear) {
            scriptures = await db.studentScriptures.where({ childId: child.child_id, competitionYearId: compYear.id }).toArray();
            essays = await db.studentEssays.where({ childId: child.child_id, competitionYearId: compYear.id }).toArray();
        }

        const totalScriptures = scriptures.length;
        const completedScriptures = scriptures.filter(s => s.status === 'completed').length;
        const essayStatus = essays.length ? essays[0].status : 'none';

        const childEnrolls = allEnrollmentsForChildren.filter(e => e.child_id === child.child_id).map(e => ({ ...e, ministryName: ministryMap.get(e.ministry_id)?.name || 'Unknown' }));

        let requiredScriptures: number | null = null;
        let gradeGroup: string | null = null;
        try {
            const gradeNum = child.grade ? Number(child.grade) : NaN;
            const rule = !isNaN(gradeNum) && compYear ? await getApplicableGradeRule(compYear.id, gradeNum) : null;
            requiredScriptures = rule?.targetCount ?? null;
            if (rule) {
                if (rule.minGrade === rule.maxGrade) gradeGroup = `Grade ${rule.minGrade}`;
                else gradeGroup = `Grades ${rule.minGrade}-${rule.maxGrade}`;
            }
        } catch (err) {
            requiredScriptures = null;
            gradeGroup = null;
        }

        const target = requiredScriptures ?? totalScriptures;
        let bibleBeeStatus: 'Not Started' | 'In-Progress' | 'Complete' = 'Not Started';
        if (completedScriptures === 0) {
            bibleBeeStatus = 'Not Started';
        } else if (completedScriptures >= target) {
            bibleBeeStatus = 'Complete';
        } else {
            bibleBeeStatus = 'In-Progress';
        }

        // Fetch primary guardian for display in leader progress
        let primaryGuardian = null;
        try {
            if (child.household_id) {
                const guardians = await db.guardians.where({ household_id: child.household_id }).toArray();
                primaryGuardian = guardians.find(g => g.is_primary) || guardians[0] || null;
            }
        } catch (err) {
            primaryGuardian = null;
        }

        results.push({
            childId: child.child_id,
            childName: `${child.first_name} ${child.last_name}`,
            totalScriptures,
            completedScriptures,
            requiredScriptures: requiredScriptures ?? totalScriptures,
            bibleBeeStatus,
            gradeGroup,
            essayStatus,
            ministries: childEnrolls,
            primaryGuardian,
            child,
        });
    }

    return results.sort((a, b) => a.childName.localeCompare(b.childName));
}

export async function saveLeaderAssignments(leaderId: string, cycleId: string, newAssignments: Omit<LeaderAssignment, 'assignment_id'>[]) {
    return (db as any).transaction('rw', db.leader_assignments, async () => {
        // Delete old assignments for this leader and cycle
        await db.leader_assignments.where({ leader_id: leaderId, cycle_id: cycleId }).delete();

        // Add new ones
        if (newAssignments.length > 0) {
            const assignmentsToCreate = newAssignments.map(a => ({
                ...a,
                assignment_id: uuidv4()
            }));
            await db.leader_assignments.bulkAdd(assignmentsToCreate);
        }
    });
}

export async function updateLeaderStatus(leaderId: string, isActive: boolean): Promise<number> {
    return db.users.update(leaderId, { is_active: isActive });
}

// === NEW: Leader Profile Management Functions ===

// Normalize email to lowercase
function normalizeEmail(email?: string): string | undefined {
  return email ? email.toLowerCase().trim() : undefined;
}

// Normalize phone number (basic implementation)
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/\D/g, ''); // Remove all non-digits
}

// Query all leader profiles with their membership counts
export async function queryLeaderProfiles() {
    const profiles = await db.leader_profiles.orderBy('[first_name+last_name]').toArray();
    const memberships = await db.ministry_leader_memberships.toArray();
    
    // Create a map of leader_id to ministry count (only active memberships)
    const membershipCounts = memberships.reduce((acc, m) => {
        if (m.is_active) {
            acc[m.leader_id] = (acc[m.leader_id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
    
    return profiles.map(profile => ({
        ...profile,
        ministryCount: membershipCounts[profile.leader_id] || 0,
        is_active: profile.is_active && (membershipCounts[profile.leader_id] || 0) > 0
    }));
}

// Get leader profile with all memberships
export async function getLeaderProfileWithMemberships(leaderId: string) {
    const profile = await db.leader_profiles.get(leaderId);
    if (!profile) return null;

    const memberships = await db.ministry_leader_memberships.where('leader_id').equals(leaderId).toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    const membershipsWithMinistries = memberships.map(m => ({
        ...m,
        ministry: ministryMap.get(m.ministry_id)
    })).filter(m => m.ministry); // Filter out memberships for deleted ministries

    return {
        profile,
        memberships: membershipsWithMinistries,
        allMinistries: ministries.filter(m => m.is_active).sort((a, b) => a.name.localeCompare(b.name))
    };
}

// Create or update leader profile
export async function saveLeaderProfile(profileData: Omit<LeaderProfile, 'created_at' | 'updated_at'> & { created_at?: string }) {
    const now = new Date().toISOString();
    
    // Normalize email and phone
    const normalizedProfile: LeaderProfile = {
        ...profileData,
        email: normalizeEmail(profileData.email),
        phone: normalizePhone(profileData.phone),
        created_at: profileData.created_at || now,
        updated_at: now
    };

    // Check for duplicate email (if provided)
    if (normalizedProfile.email) {
        const existingByEmail = await db.leader_profiles
            .where('email').equals(normalizedProfile.email)
            .and(p => p.leader_id !== normalizedProfile.leader_id)
            .first();
        
        if (existingByEmail) {
            throw new Error(`A leader profile with email ${normalizedProfile.email} already exists`);
        }
    }

    return db.leader_profiles.put(normalizedProfile);
}

// Get ministry memberships for a leader
export async function getLeaderMemberships(leaderId: string) {
    const memberships = await db.ministry_leader_memberships.where('leader_id').equals(leaderId).toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    return memberships.map(m => ({
        ...m,
        ministry: ministryMap.get(m.ministry_id)
    })).filter(m => m.ministry);
}

// Save leader memberships (replaces all memberships for the leader)
export async function saveLeaderMemberships(leaderId: string, memberships: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>[]) {
    return db.transaction('rw', [db.ministry_leader_memberships], async () => {
        // Delete existing memberships for this leader
        await db.ministry_leader_memberships.where('leader_id').equals(leaderId).delete();

        // Add new memberships
        if (memberships.length > 0) {
            const now = new Date().toISOString();
            const membershipRecords: MinistryLeaderMembership[] = memberships.map(m => ({
                ...m,
                membership_id: uuidv4(),
                created_at: now,
                updated_at: now
            }));

            await db.ministry_leader_memberships.bulkAdd(membershipRecords);
        }

        // Update leader profile activity status
        await updateLeaderProfileStatus(leaderId, memberships.some(m => m.is_active));
    });
}

// Update leader profile active status
export async function updateLeaderProfileStatus(leaderId: string, isActive: boolean) {
    const now = new Date().toISOString();
    return db.leader_profiles.update(leaderId, { is_active: isActive, updated_at: now });
}

// Get ministry roster (memberships for a ministry)
export async function getMinistryRoster(ministryId: string) {
    const memberships = await db.ministry_leader_memberships.where('ministry_id').equals(ministryId).toArray();
    const leaderIds = memberships.map(m => m.leader_id);
    
    if (leaderIds.length === 0) return [];
    
    const profiles = await db.leader_profiles.where('leader_id').anyOf(leaderIds).toArray();
    const profileMap = new Map(profiles.map(p => [p.leader_id, p]));

    return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.leader_id)
    })).filter(m => m.profile);
}

// Search leader profiles by name or email
export async function searchLeaderProfiles(searchTerm: string) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return db.leader_profiles
        .filter(profile => {
            const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
            const email = profile.email?.toLowerCase() || '';
            
            return fullName.includes(lowerSearchTerm) || email.includes(lowerSearchTerm);
        })
        .toArray();
}

// Get ministry accounts
export async function getMinistryAccounts() {
    const accounts = await db.ministry_accounts.toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    return accounts.map(account => ({
        ...account,
        ministry: ministryMap.get(account.ministry_id)
    })).filter(a => a.ministry);
}

// Create or update ministry account
export async function saveMinistryAccount(accountData: Omit<MinistryAccount, 'created_at' | 'updated_at'> & { created_at?: string }) {
    const now = new Date().toISOString();
    
    const normalizedAccount: MinistryAccount = {
        ...accountData,
        email: normalizeEmail(accountData.email) || '',
        created_at: accountData.created_at || now,
        updated_at: now
    };

    // Check for duplicate email
    const existingByEmail = await db.ministry_accounts
        .where('email').equals(normalizedAccount.email)
        .and(a => a.ministry_id !== normalizedAccount.ministry_id)
        .first();
    
    if (existingByEmail) {
        throw new Error(`A ministry account with email ${normalizedAccount.email} already exists`);
    }

    return db.ministry_accounts.put(normalizedAccount);
}

export async function updateChildPhoto(childId: string, photoDataUrl: string): Promise<number> {
    return db.children.update(childId, { photo_url: photoDataUrl });
}

// Branding Settings CRUD
export async function getBrandingSettings(orgId: string = 'default'): Promise<BrandingSettings | null> {
    const settings = await db.branding_settings.where({ org_id: orgId }).first();
    return settings || null;
}

export async function saveBrandingSettings(
    orgId: string = 'default', 
    settings: Omit<BrandingSettings, 'setting_id' | 'org_id' | 'created_at' | 'updated_at'>
): Promise<string> {
    const now = new Date().toISOString();
    const existingSettings = await getBrandingSettings(orgId);
    
    if (existingSettings) {
        // Update existing settings
        await db.branding_settings.update(existingSettings.setting_id, {
            ...settings,
            updated_at: now,
        });
        return existingSettings.setting_id;
    } else {
        // Create new settings
        const newSettings: BrandingSettings = {
            setting_id: uuidv4(),
            org_id: orgId,
            ...settings,
            created_at: now,
            updated_at: now,
        };
        await db.branding_settings.add(newSettings);
        return newSettings.setting_id;
    }
}

export async function getDefaultBrandingSettings(): Promise<Partial<BrandingSettings>> {
    return {
        app_name: 'gatherKids',
        description: "The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
        logo_url: undefined, // Will use default cross icon
        use_logo_only: false, // Show app name with logo by default
        youtube_url: undefined,
        instagram_url: undefined,
    };
}

// Check if leader migration is needed and run it if so
export async function migrateLeadersIfNeeded(): Promise<boolean> {
    try {
        // Check if we have any leader profiles already
        const existingProfiles = await db.leader_profiles.limit(1).toArray();
        if (existingProfiles.length > 0) {
            return false; // Migration already done
        }

        // Check if we have any old ministry leaders to migrate
        const oldLeaders = await db.users.where('role').equals(AuthRole.MINISTRY_LEADER).limit(1).toArray();
        if (oldLeaders.length === 0) {
            return false; // No leaders to migrate
        }

        // Run the migration
        const { migrateLeaders } = await import('../../scripts/migrate/migrate-leaders');
        const report = await migrateLeaders();
        
        console.log('Migration completed:', report);
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

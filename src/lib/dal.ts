




import { db } from './db';
import type { Attendance, Child, Guardian, Household, Incident, IncidentSeverity, Ministry, MinistryEnrollment, Registration, User, EmergencyContact, LeaderAssignment } from './types';
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
    const children = await db.children.where({ household_id: householdId }).toArray();

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

export async function logIncident(data: {child_id: string, child_name: string, description: string, severity: IncidentSeverity, leader_id: string, event_id?: string}) {
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
                    customData = {...customData, ...enrollment.custom_fields};
                }
            } else if (enrollment.status === 'interest_only') {
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
        // Important: Clear household_id and child_id to ensure it's treated as a new registration for the current year, not an update.
        if (priorData.household) {
            priorData.household.household_id = "";
        }
        priorData.children.forEach(c => c.child_id = undefined);
        
        return {
            isCurrentYear: false,
            data: priorData
        };
    }

    // 3. No registration found in current or prior year.
    return null;
}


// Registration Logic
export async function registerHousehold(data: any, cycle_id: string) {
    const householdId = data.household.household_id || uuidv4();
    const isUpdate = !!data.household.household_id;
    const now = new Date().toISOString();

    await db.transaction('rw', db.households, db.guardians, db.emergency_contacts, db.children, db.registrations, db.ministry_enrollments, db.ministries, async () => {

        if (isUpdate) {
            // Overwrite existing data for this cycle
            const childIds = (await db.children.where({ household_id: householdId }).toArray()).map(c => c.child_id);
            
            // Delete previous registrations and enrollments for this cycle
            await db.registrations.where('[child_id+cycle_id]').anyOf(childIds.map(cid => [cid, cycle_id])).delete();
            await db.ministry_enrollments.where('[child_id+cycle_id]').anyOf(childIds.map(cid => [cid, cycle_id])).delete();

            // Clear out old guardian/contact info to be replaced
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
        
        // Children are more complex due to updates vs inserts
        const existingChildIds = isUpdate ? (await db.children.where({ household_id: householdId }).toArray()).map(c => c.child_id) : [];
        const incomingChildIds: string[] = []; // We will get these from form if they exist, or generate new ones

        const childrenToUpsert: Child[] = data.children.map((c: any) => {
            const childId = c.child_id || `c_${householdId}_${uuidv4().substring(0, 4)}`; // Use existing or generate
            incomingChildIds.push(childId);
            const { ministrySelections, interestSelections, customData, ...childCore } = c;
            return {
                ...childCore,
                child_id: childId,
                household_id: householdId,
                is_active: true,
                created_at: isUpdate && existingChildIds.includes(childId) ? (db.children.get(childId))!.created_at : now,
                updated_at: now,
            }
        });
        await db.children.bulkPut(childrenToUpsert);

        // Deactivate children who were removed from the form
        const childrenToRemove = existingChildIds.filter(id => !incomingChildIds.includes(id));
        if (childrenToRemove.length > 0) {
            await db.children.where('child_id').anyOf(childrenToRemove).modify({ is_active: false });
        }


        // Re-create registrations and enrollments
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
                         // Check eligibility
                        const age = child.dob ? ageOn(now, child.dob) : null;
                        const minAge = ministry.min_age ?? -1;
                        const maxAge = ministry.max_age ?? 999;
                        if (age !== null && (age < minAge || age > maxAge)) {
                            console.warn(`Skipping enrollment for ${child.first_name} in ${ministry.name} due to age restrictions.`);
                            continue;
                        }

                        // Collect custom data for this ministry
                        const custom_fields: { [key: string]: any } = {};
                        if(childData.customData && ministry.custom_questions) {
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
    const leaders = await db.users.where('role').equals('leader').sortBy('name');
    const leaderIds = leaders.map(l => l.user_id);
    const assignments = await db.leader_assignments.where('leader_id').anyOf(leaderIds).and(a => a.cycle_id === '2025').toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m.name]));

    return leaders.map(leader => {
        const leaderAssignments = assignments
            .filter(a => a.leader_id === leader.user_id)
            .map(a => ({...a, ministryName: ministryMap.get(a.ministry_id) || 'Unknown Ministry' }));
        return {
            ...leader,
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

export async function saveLeaderAssignments(leaderId: string, cycleId: string, newAssignments: Omit<LeaderAssignment, 'assignment_id'>[]) {
    return db.transaction('rw', db.leader_assignments, async () => {
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



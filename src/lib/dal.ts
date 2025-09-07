













import { db } from './db';
import { db as dbAdapter } from './database/factory';
import { getApplicableGradeRule } from './bibleBee';
import { gradeToCode } from './gradeUtils';
import { AuthRole } from './auth-types';
import { isDemo } from './featureFlags';
import type { Attendance, Child, Guardian, Household, Incident, IncidentSeverity, Ministry, MinistryEnrollment, Registration, User, EmergencyContact, LeaderAssignment, LeaderProfile, MinistryLeaderMembership, MinistryAccount, BrandingSettings, BibleBeeYear, RegistrationCycle, Scripture, CompetitionYear, CustomQuestion } from './types';

// Leader view result for Bible Bee progress summaries (used by multiple helpers)
type LeaderBibleBeeResult = {
    childId: string;
    childName: string;
    totalScriptures: number;
    completedScriptures: number;
    requiredScriptures: number;
    bibleBeeStatus: 'Not Started' | 'In-Progress' | 'Complete';
    gradeGroup: string | null;
    essayStatus: string;
    ministries: unknown[];
    primaryGuardian: Guardian | null;
    child: Child;
};
import { differenceInYears, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Export both the legacy Dexie interface (db) and the new adapter interface (dbAdapter)
// Legacy DAL functions continue to use the Dexie interface for backward compatibility
// New code should use dbAdapter for consistent behavior across demo/Supabase modes
export { dbAdapter };

// Utility to determine if we should use the adapter interface for write operations
function shouldUseAdapter(): boolean {
    const isDemoMode = isDemo();
    console.log('shouldUseAdapter: Checking database mode', { 
        isDemoMode, 
        useAdapter: !isDemoMode,
        databaseMode: process.env.NEXT_PUBLIC_DATABASE_MODE || 'not set'
    });
    return !isDemoMode; // Use adapter (Supabase) when not in demo mode
}

// Small helper to coerce various DB representations of "active" into a boolean.
function isActiveValue(v: unknown): boolean {
    return v === true || v === 1 || String(v) === '1' || String(v) === 'true';
}

// Extract a user id from common shapes used across codepaths (supabase user, legacy user objects)
function extractUserId(user: unknown): string | undefined {
    const u = user as unknown as Record<string, unknown> | undefined;
    return (u?.uid as string | undefined) || (u?.id as string | undefined) || (u?.user_id as string | undefined);
}

// Type guard to detect a user object with metadata.role === AuthRole.MINISTRY_LEADER
function isMinistryLeaderUser(user: unknown): boolean {
    if (!user || typeof user !== 'object') return false;
    const u = user as Record<string, unknown>;
    const meta = u?.metadata as Record<string, unknown> | undefined;
    return (meta?.role as unknown) === AuthRole.MINISTRY_LEADER;
}

// Wrapper to call the Dexie transaction API when multiple table args are used.
function runDexieTransaction(...args: unknown[]) {
    // Narrow the transaction API cast to avoid `any` leaking into the codebase.
    return (db as unknown as { transaction: (...innerArgs: unknown[]) => unknown }).transaction(...args);
}

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

type EnrichedEnrollment = MinistryEnrollment & { ministryName?: string; customQuestions?: CustomQuestion[] };
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

    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        // First check for active check-ins
        const activeCheckIns = await dbAdapter.listAttendance({
            childId: childId,
            date: today
        });
        
        const activeCheckIn = activeCheckIns.find(rec => !rec.check_out_at);
        if (activeCheckIn) {
            throw new Error("This child is already checked in to another event.");
        }

        // Create new attendance record
        const attendanceRecord = await dbAdapter.createAttendance({
            event_id: eventId,
            child_id: childId,
            date: today,
            timeslot_id: timeslotId,
            check_in_at: new Date().toISOString(),
            checked_in_by: userId,
        });
        
        return attendanceRecord.attendance_id;
    } else {
        // Use legacy Dexie interface for demo mode
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
}

export async function recordCheckOut(attendanceId: string, verifier: { method: "PIN" | "other", value: string }, userId?: string): Promise<string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const attendanceRecord = await dbAdapter.getAttendance(attendanceId);
        if (!attendanceRecord) throw new Error("Attendance record not found");

        const updatedRecord = await dbAdapter.updateAttendance(attendanceId, {
            check_out_at: new Date().toISOString(),
            checked_out_by: userId,
            pickup_method: verifier.method,
            picked_up_by: verifier.method === 'other' ? verifier.value : undefined,
        });
        
        return updatedRecord.attendance_id;
    } else {
        // Use legacy Dexie interface for demo mode
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
}

export async function acknowledgeIncident(incidentId: string): Promise<number | string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const updatedIncident = await dbAdapter.updateIncident(incidentId, { 
            admin_acknowledged_at: new Date().toISOString() 
        });
        return updatedIncident.incident_id;
    } else {
        // Use legacy Dexie interface for demo mode
        return db.incidents.update(incidentId, { admin_acknowledged_at: new Date().toISOString() });
    }
}

export async function logIncident(data: { child_id: string, child_name: string, description: string, severity: IncidentSeverity, leader_id: string, event_id?: string }): Promise<string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const incident = await dbAdapter.createIncident({
            child_id: data.child_id,
            child_name: data.child_name,
            description: data.description,
            severity: data.severity,
            leader_id: data.leader_id,
            event_id: data.event_id,
            timestamp: new Date().toISOString(),
            admin_acknowledged_at: null,
        });
        return incident.incident_id;
    } else {
        // Use legacy Dexie interface for demo mode
        const incident: Incident = {
            incident_id: uuidv4(),
            ...data,
            timestamp: new Date().toISOString(),
            admin_acknowledged_at: null,
        }
        return db.incidents.add(incident);
    }
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
    let customData: Record<string, unknown> = {};

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
    console.log('findHouseholdByEmail: Starting search', { email, currentCycleId });
    
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        try {
            console.log('findHouseholdByEmail: Using Supabase adapter to search for guardians');
            // Find guardian by email
            const guardians = await dbAdapter.listGuardians(''); // Empty string means get all guardians
            console.log(`findHouseholdByEmail: Found ${guardians.length} guardians total`);
            
            const guardian = guardians.find(g => g.email && g.email.toLowerCase() === email.toLowerCase());
            console.log('findHouseholdByEmail: Guardian search result', { 
                found: !!guardian,
                guardianId: guardian?.guardian_id,
                householdId: guardian?.household_id 
            });
            
            if (!guardian) return null;

            const householdId = guardian.household_id;
            const children = await dbAdapter.listChildren({ householdId });
            const childIds = children.map(c => c.child_id);

            if (childIds.length === 0) return null;

            // Check for current cycle enrollments
            const currentEnrollments = await dbAdapter.listMinistryEnrollments(undefined, undefined, currentCycleId);
            const currentEnrollmentExists = currentEnrollments.some(e => childIds.includes(e.child_id));

            if (currentEnrollmentExists) {
                return {
                    isCurrentYear: true,
                    isPrefill: false,
                    data: await fetchFullHouseholdDataFromAdapter(householdId, currentCycleId)
                };
            }

            // Check for prior cycle
            const priorCycleId = String(parseInt(currentCycleId, 10) - 1);
            const priorEnrollments = await dbAdapter.listMinistryEnrollments(undefined, undefined, priorCycleId);
            const priorEnrollmentExists = priorEnrollments.some(e => childIds.includes(e.child_id));

            if (priorEnrollmentExists) {
                return {
                    isCurrentYear: false,
                    isPrefill: true,
                    data: await fetchFullHouseholdDataFromAdapter(householdId, priorCycleId)
                };
            }

            return null;
        } catch (error) {
            console.error('Error finding household by email in live mode:', error);
            return null;
        }
    } else {
        // Use legacy Dexie interface for demo mode
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
}

// Helper function to fetch household data using adapter
async function fetchFullHouseholdDataFromAdapter(householdId: string, cycleId: string) {
    const household = await dbAdapter.getHousehold(householdId);
    const guardians = await dbAdapter.listGuardians(householdId);
    const emergencyContacts = await dbAdapter.listEmergencyContacts(householdId);
    const emergencyContact = emergencyContacts[0] || null;
    const children = await dbAdapter.listChildren({ householdId, isActive: true });
    const childIds = children.map(c => c.child_id);
    const enrollments = await dbAdapter.listMinistryEnrollments(undefined, undefined, cycleId);
    const childEnrollments = enrollments.filter(e => childIds.includes(e.child_id));
    const allMinistries = await dbAdapter.listMinistries();
    const ministryMap = new Map(allMinistries.map(m => [m.ministry_id, m]));

    const childrenWithSelections = children.map(child => {
        const childEnrollments = enrollments.filter(e => e.child_id === child.child_id);
        const ministrySelections: { [key: string]: boolean | undefined } = {};
        const interestSelections: { [key: string]: boolean | undefined } = {};
        let customData: Record<string, unknown> = {};

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
}


export async function getHouseholdForUser(authUserId: string): Promise<string | null> {
    try {
        const userHousehold = await db.user_households
            .where('auth_user_id')
            .equals(authUserId)
            .first();
        
        return userHousehold?.household_id || null;
    } catch (error) {
        console.warn('Could not get household for user (likely demo mode):', error);
        return null;
    }
}

// Registration Logic
    export async function registerHousehold(data: unknown, cycle_id: string, isPrefill: boolean) {
    // Local narrowed payload type for legacy registration shapes
    type RegistrationPayload = {
        household?: Partial<Household>;
        guardians?: Array<Partial<Guardian>>;
        emergencyContact?: Partial<EmergencyContact>;
        children?: Array<Partial<Child> & {
            ministrySelections?: Record<string, boolean>;
            interestSelections?: Record<string, boolean>;
            customData?: Record<string, unknown>;
        }>;
        consents?: { liability?: boolean; photoRelease?: boolean };
    };

    // Narrow legacy `data` to a workable shape for this handler
    const input = data as RegistrationPayload;

    const householdId = input.household?.household_id || uuidv4();
    const isUpdate = !!input.household?.household_id;
    const now = new Date().toISOString();

    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode - Handle registration transaction
        return await dbAdapter.transaction(async () => {
            // Handle household
            const household = {
                household_id: householdId,
                name: input.household?.name || `${(input.guardians && (input.guardians[0] as Partial<Guardian>)?.last_name) || 'Household'} Household`,
                address_line1: input.household?.address_line1,
                preferredScriptureTranslation: input.household?.preferredScriptureTranslation, // Keep camelCase for adapter interface
            };

            if (isUpdate) {
                await dbAdapter.updateHousehold(householdId, household);
                // Delete existing guardians and contacts for update
                const existingGuardians = await dbAdapter.listGuardians(householdId);
                const existingContacts = await dbAdapter.listEmergencyContacts(householdId);
                for (const guardian of existingGuardians) {
                    await dbAdapter.deleteGuardian(guardian.guardian_id);
                }
                for (const contact of existingContacts) {
                    await dbAdapter.deleteEmergencyContact(contact.contact_id);
                }
            } else {
                await dbAdapter.createHousehold(household);
            }

            // Create guardians and store their IDs for later reference
            const createdGuardians: Guardian[] = [];
            for (const guardianData of (input.guardians || [])) {
                const gp = guardianData as Partial<Guardian>;
                const guardianPayload: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'> = {
                    household_id: householdId,
                    first_name: gp.first_name || '',
                    last_name: gp.last_name || '',
                    mobile_phone: gp.mobile_phone || '',
                    email: gp.email || '',
                    relationship: gp.relationship || '',
                    is_primary: gp.is_primary ?? false,
                };
                const createdGuardian = await dbAdapter.createGuardian(guardianPayload);
                createdGuardians.push(createdGuardian);
            }

            // Create emergency contact
            const emergencyPartial = input.emergencyContact as Partial<EmergencyContact> | undefined;
            if (emergencyPartial) {
                const emergencyPayload: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'> = {
                    household_id: householdId,
                    first_name: emergencyPartial.first_name || '',
                    last_name: emergencyPartial.last_name || '',
                    mobile_phone: emergencyPartial.mobile_phone || '',
                    relationship: emergencyPartial.relationship || '',
                };
                await dbAdapter.createEmergencyContact(emergencyPayload);
            }

            // Handle children and enrollments
            for (const [index, childData] of (input.children || []).entries()) {
                        type IncomingChild = Partial<Child> & { ministrySelections?: Record<string, boolean>; interestSelections?: Record<string, boolean>; customData?: Record<string, unknown> };
                        const childDataAny = childData as IncomingChild;
                        const { ministrySelections, interestSelections, customData, ...childCore } = childDataAny;
                const childId = (childCore as Partial<Child>).child_id || uuidv4();

                const child = {
                    ...childCore,
                    child_id: childId,
                    household_id: householdId,
                    is_active: true,
                };

                if (childCore.child_id) {
                    await dbAdapter.updateChild(childId, child);
                } else {
                    // createChild requires the full create payload; cast from our partial
                    await dbAdapter.createChild(child as unknown as Omit<Child, 'child_id' | 'created_at' | 'updated_at'>);
                }

                // Delete existing enrollments for this cycle if updating
                if (isUpdate && !isPrefill) {
                    const existingEnrollments = await dbAdapter.listMinistryEnrollments(childId, undefined, cycle_id);
                    for (const enrollment of existingEnrollments) {
                        await dbAdapter.deleteMinistryEnrollment(enrollment.enrollment_id);
                    }
                    
                    const existingRegistrations = await dbAdapter.listRegistrations({ childId, cycleId: cycle_id });
                    for (const registration of existingRegistrations) {
                        await dbAdapter.deleteRegistration(registration.registration_id);
                    }
                }

                // Create registration - Use the first created guardian for consent signatures
                const primaryGuardian = createdGuardians[0];
                await dbAdapter.createRegistration({
                    child_id: childId,
                    cycle_id: cycle_id,
                    status: 'active',
                    pre_registered_sunday_school: true,
                    consents: [
                        { type: 'liability', accepted_at: input.consents?.liability ? now : null, signer_id: primaryGuardian.guardian_id, signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` },
                        { type: 'photoRelease', accepted_at: input.consents?.photoRelease ? now : null, signer_id: primaryGuardian.guardian_id, signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` }
                    ],
                    submitted_at: now,
                    submitted_via: 'web',
                });

                // Auto-enroll in Sunday School
                await dbAdapter.createMinistryEnrollment({
                    child_id: childId,
                    cycle_id: cycle_id,
                    ministry_id: "min_sunday_school",
                    status: 'enrolled',
                });

                // Handle ministry and interest selections
                const allSelections = { ...(childDataAny.ministrySelections || {}), ...(childDataAny.interestSelections || {}) };
                const allMinistries = await dbAdapter.listMinistries();
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

                            const custom_fields: { [key: string]: unknown } = {};
                            if (childDataAny.customData && ministry.custom_questions) {
                                for (const q of ministry.custom_questions) {
                                    if (childDataAny.customData[q.id] !== undefined) {
                                        (custom_fields as Record<string, unknown>)[q.id] = childDataAny.customData[q.id] as unknown;
                                    }
                                }
                            }

                            await dbAdapter.createMinistryEnrollment({
                                child_id: childId,
                                cycle_id: cycle_id,
                                ministry_id: ministry.ministry_id,
                                status: ministry.enrollment_type,
                                custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                            });

                            // Handle Bible Bee enrollment through new system
                            if (ministry.code === 'bible-bee') {
                                try {
                                    const bibleBeeYears = await dbAdapter.listBibleBeeYears();
                                    const bibleBeeYear = bibleBeeYears.find(year => year.is_active);
                                    
                                    if (bibleBeeYear) {
                                        const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
                                        const divisions = await dbAdapter.listDivisions(bibleBeeYear.id);
                                        
                                        const appropriateDivision = divisions.find(d => 
                                            gradeNum !== null && gradeNum >= d.min_grade && gradeNum <= d.max_grade
                                        );
                                        
                                        if (appropriateDivision) {
                                            await dbAdapter.createEnrollment({
                                                id: uuidv4(),
                                                child_id: childId,
                                                year_id: bibleBeeYear.id,
                                                division_id: appropriateDivision.id,
                                                auto_enrolled: false,
                                                enrolled_at: now,
                                            });
                                            console.log(`Created Bible Bee enrollment for child ${child.first_name} in division ${appropriateDivision.name}`);
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error creating Bible Bee enrollment:', error);
                                }
                            }
                        }
                    }
                }
            }

            return { household_id: householdId };
        });
    } else {
        // Use legacy Dexie interface for demo mode
    await runDexieTransaction('rw', db.households, db.guardians, db.emergency_contacts, db.children, db.registrations, db.ministry_enrollments, db.ministries, async () => {

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

            const guardianLastName = (input.guardians && (input.guardians[0] as Partial<Guardian>)?.last_name) || 'Household';
            const household: Household = {
            household_id: householdId,
            name: input.household?.name || `${guardianLastName} Household`,
            address_line1: input.household?.address_line1,
            preferredScriptureTranslation: input.household?.preferredScriptureTranslation,
            created_at: isUpdate ? (await db.households.get(householdId))!.created_at : now,
            updated_at: now,
        };
        await db.households.put(household);

    const guardians: Guardian[] = (input.guardians as unknown[] || []).map((g: unknown) => {
            const partial = g as Partial<Guardian>;
            const first_name = partial.first_name || '';
            const last_name = partial.last_name || '';
            return {
                guardian_id: uuidv4(),
                household_id: householdId,
                first_name,
                last_name,
                mobile_phone: partial.mobile_phone,
                email: partial.email,
                relationship: partial.relationship,
                is_primary: partial.is_primary ?? false,
                created_at: now,
                updated_at: now,
            } as Guardian;
        });
        await db.guardians.bulkAdd(guardians);

        const ecPartial = (input.emergencyContact as Partial<EmergencyContact>) || {};
        const emergencyContact: EmergencyContact = {
            contact_id: uuidv4(),
            household_id: householdId,
            first_name: ecPartial.first_name || '',
            last_name: ecPartial.last_name || '',
            mobile_phone: ecPartial.mobile_phone,
            relationship: ecPartial.relationship,
        } as EmergencyContact;
        await db.emergency_contacts.add(emergencyContact);

        const existingChildren = isUpdate ? await db.children.where({ household_id: householdId }).toArray() : [];
    const incomingChildIds = (input.children || []).map((c: unknown) => ((c as Partial<Child>)?.child_id)).filter(Boolean);

            const childrenToUpsert: Array<Partial<Child>> = (input.children || []).map((c: unknown) => {
            const cPartial = c as Partial<Child> & { ministrySelections?: Record<string, boolean>; interestSelections?: Record<string, boolean>; customData?: Record<string, unknown> };
            const { ministrySelections, interestSelections, customData, ...childCore } = cPartial;
            const existingChild = childCore.child_id ? existingChildren.find(ec => ec.child_id === childCore.child_id) : undefined;
            return {
                ...(childCore as Partial<Child>),
                child_id: (childCore as Partial<Child>).child_id || uuidv4(),
                household_id: householdId,
                is_active: true, // All children submitted are considered active for this registration
                created_at: existingChild?.created_at || now,
                updated_at: now,
            }
    });
    await db.children.bulkPut(childrenToUpsert as Child[]);

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
            const childData = (input.children || [])[index] as Partial<Child> & { ministrySelections?: Record<string, boolean>; interestSelections?: Record<string, boolean>; customData?: Record<string, unknown> };

            const childId = child.child_id || uuidv4();

                const registration: Registration = {
                registration_id: uuidv4(),
                child_id: childId,
                cycle_id: cycle_id,
                status: 'active',
                pre_registered_sunday_school: true,
                    consents: [
                    { type: 'liability', accepted_at: input.consents?.liability ? now : null, signer_id: guardians[0].guardian_id, signer_name: `${guardians[0].first_name} ${guardians[0].last_name}` },
                    { type: 'photoRelease', accepted_at: input.consents?.photoRelease ? now : null, signer_id: guardians[0].guardian_id, signer_name: `${guardians[0].first_name} ${guardians[0].last_name}` }
                ],
                submitted_at: now,
                submitted_via: 'web',
            };
            await db.registrations.add(registration);

            // Auto-enroll in Sunday School
            const sundaySchoolEnrollment: MinistryEnrollment = {
                enrollment_id: uuidv4(),
                child_id: childId,
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

                        const custom_fields: { [key: string]: unknown } = {};
                        if (childData.customData && ministry.custom_questions) {
                            for (const q of ministry.custom_questions) {
                                if ((childData.customData as Record<string, unknown>)[q.id] !== undefined) {
                                    (custom_fields as Record<string, unknown>)[q.id] = (childData.customData as Record<string, unknown>)[q.id];
                                }
                            }
                        }

                            const enrollment: MinistryEnrollment = {
                            enrollment_id: uuidv4(),
                            child_id: childId,
                            cycle_id: cycle_id,
                            ministry_id: ministry.ministry_id,
                            status: ministry.enrollment_type,
                            custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                        };
                        await db.ministry_enrollments.add(enrollment);

                        // CRITICAL FIX: For Bible Bee, also create entry in new enrollments table
                        if (ministry.code === 'bible-bee') {
                            try {
                                // Find the active Bible Bee year for this cycle
                                const bibleBeeYear = await db.bible_bee_years
                                    .where('cycle_id')
                                    .equals(cycle_id)
                                    .and(year => year.is_active)
                                    .first();
                                
                                if (bibleBeeYear) {
                                    // Get the child's grade to determine appropriate division
                                    const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
                                    const divisions = await db.divisions
                                        .where('year_id')
                                        .equals(bibleBeeYear.id)
                                        .toArray();
                                    
                                    const appropriateDivision = divisions.find(d => 
                                        gradeNum !== null && gradeNum >= d.min_grade && gradeNum <= d.max_grade
                                    );
                                    
                                    if (appropriateDivision) {
                                        const bibleBeeEnrollment = {
                                            id: uuidv4(),
                                            child_id: childId,
                                            year_id: bibleBeeYear.id,
                                            division_id: appropriateDivision.id,
                                            auto_enrolled: false,
                                            enrolled_at: now,
                                        };
                                        await db.enrollments.add(bibleBeeEnrollment);
                                        console.log(`Created Bible Bee enrollment for child ${child.first_name} in division ${appropriateDivision.name}`);
                                    } else {
                                        console.warn(`No appropriate Bible Bee division found for child ${child.first_name} in grade ${child.grade}`);
                                    }
                                } else {
                                    console.warn(`No active Bible Bee year found for cycle ${cycle_id}`);
                                }
                            } catch (error) {
                                console.error('Error creating Bible Bee enrollment:', error);
                                // Don't fail the entire registration if Bible Bee enrollment fails
                            }
                        }
                    }
                }
            }
        }
    });
    }

    // Create user_households relationship for Supabase auth
    // Handle this separately to avoid transaction conflicts with external async operations
    if (!isPrefill) { // Only create the relationship on final registration, not prefill
        try {
            // Import here to avoid circular dependency issues
            const { supabase } = await import('@/lib/supabaseClient');
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // Check if relationship already exists
                    const existingRelation = await db.user_households
                        .where('[auth_user_id+household_id]')
                        .equals([session.user.id, householdId])
                        .first();

                    if (!existingRelation) {
                        const userHousehold = {
                            user_household_id: uuidv4(),
                            auth_user_id: session.user.id,
                            household_id: householdId,
                            created_at: now,
                        };
                        await db.user_households.add(userHousehold);
                        console.log('Created user_households relationship:', userHousehold);
                    }

                    // Assign GUARDIAN role to the authenticated user
                    const { error: roleError } = await supabase.auth.updateUser({
                        data: {
                            role: 'GUARDIAN',
                            household_id: householdId,
                        },
                    });

                    if (roleError) {
                        console.warn('Could not assign GUARDIAN role:', roleError);
                    } else {
                        console.log('Assigned GUARDIAN role to user:', session.user.id);
                    }
                }
            }
        } catch (error) {
            console.warn('Could not create user_households relationship (likely demo mode):', error);
        }
    }
    
    // Return the household_id for the calling code
    return { household_id: householdId };
}

// CSV Export Functions
function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => JSON.stringify((row[fieldName] ?? '') as unknown)).join(',')
        )
    ];
    return csvRows.join('\r\n');
}

export async function exportRosterCSV<T = unknown>(children: T[]): Promise<Blob> {
    const exportData = children.map(child => {
        const childRec = child as Record<string, unknown>;
        const guardiansArr = (childRec['guardians'] as unknown) as Guardian[] | undefined;
        const primaryGuardian = (guardiansArr?.find(g => g.is_primary) || guardiansArr?.[0]) as Guardian | undefined;

        const firstName = (childRec['first_name'] ?? childRec['firstName'] ?? '') as string;
        const lastName = (childRec['last_name'] ?? childRec['lastName'] ?? '') as string;
        const grade = (childRec['grade'] ?? '') as string;
        const activeAttendance = (childRec['activeAttendance'] as unknown) as { check_in_at?: string; event_id?: string } | undefined;

        return {
            child_name: `${firstName} ${lastName}`.trim(),
            grade,
            status: activeAttendance ? 'Checked In' : 'Checked Out',
            check_in_time: activeAttendance?.check_in_at ? new Date(activeAttendance.check_in_at).toLocaleTimeString() : 'N/A',
            event: activeAttendance?.event_id || 'N/A',
            allergies: (childRec['allergies'] ?? 'None') as string,
            medical_notes: (childRec['medical_notes'] ?? 'None') as string,
            household: ((childRec['household'] as unknown) as { name?: string } )?.name || 'N/A',
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
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const newMinistry = await dbAdapter.createMinistry({
            ...ministryData,
            data_profile: 'Basic', // Default data profile
            is_active: ministryData.is_active ?? true,
        });
        return newMinistry.ministry_id;
    } else {
        // Use legacy Dexie interface for demo mode
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
}

export async function updateMinistry(ministryId: string, updates: Partial<Ministry>): Promise<number | string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const updatedMinistry = await dbAdapter.updateMinistry(ministryId, updates);
        return updatedMinistry.ministry_id;
    } else {
        // Use legacy Dexie interface for demo mode
        const now = new Date().toISOString();
        return db.ministries.update(ministryId, { ...updates, updated_at: now });
    }
}

export async function deleteMinistry(ministryId: string): Promise<void> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        await dbAdapter.deleteMinistry(ministryId);
    } else {
        // Use legacy Dexie interface for demo mode
        // In a real app, you would handle cascading deletes or archiving.
        // For this prototype, we will just delete the ministry.
        return db.ministries.delete(ministryId);
    }
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
    type LeaderBibleBeeResult = {
        childId: string;
        childName: string;
        totalScriptures: number;
        completedScriptures: number;
        requiredScriptures: number;
        bibleBeeStatus: 'Not Started' | 'In-Progress' | 'Complete';
        gradeGroup: string | null;
        essayStatus: string;
        ministries: unknown[];
        primaryGuardian: Guardian | null;
        child: Child;
    };

    const results: LeaderBibleBeeResult[] = [];
    // Build a map of childId -> ministries they are enrolled in
    const allEnrollmentsForChildren = await db.ministry_enrollments.where('child_id').anyOf(childIds).and((e: MinistryEnrollment) => e.cycle_id === cycleId).toArray();
    const ministryList = await db.ministries.toArray();
    const ministryMap = new Map(ministryList.map(m => [m.ministry_id, m]));

    // Prefetch guardians for all households to avoid per-child queries
    const householdIds = children.map(c => c.household_id).filter(Boolean);
    const allGuardians = householdIds.length ? await db.guardians.where('household_id').anyOf(householdIds).toArray() : [];
    const guardianMap = new Map<string, Guardian[]>();
    for (const g of allGuardians) {
        if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
        guardianMap.get(g.household_id)!.push(g);
    }

    for (const child of children) {
    // StudentScripture is the legacy per-student scripture record
    // Use unknown[] and narrow when accessing status fields
    let scriptures: unknown[] = [];
    let essays: Array<{ status?: string }> = [];
        if (compYear) {
            const compId = (compYear as { id?: string })?.id;
            scriptures = await db.studentScriptures.where({ childId: child.child_id, competitionYearId: compId }).toArray();
            essays = await db.studentEssays.where({ childId: child.child_id, competitionYearId: compId }).toArray();
        }

        const totalScriptures = scriptures.length;
        const completedScriptures = scriptures.filter((s): s is { status?: string } => typeof (s as unknown as { status?: unknown })?.status === 'string')
            .filter(s => s.status === 'completed').length;
        const essayStatus = essays.length ? (typeof (essays[0] as unknown as { status?: unknown })?.status === 'string' ? (essays[0] as { status?: string }).status : 'none') : 'none';

    const childEnrolls = allEnrollmentsForChildren.filter(e => e.child_id === child.child_id).map(e => ({ ...e, ministryName: ministryMap.get(e.ministry_id)?.name || 'Unknown' }));

    // Identify primary guardian from pre-fetched guardians
    let primaryGuardian: Guardian | null = null;
    const guardiansForHouse: Guardian[] = guardianMap.get(child.household_id) || [];
    primaryGuardian = guardiansForHouse.find((g: Guardian) => g.is_primary) || guardiansForHouse[0] || null;

        // Determine required/scripture target for this child's grade using grade rules
        let requiredScriptures: number | null = null;
        let gradeGroup: string | null = null;
        try {
            const gradeNum = child.grade ? gradeToCode(child.grade) : null;
            const rule = gradeNum !== null && compYear ? await getApplicableGradeRule((compYear as { id?: string }).id || '', gradeNum) : null;
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
    } as LeaderBibleBeeResult);
    }

    // sort by child name
    return results.sort((a, b) => a.childName.localeCompare(b.childName));
}

export async function getBibleBeeProgressForCycle(cycleId: string) {
    // Support both legacy (registration cycle id / numeric year) and new-schema
    // bible-bee years. If cycleId matches a bible_bee_year id, use the new
    // `enrollments` table; otherwise fall back to legacy ministry_enrollments.

    // First, attempt to treat cycleId as a new-schema bible-bee year id by
    // checking enrollments for that year. This handles the case where the
    // bible_bee_year record might not yet exist at the time of the query but
    // enrollments are present, and avoids accidental mapping to the active
    // registration cycle which could show prior-year children.
    let childIds: string[] = [];
    let children: Child[] = [];
    let compYear: unknown | null = null;

    try {
        const newEnrolls = await db.enrollments.where('year_id').equals(cycleId).toArray();
        if (newEnrolls && newEnrolls.length > 0) {
            childIds = [...new Set(newEnrolls.map(e => e.child_id))];
            children = await db.children.where('child_id').anyOf(childIds).toArray();
            compYear = null;
        }
    } catch (err) {
        // ignore and fall back to legacy path
    }

    if (childIds.length === 0) {
        // No new-schema enrollments found for this id; try legacy path or
        // resolve via bible_bee_year existence.
        const bbYear = await db.bible_bee_years.get(cycleId);
        if (bbYear) {
            const newEnrolls = await db.enrollments.where('year_id').equals(bbYear.id).toArray();
            childIds = [...new Set(newEnrolls.map(e => e.child_id))];
            if (childIds.length === 0) return [];
            children = await db.children.where('child_id').anyOf(childIds).toArray();
            compYear = null;
        } else {
            // Legacy path: ministry_enrollments keyed by ministry_id + cycle_id
            const enrollments = await db.ministry_enrollments
                .where('ministry_id').equals('bible-bee')
                .and(e => e.cycle_id === cycleId)
                .toArray();

            childIds = [...new Set(enrollments.map(e => e.child_id))];
            if (childIds.length === 0) return [];

            children = await db.children.where('child_id').anyOf(childIds).toArray();

            // Find the competition year matching the numeric cycle year (if present)
            const yearNum = Number(cycleId);
                                    compYear = (await db.competitionYears.where('year').equals(yearNum).first()) || null;
        }
    }

    const results: LeaderBibleBeeResult[] = [];
    const allEnrollmentsForChildren = await db.ministry_enrollments.where('child_id').anyOf(childIds).and(e => e.cycle_id === cycleId).toArray();
    const ministryList = await db.ministries.toArray();
    const ministryMap = new Map(ministryList.map(m => [m.ministry_id, m]));

    for (const child of children) {
    let scriptures: unknown[] = [];
    let essays: { status?: string }[] = [];
        if (compYear) {
            const compId = (compYear as { id?: string })?.id || '';
            scriptures = await db.studentScriptures.where({ childId: child.child_id, competitionYearId: compId }).toArray();
            essays = await db.studentEssays.where({ childId: child.child_id, competitionYearId: compId }).toArray();
        }

        const totalScriptures = scriptures.length;
    const completedScriptures = scriptures.filter((s): s is { status?: string } => typeof (s as unknown as { status?: unknown })?.status === 'string')
            .filter(s => s.status === 'completed').length;
        
        // Check essay status - look for essay prompts assigned to the child's division
        let essayStatus = 'none';
        if (essays.length > 0 && typeof (essays[0] as unknown as { status?: unknown })?.status === 'string') {
            essayStatus = (essays[0] as { status?: string }).status ?? 'none';
        } else {
            // Check if there's an essay prompt assigned to this child's division
            try {
                const divisionInfo = await (await import('./bibleBee')).getChildDivisionInfo(child.child_id, cycleId);
                if (divisionInfo.division) {
                    const essayPrompts = await db.essay_prompts
                        .where('year_id')
                        .equals(cycleId)
                        .and(prompt => prompt.division_name === divisionInfo.division.name)
                        .toArray();
                    if (essayPrompts.length > 0) {
                        essayStatus = 'assigned';
                    }
                }
            } catch (error) {
                console.warn('Error checking essay assignment for child:', child.child_id, error);
            }
        }

    // For new-schema enrollments, get ministries from the enrollments table
    let childEnrolls: EnrichedEnrollment[] | { ministry_id: string; ministryName: string }[] = [];
        if (cycleId && (await db.bible_bee_years.get(cycleId))) {
            // New schema: Look up actual enrollments for the child in this year
            try {
                const enrollments = await db.enrollments.where('child_id').equals(child.child_id).and(e => e.year_id === cycleId).toArray();
                // Map to Bible Bee ministry
                childEnrolls = [{ ministry_id: 'bible-bee', ministryName: 'Bible Bee' }];
            } catch (error) {
                childEnrolls = [];
            }
        } else {
            // Legacy schema: Use ministry_enrollments
            childEnrolls = allEnrollmentsForChildren.filter(e => e.child_id === child.child_id).map(e => ({ ...e, ministryName: ministryMap.get(e.ministry_id)?.name || 'Unknown' }));
        }

        // Use the new division system to get target and division info
        let requiredScriptures: number | null = null;
        let gradeGroup: string | null = null;
        try {
            // Use the helper function to get division information
            const divisionInfo = await (await import('./bibleBee')).getChildDivisionInfo(child.child_id, cycleId);
            requiredScriptures = divisionInfo.target;
            gradeGroup = divisionInfo.gradeGroup;
        } catch (err) {
            console.warn('Error getting division info:', err);
            // Fall back to legacy system
            try {
                const gradeNum = child.grade ? gradeToCode(child.grade) : null;
                const rule = gradeNum !== null && compYear ? await getApplicableGradeRule((compYear as { id?: string }).id || '', gradeNum) : null;
                requiredScriptures = rule?.targetCount ?? null;
                if (rule) {
                    if (rule.minGrade === rule.maxGrade) gradeGroup = `Grade ${rule.minGrade}`;
                    else gradeGroup = `Grades ${rule.minGrade}-${rule.maxGrade}`;
                }
            } catch (legacyErr) {
                requiredScriptures = null;
                gradeGroup = null;
            }
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
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        return await dbAdapter.transaction(async () => {
            // Note: This would need leader assignment methods in the adapter
            // For now, just log the operation
            console.log('Leader assignments would be saved to Supabase:', { leaderId, cycleId, newAssignments });
            // In a full implementation, we'd need adapter methods for leader assignments
        });
    } else {
        // Use legacy Dexie interface for demo mode
    return runDexieTransaction('rw', db.leader_assignments, async () => {
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
}

export async function updateLeaderStatus(leaderId: string, isActive: boolean): Promise<number | string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const updatedUser = await dbAdapter.updateUser(leaderId, { is_active: isActive });
        return updatedUser.user_id;
    } else {
        // Use legacy Dexie interface for demo mode
        return db.users.update(leaderId, { is_active: isActive });
    }
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
    console.log('queryLeaderProfiles called, shouldUseAdapter():', shouldUseAdapter());
    
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        console.log('Using Supabase adapter for leader profiles');
        try {
            const [profiles, memberships] = await Promise.all([
                dbAdapter.listLeaderProfiles(),
                dbAdapter.listMinistryLeaderMemberships()
            ]);
            
            console.log('Raw profiles from Supabase:', profiles);
            console.log('Raw memberships from Supabase:', memberships);
            
            // Sort by last name, then first name
            profiles.sort((a, b) => {
                const lastNameCompare = a.last_name.localeCompare(b.last_name);
                if (lastNameCompare !== 0) return lastNameCompare;
                return a.first_name.localeCompare(b.first_name);
            });
            
            // Create a map of leader_id to ministry count (only active memberships)
            const membershipCounts = memberships.reduce((acc, m) => {
                if (m.is_active) {
                    acc[m.leader_id] = (acc[m.leader_id] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);
            
            const result = profiles.map(profile => ({
                ...profile,
                ministryCount: membershipCounts[profile.leader_id] || 0,
                is_active: profile.is_active && (membershipCounts[profile.leader_id] || 0) > 0
            }));
            
            console.log('Final processed leader profiles:', result);
            return result;
        } catch (error) {
            console.error('Error in Supabase leader query:', error);
            throw error;
        }
    } else {
        // Use legacy Dexie interface for demo mode
        console.log('Using Dexie for leader profiles');
        const profiles = await db.leader_profiles.toArray();
        const memberships = await db.ministry_leader_memberships.toArray();
        
        // Sort by last name, then first name
        profiles.sort((a, b) => {
            const lastNameCompare = a.last_name.localeCompare(b.last_name);
            if (lastNameCompare !== 0) return lastNameCompare;
            return a.first_name.localeCompare(b.first_name);
        });
        
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

/**
 * Determine whether a leader can manage the Bible Bee ministry.
 * Checks legacy leader_assignments (mapped to active registration cycle when
 * selectedCycle points to a bible_bee_year), new ministry_leader_memberships,
 * and ministry_accounts (email-based demo mapping).
 */
export async function canLeaderManageBibleBee(opts: { leaderId?: string; email?: string; selectedCycle?: string; }) {
    const { leaderId, email, selectedCycle } = opts || {};
    // If neither identifier provided, cannot determine permission
    if (!leaderId && !email) return false;

    // Resolve an effective cycle id for legacy leader_assignments. If
    // selectedCycle corresponds to a bible_bee_year, map it to the currently
    // active registration cycle id.
    let effectiveCycle = selectedCycle;
    if (selectedCycle) {
        try {
            const bb = await db.bible_bee_years.get(selectedCycle);
            if (bb) {
                    const allCycles = await db.registration_cycles.toArray();
                    const active = allCycles.find((c: unknown) => {
                            return isActiveValue((c as unknown as Record<string, unknown>)?.is_active);
                        });
                if (active && active.cycle_id) effectiveCycle = active.cycle_id;
            }
        } catch (err) {
            // ignore and proceed
        }
    }

    // 1) Legacy leader_assignments check
    if (leaderId && effectiveCycle) {
        const assignments = await db.leader_assignments.where({ leader_id: leaderId, cycle_id: effectiveCycle }).toArray();
    if (assignments.some((a: LeaderAssignment) => a.ministry_id === 'bible-bee' && a.role === 'Primary')) return true;
    }

    // 2) New management system: ministry_leader_memberships
    if (leaderId) {
    const memberships = await db.ministry_leader_memberships.where('leader_id').equals(leaderId).toArray();
    if (memberships.some((m: MinistryLeaderMembership) => (m.ministry_id === 'bible-bee') && isActiveValue(m.is_active))) return true;
    }

    // 3) Demo/email-based mapping: ministry_accounts
    if (email) {
    const accounts = await db.ministry_accounts.where('email').equals(String(email)).toArray();
    if (accounts.some((a: MinistryAccount) => a.ministry_id === 'bible-bee')) return true;
    }

    return false;
}

// Create or update leader profile
export async function saveLeaderProfile(profileData: Omit<LeaderProfile, 'created_at' | 'updated_at'> & { created_at?: string }) {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const now = new Date().toISOString();
        
        // Normalize email and phone
        const normalizedProfile = {
            ...profileData,
            email: normalizeEmail(profileData.email),
            phone: normalizePhone(profileData.phone),
        };

        // Check for duplicate email (if provided)
        if (normalizedProfile.email) {
            const existingProfiles = await dbAdapter.listLeaderProfiles();
            const existingByEmail = existingProfiles.find(p => 
                p.email === normalizedProfile.email && p.leader_id !== normalizedProfile.leader_id
            );
            
            if (existingByEmail) {
                throw new Error(`A leader profile with email ${normalizedProfile.email} already exists`);
            }
        }

        // Check if profile exists
        const existingProfile = await dbAdapter.getLeaderProfile(normalizedProfile.leader_id);
        if (existingProfile) {
            const updatedProfile = await dbAdapter.updateLeaderProfile(normalizedProfile.leader_id, normalizedProfile);
            return updatedProfile.leader_id;
        } else {
            // Create new profile - exclude leader_id as adapter generates its own UUID
            const { leader_id, ...profileDataWithoutId } = normalizedProfile;
            const newProfile = await dbAdapter.createLeaderProfile(profileDataWithoutId);
            return newProfile.leader_id;
        }
    } else {
        // Use legacy Dexie interface for demo mode
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
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        return await dbAdapter.transaction(async () => {
            // Delete existing memberships for this leader
            const existingMemberships = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
            for (const membership of existingMemberships) {
                await dbAdapter.deleteMinistryLeaderMembership(membership.membership_id);
            }

            // Add new memberships
            if (memberships.length > 0) {
                for (const membershipData of memberships) {
                    // The membershipData already includes leader_id, just pass it to the adapter
                    await dbAdapter.createMinistryLeaderMembership(membershipData);
                }
            }

            // Update leader profile activity status
            await updateLeaderProfileStatusViaAdapter(leaderId, memberships.some(m => m.is_active));
        });
    } else {
        // Use legacy Dexie interface for demo mode
        return db.transaction('rw', [db.ministry_leader_memberships, db.leader_profiles], async () => {
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
}

// Helper function to update leader profile status via adapter
async function updateLeaderProfileStatusViaAdapter(leaderId: string, isActive: boolean) {
    const existingProfile = await dbAdapter.getLeaderProfile(leaderId);
    if (existingProfile) {
        await dbAdapter.updateLeaderProfile(leaderId, { is_active: isActive });
    }
}

// Update leader profile active status
export async function updateLeaderProfileStatus(leaderId: string, isActive: boolean) {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        await updateLeaderProfileStatusViaAdapter(leaderId, isActive);
        return leaderId;
    } else {
        // Use legacy Dexie interface for demo mode
        const now = new Date().toISOString();
        return db.leader_profiles.update(leaderId, { is_active: isActive, updated_at: now });
    }
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
    console.log('searchLeaderProfiles called with term:', searchTerm, 'shouldUseAdapter():', shouldUseAdapter());
    
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        console.log('Using Supabase adapter for leader search');
        try {
            const [allProfiles, memberships] = await Promise.all([
                dbAdapter.listLeaderProfiles(),
                dbAdapter.listMinistryLeaderMemberships()
            ]);
            
            console.log('Raw profiles for search from Supabase:', allProfiles);
            
            const profiles = allProfiles.filter(profile => {
                const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
                const email = profile.email?.toLowerCase() || '';
                
                return fullName.includes(lowerSearchTerm) || email.includes(lowerSearchTerm);
            });
            
            console.log('Filtered profiles:', profiles);
            
            // Sort by last name, then first name
            profiles.sort((a, b) => {
                const lastNameCompare = a.last_name.localeCompare(b.last_name);
                if (lastNameCompare !== 0) return lastNameCompare;
                return a.first_name.localeCompare(b.first_name);
            });
            
            // Create a map of leader_id to ministry count (only active memberships)
            const membershipCounts = memberships.reduce((acc, m) => {
                if (m.is_active) {
                    acc[m.leader_id] = (acc[m.leader_id] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);
            
            const result = profiles.map(profile => ({
                ...profile,
                ministryCount: membershipCounts[profile.leader_id] || 0,
                is_active: profile.is_active && (membershipCounts[profile.leader_id] || 0) > 0
            }));
            
            console.log('Final search results:', result);
            return result;
        } catch (error) {
            console.error('Error in Supabase leader search:', error);
            throw error;
        }
    } else {
        // Use legacy Dexie interface for demo mode
        console.log('Using Dexie for leader search');
        const profiles = await db.leader_profiles
            .filter(profile => {
                const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
                const email = profile.email?.toLowerCase() || '';
                
                return fullName.includes(lowerSearchTerm) || email.includes(lowerSearchTerm);
            })
            .toArray();
        
        // Sort by last name, then first name
        profiles.sort((a, b) => {
            const lastNameCompare = a.last_name.localeCompare(b.last_name);
            if (lastNameCompare !== 0) return lastNameCompare;
            return a.first_name.localeCompare(b.first_name);
        });
        
        // Get all memberships to calculate counts
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
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const normalizedAccount = {
            ...accountData,
            email: normalizeEmail(accountData.email) || '',
        };

        // Check for duplicate email
        const existingAccounts = await dbAdapter.listMinistryAccounts();
        const existingByEmail = existingAccounts.find(a => 
            a.email === normalizedAccount.email && a.ministry_id !== normalizedAccount.ministry_id
        );
        
        if (existingByEmail) {
            throw new Error(`A ministry account with email ${normalizedAccount.email} already exists`);
        }

        // Check if account exists
        const existingAccount = await dbAdapter.getMinistryAccount(normalizedAccount.ministry_id);
        if (existingAccount) {
            const updatedAccount = await dbAdapter.updateMinistryAccount(normalizedAccount.ministry_id, normalizedAccount);
            return updatedAccount.ministry_id;
        } else {
            const newAccount = await dbAdapter.createMinistryAccount(normalizedAccount);
            return newAccount.ministry_id;
        }
    } else {
        // Use legacy Dexie interface for demo mode
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
}

export async function updateChildPhoto(childId: string, photoDataUrl: string): Promise<number | string> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const updatedChild = await dbAdapter.updateChild(childId, { photo_url: photoDataUrl });
        return updatedChild.child_id;
    } else {
        // Use legacy Dexie interface for demo mode
        return db.children.update(childId, { photo_url: photoDataUrl });
    }
}

// Branding Settings CRUD
export async function getBrandingSettings(orgId: string = 'default'): Promise<BrandingSettings | null> {
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        const settings = await dbAdapter.listBrandingSettings();
        return settings.find(s => s.org_id === orgId) || null;
    } else {
        // Use legacy Dexie interface for demo mode
        const settings = await db.branding_settings.where({ org_id: orgId }).first();
        return settings || null;
    }
}

export async function saveBrandingSettings(
    orgId: string = 'default', 
    settings: Omit<BrandingSettings, 'setting_id' | 'org_id' | 'created_at' | 'updated_at'>
): Promise<string> {
    const now = new Date().toISOString();
    const existingSettings = await getBrandingSettings(orgId);
    
    if (shouldUseAdapter()) {
        // Use Supabase adapter for live mode
        if (existingSettings) {
            // Update existing settings
            const updatedSettings = await dbAdapter.updateBrandingSettings(existingSettings.setting_id, {
                ...settings,
            });
            return updatedSettings.setting_id;
        } else {
            // Create new settings
            const newSettings = await dbAdapter.createBrandingSettings({
                org_id: orgId,
                ...settings,
            });
            return newSettings.setting_id;
        }
    } else {
        // Use legacy Dexie interface for demo mode
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
}

export async function getDefaultBrandingSettings(): Promise<Partial<BrandingSettings>> {
    return {
        app_name: 'gatherKids',
    description: "The simple, secure, and smart way to manage your children&apos;s ministry. Streamline check-ins, track attendance, and keep your community connected.",
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

// Avatar Management Functions
import { AvatarService } from './avatar/avatar-service';

/**
 * Get avatar URL for a child
 */
export async function getChildAvatarUrl(
	childId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('children', childId);
}

/**
 * Get avatar URL for a guardian
 */
export async function getGuardianAvatarUrl(
	guardianId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('guardians', guardianId);
}

/**
 * Get avatar URL for a leader
 */
export async function getLeaderAvatarUrl(
	leaderId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('leaders', leaderId);
}

// === NEW: User Profile Management Functions ===

export interface ActiveProfileTarget {
	target_table: 'ministry_leaders' | 'households';
	target_id: string;
}

/**
 * Determine which profile table to update for a user.
 * Priority: ministry_leaders > households (if both exist).
 * Returns the target table and ID for profile updates.
 */
export async function getActiveProfileTarget(user_id: string): Promise<ActiveProfileTarget | null> {
	try {
		// First check if user has a ministry leader profile
		const leaderProfiles = await db.leader_profiles.toArray();
		const leaderProfile = leaderProfiles.find(profile => 
			profile.leader_id === user_id || 
			profile.email === user_id // In case user_id is actually an email
		);
		
		if (leaderProfile) {
			return {
				target_table: 'ministry_leaders',
				target_id: leaderProfile.leader_id
			};
		}

		// Check for household association through user_households or guardians
		const userHouseholds = await db.user_households?.where({ auth_user_id: user_id }).toArray() || [];
		if (userHouseholds.length > 0) {
			return {
				target_table: 'households',
				target_id: userHouseholds[0].household_id
			};
		}

		// Fallback: check guardians table for email match
		const guardians = await db.guardians.toArray();
		const guardian = guardians.find(g => g.email === user_id);
		if (guardian) {
			return {
				target_table: 'households',
				target_id: guardian.household_id
			};
		}

		return null;
	} catch (error) {
		console.error('Error determining active profile target:', error);
		return null;
	}
}

/**
 * Get merged profile data from both auth and domain tables
 */
export async function getMeProfile(user_id: string, auth_email?: string) {
	const target = await getActiveProfileTarget(user_id);
	if (!target) return null;

	try {
		if (target.target_table === 'ministry_leaders') {
			const profile = await db.leader_profiles.get(target.target_id);
			return {
				target_table: target.target_table,
				target_id: target.target_id,
				first_name: profile?.first_name,
				last_name: profile?.last_name,
				email: auth_email || profile?.email, // Prefer auth email
				phone: profile?.phone,
				photo_url: profile?.photo_url,
				avatar_path: profile?.avatar_path,
			};
		} else {
			const household = await db.households.get(target.target_id);
			return {
				target_table: target.target_table,
				target_id: target.target_id,
				email: auth_email || household?.primary_email, // Prefer auth email
				phone: household?.primary_phone,
				photo_url: household?.photo_url,
				avatar_path: household?.avatar_path,
			};
		}
	} catch (error) {
		console.error('Error getting profile data:', error);
		return null;
	}
}

/**
 * Save profile data to the appropriate domain table
 */
export async function saveProfile(user_id: string, profileData: { 
	email?: string;
	phone?: string;
	photoPath?: string;
}) {
	const target = await getActiveProfileTarget(user_id);
	if (!target) {
		throw new Error('No profile target found for user');
	}

	const now = new Date().toISOString();

	try {
		if (target.target_table === 'ministry_leaders') {
			const updateData: Partial<LeaderProfile> = {
				updated_at: now
			};
			
			if (profileData.email !== undefined) updateData.email = profileData.email.toLowerCase();
			if (profileData.phone !== undefined) updateData.phone = normalizePhone(profileData.phone);
			if (profileData.photoPath !== undefined) {
				updateData.photo_url = profileData.photoPath;
				updateData.avatar_path = profileData.photoPath;
			}

			await db.leader_profiles.update(target.target_id, updateData);
		} else {
			const updateData: Partial<Household> = {
				updated_at: now
			};
			
			if (profileData.email !== undefined) updateData.primary_email = profileData.email.toLowerCase();
			if (profileData.phone !== undefined) updateData.primary_phone = normalizePhone(profileData.phone);
			if (profileData.photoPath !== undefined) {
				updateData.photo_url = profileData.photoPath;
				updateData.avatar_path = profileData.photoPath;
			}

			await db.households.update(target.target_id, updateData);
		}
	} catch (error) {
		console.error('Error saving profile:', error);
		throw error;
	}
}

/**
 * Get child profile data including avatar
 */
export async function getChildWithAvatar(childId: string) {
	const child = await db.children.get(childId);
	if (!child) return null;

	const avatarUrl = await getChildAvatarUrl(childId);

	return {
		...child,
		avatarUrl,
	};
}

// === NEW: Dashboard Data Functions ===

/**
 * Get unacknowledged incidents for dashboard
 */
export async function getUnacknowledgedIncidents(): Promise<Incident[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const incidents = await dbAdapter.listIncidents();
		return incidents.filter(incident => !incident.admin_acknowledged_at);
	} else {
		// Use legacy Dexie interface for demo mode
		return db.incidents.filter(incident => !incident.admin_acknowledged_at).toArray();
	}
}

/**
 * Get checked-in children count for a specific date
 */
export async function getCheckedInCount(dateISO: string): Promise<number> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const attendance = await dbAdapter.listAttendance({ date: dateISO });
		console.log(`DEBUG: Total attendance records for ${dateISO}:`, attendance.length);
		const checkedIn = attendance.filter(a => !a.check_out_at);
		console.log(`DEBUG: Checked-in records (no check_out_at):`, checkedIn.length);
		console.log(`DEBUG: Sample attendance records:`, attendance.slice(0, 3).map(a => ({
			id: a.attendance_id,
			child_id: a.child_id,
			check_in_at: a.check_in_at,
			check_out_at: a.check_out_at
		})));
		return checkedIn.length;
	} else {
		// Use legacy Dexie interface for demo mode
		try {
			return await db.attendance
				.where({ date: dateISO })
				.filter((a) => !a.check_out_at)
				.count();
		} catch (error) {
			console.warn('Error getting checked-in count:', error);
			return 0;
		}
	}
}

/**
 * Get registration statistics for dashboard
 */
export async function getRegistrationStats(): Promise<{ householdCount: number; childCount: number }> {
	try {
		if (shouldUseAdapter()) {
			// Use Supabase adapter for live mode
			// Get the active registration cycle
			const cycles = await dbAdapter.listRegistrationCycles();
			const activeCycle = cycles.find(cycle => cycle.is_active === true || Number(cycle.is_active) === 1);
			
			if (!activeCycle) {
				return { householdCount: 0, childCount: 0 };
			}
			
			const registrations = await dbAdapter.listRegistrations({ cycleId: activeCycle.cycle_id });
			
			if (registrations.length === 0) {
				return { householdCount: 0, childCount: 0 };
			}
			
			const childIds = registrations.map(r => r.child_id);
			const children = await dbAdapter.listChildren();
			const relevantChildren = children.filter(c => childIds.includes(c.child_id));
			const householdIds = new Set(relevantChildren.map(c => c.household_id));
			
			return {
				householdCount: householdIds.size,
				childCount: registrations.length,
			};
		} else {
			// Use legacy Dexie interface for demo mode
			try {
                const activeCycle = await db.registration_cycles
                    .filter((cycle: { is_active?: boolean | number | string }) => cycle.is_active === true || Number((cycle.is_active as unknown) ?? 0) === 1)
                    .first();
				
				if (!activeCycle) {
					return { householdCount: 0, childCount: 0 };
				}
				
				const registrations = await db.registrations
					.where({ cycle_id: activeCycle.cycle_id })
					.toArray();
					
				if (registrations.length === 0) {
					return { householdCount: 0, childCount: 0 };
				}
				
                const childIds = registrations.map((r: Registration) => r.child_id);
                const children = await db.children
                    .where('child_id')
                    .anyOf(childIds)
                    .toArray();
                const householdIds = new Set(children.map((c: Child) => c.household_id));
				
				return {
					householdCount: householdIds.size,
					childCount: registrations.length,
				};
			} catch (dexieError) {
				console.warn('Error fetching registration stats in demo mode:', dexieError);
				return { householdCount: 0, childCount: 0 };
			}
		}
	} catch (error) {
		console.warn('Error fetching registration stats:', error);
		return { householdCount: 0, childCount: 0 };
	}
}

/**
 * Get Bible Bee years for ministry management
 */
export async function getBibleBeeYears(): Promise<BibleBeeYear[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listBibleBeeYears();
	} else {
		// Use legacy Dexie interface for demo mode
		return db.bible_bee_years.toArray();
	}
}

/**
 * Get scriptures for a Bible Bee year
 */
export async function getScripturesForBibleBeeYear(yearId: string): Promise<Scripture[]> {
	if (shouldUseAdapter()) {
		// In Supabase mode, scriptures may not be available yet
		// Return empty array for now, can be enhanced later when scripture schema is added
		console.log('Scripture loading not yet implemented in Supabase mode');
		return [];
	} else {
		// Use legacy Dexie interface for demo mode
        if (db && 'scriptures' in db) {
            // scriptures is an optional legacy table; cast carefully to avoid `any` leaking out
            const tbl = (db as unknown as { scriptures?: { where: (k: string) => { equals: (v: string) => { toArray: () => Scripture[] } } } }).scriptures;
            return (tbl?.where('year_id')?.equals(yearId)?.toArray()) || [];
        }
		return [];
	}
}

/**
 * Get scriptures for a competition year (legacy)
 */
export async function getScripturesForCompetitionYear(competitionYearId: string): Promise<Scripture[]> {
	if (shouldUseAdapter()) {
		// In Supabase mode, legacy competition year scriptures are not available
		return [];
	} else {
		// Use legacy Dexie interface for demo mode
        if (db && 'scriptures' in db) {
            const tbl = (db as unknown as { scriptures?: { where: (k: string) => { equals: (v: string) => { toArray: () => Scripture[] } } } }).scriptures;
            return (tbl?.where('competitionYearId')?.equals(competitionYearId)?.toArray()) || [];
        }
		return [];
	}
}

/**
 * Get ministries for ministry management
 */
export async function getMinistries(isActive?: boolean): Promise<Ministry[]> {
	console.log('DAL.getMinistries: Starting', { isActive, useAdapter: shouldUseAdapter() });
	try {
		if (shouldUseAdapter()) {
			// Use Supabase adapter for live mode
			console.log('DAL.getMinistries: Using Supabase adapter');
			const ministries = await dbAdapter.listMinistries(isActive);
			console.log('DAL.getMinistries: Got ministries from Supabase', { count: ministries.length });
			return ministries;
		} else {
			// Use legacy Dexie interface for demo mode
			console.log('DAL.getMinistries: Using Dexie interface for demo mode');
			if (isActive !== undefined) {
				const ministries = await db.ministries.filter(m => m.is_active === isActive).toArray();
				console.log('DAL.getMinistries: Got filtered ministries from Dexie', { count: ministries.length });
				return ministries;
			}
			const ministries = await db.ministries.toArray();
			console.log('DAL.getMinistries: Got all ministries from Dexie', { count: ministries.length });
			return ministries;
		}
	} catch (error) {
		console.error('DAL.getMinistries: Error getting ministries', error);
		throw error;
	}
}

export async function getRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listRegistrationCycles(isActive);
	} else {
		// Use legacy Dexie interface for demo mode
            if (isActive !== undefined) {
            return db.registration_cycles.filter(c => {
                // c may be a loose record in Dexie; access is_active defensively
                const activeVal = (c as unknown as Record<string, unknown>)?.['is_active'];
                return isActiveValue(activeVal) === isActive;
            }).toArray();
        }
		return db.registration_cycles.toArray();
	}
}

/**
 * Get all children for check-in/out management
 */
export async function getAllChildren(): Promise<Child[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listChildren();
	} else {
		// Use legacy Dexie interface for demo mode
		return db.children.toArray();
	}
}

/**
 * Get attendance records for a specific date
 */
export async function getAttendanceForDate(dateISO: string): Promise<Attendance[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listAttendance({ date: dateISO });
	} else {
		// Use legacy Dexie interface for demo mode
		return db.attendance.where({ date: dateISO }).toArray();
	}
}

/**
 * Get all ministry enrollments for a specific cycle
 */
export async function getMinistryEnrollmentsByCycle(cycleId: string): Promise<MinistryEnrollment[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listMinistryEnrollments(undefined, undefined, cycleId);
	} else {
		// Use legacy Dexie interface for demo mode
		return db.ministry_enrollments.where({ cycle_id: cycleId }).toArray();
	}
}

/**
 * Get children for ministry leader based on their assigned ministries
 */
export async function getChildrenForLeader(assignedMinistryIds: string[], cycleId: string): Promise<Child[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const enrollments = await dbAdapter.listMinistryEnrollments();
		const filteredEnrollments = enrollments.filter(e => 
			assignedMinistryIds.includes(e.ministry_id) && e.cycle_id === cycleId
		);
		const childIds = [...new Set(filteredEnrollments.map(e => e.child_id))];
		if (childIds.length === 0) return [];
		
		const allChildren = await dbAdapter.listChildren();
		return allChildren.filter(c => childIds.includes(c.child_id));
	} else {
		// Use legacy Dexie interface for demo mode
		const enrollments = await db.ministry_enrollments
			.where('ministry_id')
			.anyOf(assignedMinistryIds)
			.and(e => e.cycle_id === cycleId)
			.toArray();
		const childIds = [...new Set(enrollments.map(e => e.child_id))];
		if (childIds.length === 0) return [];
		return db.children.where('child_id').anyOf(childIds).toArray();
	}
}

/**
 * Get incidents for a specific date
 */
export async function getIncidentsForDate(dateISO: string): Promise<Incident[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const incidents = await dbAdapter.listIncidents();
		return incidents.filter(i => i.timestamp.startsWith(dateISO));
	} else {
		// Use legacy Dexie interface for demo mode
		return db.incidents.filter(i => i.timestamp.startsWith(dateISO)).toArray();
	}
}

/**
 * Get all guardians
 */
export async function getAllGuardians(): Promise<Guardian[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listAllGuardians();
	} else {
		// Use legacy Dexie interface for demo mode
		return db.guardians.toArray();
	}
}

/**
 * Get all households
 */
export async function getAllHouseholds(): Promise<Household[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listHouseholds();
	} else {
		// Use legacy Dexie interface for demo mode
		return db.households.toArray();
	}
}

/**
 * Get all emergency contacts
 */
export async function getAllEmergencyContacts(): Promise<EmergencyContact[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		return dbAdapter.listAllEmergencyContacts();
	} else {
		// Use legacy Dexie interface for demo mode
		return db.emergency_contacts.toArray();
	}
}

/**
 * Get incidents for a user based on their role
 */
export async function getIncidentsForUser(user: unknown): Promise<Incident[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const allIncidents = await dbAdapter.listIncidents();
		
    if (isMinistryLeaderUser(user)) {
            // Always restrict leaders to incidents they logged
            const leaderId = extractUserId(user) as string | undefined;
            if (!leaderId) return [];
            return allIncidents.filter(incident => incident.leader_id === leaderId);
        }
		
		return allIncidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	} else {
		// Use legacy Dexie interface for demo mode
    if (isMinistryLeaderUser(user)) {
            // Always restrict leaders to incidents they logged
            const leaderId = extractUserId(user) as string | undefined;
            if (!leaderId) return [];
            return db.incidents
                .where('leader_id')
                .equals(leaderId)
                .reverse()
                .sortBy('timestamp');
        }
		
		return db.incidents.orderBy('timestamp').reverse().toArray();
	}
}

/**
 * Get checked-in children for a specific date
 */
export async function getCheckedInChildren(dateISO: string): Promise<Child[]> {
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		const attendance = await dbAdapter.listAttendance({ date: dateISO });
		const checkedInAttendance = attendance.filter(a => !a.check_out_at);
		const childIds = checkedInAttendance.map(a => a.child_id);
		
		if (childIds.length === 0) return [];
		
		const allChildren = await dbAdapter.listChildren();
		return allChildren.filter(c => childIds.includes(c.child_id));
	} else {
		// Use legacy Dexie interface for demo mode
		const attendance = await db.attendance.where({ date: dateISO }).toArray();
		const checkedInAttendance = attendance.filter(a => !a.check_out_at);
		const childIds = checkedInAttendance.map(a => a.child_id);
		
		if (childIds.length === 0) return [];
		
		return db.children.where('child_id').anyOf(childIds).toArray();
	}
}

/**
 * Get all competition years for Bible Bee
 */
export async function getCompetitionYears(): Promise<CompetitionYear[]> {
	// Note: Competition years are legacy - in new Bible Bee system, use getBibleBeeYears()
	// This function is maintained for backward compatibility
	if (shouldUseAdapter()) {
		// Use Supabase adapter for live mode
		// Competition years might not exist in the new schema, return empty array or fetch from appropriate table
        try {
            // If competition years exist in adapter
            // return await dbAdapter.listCompetitionYears();
            console.warn('Competition years not implemented in adapter, using legacy mode');
            return [] as CompetitionYear[];
        } catch (error) {
            console.warn('Competition years not available in adapter mode');
            return [] as CompetitionYear[];
        }
    } else {
        // Use legacy Dexie interface for demo mode
    // Keep compatibility shape and return typed CompetitionYear[] from legacy DB
    return (await db.competitionYears.orderBy('year').reverse().toArray()) as CompetitionYear[];
    }
}

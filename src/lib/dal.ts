/**
 * DAL — thin facade
 *
 * This file is the public entry-point for `@/lib/dal` imports.  All
 * Supabase-backed implementations live in the domain modules under `./dal/`.
 * This file re-exports everything from those modules and retains a small set
 * of legacy Dexie-backed helpers that are still exercised by existing tests
 * (mocked via `jest.mock('@/lib/db')`).
 *
 * Dexie-only legacy functions kept here (for backward-compat / tests):
 *   - querySundaySchoolRoster
 *   - queryRostersForMinistry
 *   - queryDashboardMetrics
 *   - isEligibleForChoir
 *   - isWithinWindow
 *   - queryLeaders
 *   - getLeaderProfile  (old Dexie shape)
 *   - getLeaderBibleBeeProgress
 *   - exportEmergencySnapshotCSV
 *   - saveLeaderAssignments (no-op stub in Supabase mode)
 *
 * These should be removed once their callers / tests are migrated or deleted
 * (tracked as MAINT-06 dead-code removal).
 */

// ---------------------------------------------------------------------------
// Imports (must come before export statements)
// ---------------------------------------------------------------------------

import { db } from './db';
import { db as _dbAdapter } from './database/factory';
import { gradeToCode, normalizeGradeDisplay } from './gradeUtils';
import { getApplicableGradeRule } from './bibleBee';
import { AuthRole } from './auth-types';
import { formatPhone } from '@/hooks/usePhoneFormat';
import type {
    Child,
    Guardian,
    MinistryEnrollment,
    LeaderAssignment,
} from './types';
import { isAfter, isBefore, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Re-export the full Supabase-backed DAL surface (Supabase domain modules)
// ---------------------------------------------------------------------------
export * from './dal/index';

// ---------------------------------------------------------------------------
// Backward-compat re-exports
// ---------------------------------------------------------------------------

/** The Supabase adapter instance — exported for backward compat with tests. */
export { db as dbAdapter } from './database/factory';

/** Canonical registration function (for tests that import registerHouseholdCanonical). */
export { registerHouseholdCanonical } from './database/canonical-dal';

/**
 * @deprecated Demo mode was removed in Wave 3 (issue #191).
 * Always returns `true`.  Will be deleted in a future cleanup pass (MAINT-06).
 */
export function shouldUseAdapter(): boolean {
    return true;
}

// ---------------------------------------------------------------------------
// Legacy Dexie-only helpers
// (kept for backward compatibility with tests that mock '@/lib/db')
// ---------------------------------------------------------------------------

/** @internal Used only by the legacy Dexie helpers below. */
function _getTodayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
}

/** @internal Used only by the legacy Dexie helpers below. */
function _ageOn(dateISO: string, dobISO?: string): number | null {
    if (!dobISO) return null;
    const date = parseISO(dateISO);
    const dob = parseISO(dobISO);
    if (isNaN(date.getTime()) || isNaN(dob.getTime())) return null;
    const diff = date.getFullYear() - dob.getFullYear();
    const m = date.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && date.getDate() < dob.getDate())) {
        return diff - 1;
    }
    return diff;
}

/**
 * @deprecated Dexie-only eligibility check.
 */
export async function isEligibleForChoir(ministryId: string, childId: string): Promise<boolean> {
    const ministry = await db.ministries.get(ministryId);
    const child = await db.children.get(childId);
    if (!ministry || !child || !child.dob) return false;

    const childAge = _ageOn(_getTodayIsoDate(), child.dob);
    if (childAge === null) return false;

    const minAge = ministry.min_age ?? 0;
    const maxAge = ministry.max_age ?? 99;

    return childAge >= minAge && childAge <= maxAge;
}

/**
 * @deprecated Dexie-only window check.
 */
export async function isWithinWindow(ministryId: string, todayISO: string): Promise<boolean> {
    const ministry = await db.ministries.get(ministryId);
    if (!ministry) return false;
    const today = parseISO(todayISO);

    const isOpen = ministry.open_at ? isAfter(today, parseISO(ministry.open_at)) : true;
    const isClosed = ministry.close_at ? isBefore(today, parseISO(ministry.close_at)) : true;

    return isOpen && isClosed;
}

/**
 * @deprecated Dexie-only Sunday School roster query.
 */
export async function querySundaySchoolRoster(dateISO: string, timeslotId?: string) {
    let query = db.attendance.where({ date: dateISO, event_id: 'evt_sunday_school' });
    if (timeslotId) {
        query = query.and(a => a.timeslot_id === timeslotId);
    }
    const attendanceRecords = await query.toArray();
    const childIds = attendanceRecords.map(a => a.child_id);
    return db.children.where('child_id').anyOf(childIds).toArray();
}

/**
 * @deprecated Dexie-only ministry roster query.
 */
export async function queryRostersForMinistry(ministryId: string, cycleId: string) {
    const enrollments = await db.ministry_enrollments
        .where({ ministry_id: ministryId, cycle_id: cycleId })
        .toArray();
    const childIds = enrollments.map(e => e.child_id);

    const children = await db.children.where('child_id').anyOf(childIds).toArray();
    const childProfiles = await db.child_year_profiles
        .where('[child_id+cycle_id]')
        .anyOf(childIds.map(cid => [cid, cycleId]))
        .toArray();

    const profileMap = new Map(childProfiles.map(p => [p.child_id, p]));

    return children.map(child => ({
        ...child,
        profile: profileMap.get(child.child_id),
    }));
}

/**
 * @deprecated Dexie-only dashboard metrics query.
 */
export async function queryDashboardMetrics(cycleId: string) {
    const totalRegistrations = await db.registrations.where({ cycle_id: cycleId }).count();
    const activeRegistrations = await db.registrations
        .where({ cycle_id: cycleId, status: 'active' })
        .toArray();

    const completionPct =
        totalRegistrations > 0
            ? Math.round((activeRegistrations.length / totalRegistrations) * 100)
            : 0;

    let missingConsentsCount = 0;
    for (const reg of activeRegistrations) {
        const hasLiability = reg.consents.some(c => c.type === 'liability' && c.accepted_at);
        const hasPhoto = reg.consents.some(c => c.type === 'photoRelease' && c.accepted_at);
        if (!hasLiability || !hasPhoto) {
            missingConsentsCount++;
        }
    }

    const choirMinistry = await db.ministries.get('min_choir_kids');
    const choirEnrollments = await db.ministry_enrollments
        .where({ ministry_id: 'min_choir_kids', cycle_id: cycleId })
        .toArray();
    const choirChildIds = choirEnrollments.map(e => e.child_id);
    const choirChildren = await db.children.where('child_id').anyOf(choirChildIds).toArray();

    const choirEligibilityWarnings: {
        child_id: string;
        child_name: string;
        ministry_id: string;
        reason: string;
    }[] = [];
    for (const child of choirChildren) {
        if (!child.dob) continue;
        const age = _ageOn(_getTodayIsoDate(), child.dob);
        if (age === null) continue;

        if (age < (choirMinistry?.min_age ?? 7) || age > (choirMinistry?.max_age ?? 12)) {
            choirEligibilityWarnings.push({
                child_id: child.child_id,
                child_name: `${child.first_name} ${child.last_name}`,
                ministry_id: 'min_choir_kids',
                reason: `Age ${age} is outside range (${choirMinistry?.min_age}-${choirMinistry?.max_age})`,
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

/**
 * @deprecated Dexie-only leader query (legacy user table shape).
 */
export async function queryLeaders() {
    const leaders = await db.users.where('role').equals(AuthRole.MINISTRY_LEADER).sortBy('name');
    const leaderIds = leaders.map(l => l.user_id);
    const assignments = await db.leader_assignments
        .where('leader_id')
        .anyOf(leaderIds)
        .and(a => a.cycle_id === '2025')
        .toArray();
    const ministries = await db.ministries.toArray();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m.name]));

    return leaders.map(leader => {
        const leaderAssignments = assignments
            .filter(a => a.leader_id === leader.user_id)
            .map(a => ({
                ...a,
                ministryName: ministryMap.get(a.ministry_id) || 'Unknown Ministry',
            }));

        const isActive = leader.is_active && leaderAssignments.length > 0;

        return { ...leader, is_active: isActive, assignments: leaderAssignments };
    });
}

/**
 * @deprecated Dexie-only leader profile getter (old shape with user + assignments).
 * Use queryLeaderProfiles / getLeaderProfileWithMemberships for Supabase data.
 */
export async function getLeaderProfile(leaderId: string, cycleId: string) {
    const leader = await db.users.get(leaderId);
    const assignments = await db.leader_assignments
        .where({ leader_id: leaderId, cycle_id: cycleId })
        .toArray();

    const allMinistriesRaw = await db.ministries.toArray();
    const allMinistries = allMinistriesRaw
        .filter(m => m.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));

    return { leader, assignments, allMinistries };
}

/**
 * @deprecated Dexie-only Bible Bee progress for a ministry leader.
 * Use getBibleBeeProgressForCycle (re-exported above) for Supabase data.
 */
export async function getLeaderBibleBeeProgress(leaderId: string, cycleId: string) {
    // getLeaderAssignmentsForCycle is Supabase-backed via the re-exported leaders module.
    const { getLeaderAssignmentsForCycle } = await import('./dal/leaders');
    const assignments = await getLeaderAssignmentsForCycle(leaderId, cycleId);
    const ministryIds = assignments.map(a => a.ministry_id);
    if (ministryIds.length === 0) return [];

    const enrollments = await db.ministry_enrollments
        .where('ministry_id')
        .anyOf(ministryIds)
        .and(e => e.cycle_id === cycleId)
        .toArray();
    const childIds = [...new Set(enrollments.map(e => e.child_id))];
    if (childIds.length === 0) return [];

    const children = await db.children.where('child_id').anyOf(childIds).toArray();

    const yearNum = Number(cycleId);
    const compYear = await db.competitionYears.where('year').equals(yearNum).first();

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
    const allEnrollmentsForChildren = await db.ministry_enrollments
        .where('child_id')
        .anyOf(childIds)
        .and((e: MinistryEnrollment) => e.cycle_id === cycleId)
        .toArray();
    const ministryList = await db.ministries.toArray();
    const ministryMap = new Map(ministryList.map(m => [m.ministry_id, m]));

    const householdIds = children.map(c => c.household_id).filter(Boolean);
    const allGuardians = householdIds.length
        ? await db.guardians.where('household_id').anyOf(householdIds).toArray()
        : [];
    const guardianMap = new Map<string, Guardian[]>();
    for (const g of allGuardians) {
        if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
        guardianMap.get(g.household_id)!.push(g);
    }

    for (const child of children) {
        let scriptures: unknown[] = [];
        let essays: Array<{ status?: string }> = [];
        if (compYear) {
            const compId = (compYear as { id?: string })?.id;
            scriptures = await db.studentScriptures
                .where({ childId: child.child_id, competitionYearId: compId })
                .toArray();
            essays = await db.studentEssays
                .where({ childId: child.child_id, competitionYearId: compId })
                .toArray();
        }

        const totalScriptures = scriptures.length;
        const completedScriptures = scriptures
            .filter(
                (s): s is { status?: string; counts_for?: number } =>
                    typeof (s as unknown as { status?: unknown })?.status === 'string',
            )
            .filter(s => s.status === 'completed')
            .reduce((sum: number, s) => sum + (s.counts_for || 1), 0);
        const essayStatus =
            essays.length
                ? typeof (essays[0] as unknown as { status?: unknown })?.status === 'string'
                    ? (essays[0] as { status?: string }).status || 'none'
                    : 'none'
                : 'none';

        const childEnrolls = allEnrollmentsForChildren
            .filter(e => e.child_id === child.child_id)
            .map(e => ({ ...e, ministryName: ministryMap.get(e.ministry_id)?.name || 'Unknown' }));

        let primaryGuardian: Guardian | null = null;
        const guardiansForHouse: Guardian[] = guardianMap.get(child.household_id) || [];
        primaryGuardian =
            guardiansForHouse.find((g: Guardian) => g.is_primary) ||
            guardiansForHouse[0] ||
            null;

        let requiredScriptures: number | null = null;
        let gradeGroup: string | null = null;
        try {
            const gradeNum = child.grade ? gradeToCode(child.grade) : null;
            const rule =
                gradeNum !== null && compYear
                    ? await getApplicableGradeRule(
                          (compYear as { id?: string }).id || '',
                          gradeNum,
                      )
                    : null;
            requiredScriptures = rule?.targetCount ?? null;
            if (rule) {
                if (rule.minGrade === rule.maxGrade) gradeGroup = `Grade ${rule.minGrade}`;
                else gradeGroup = `Grades ${rule.minGrade}-${rule.maxGrade}`;
            }
        } catch {
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

    return results.sort((a, b) => a.childName.localeCompare(b.childName));
}

/**
 * @deprecated Dexie-only emergency snapshot CSV export.
 */
export async function exportEmergencySnapshotCSV(dateISO: string): Promise<Blob> {
    const roster = await querySundaySchoolRoster(dateISO);
    const householdIds = roster.map(r => r.household_id);

    const guardians = await db.guardians
        .where('household_id')
        .anyOf(householdIds)
        .and(g => g.is_primary)
        .toArray();
    const contacts = await db.emergency_contacts
        .where('household_id')
        .anyOf(householdIds)
        .toArray();

    const guardianMap = new Map(guardians.map(g => [g.household_id, g]));
    const contactMap = new Map(contacts.map(c => [c.household_id, c]));

    const exportData = roster.map(child => ({
        child_name: `${child.first_name} ${child.last_name}`,
        dob: child.dob,
        grade: normalizeGradeDisplay(child.grade),
        allergies: child.allergies,
        medical_notes: child.medical_notes,
        primary_guardian:
            (guardianMap.get(child.household_id)?.first_name || '') +
            ' ' +
            (guardianMap.get(child.household_id)?.last_name || ''),
        guardian_phone: guardianMap.get(child.household_id)?.mobile_phone
            ? formatPhone(guardianMap.get(child.household_id)!.mobile_phone!)
            : 'N/A',
        emergency_contact:
            (contactMap.get(child.household_id)?.first_name || '') +
            ' ' +
            (contactMap.get(child.household_id)?.last_name || ''),
        emergency_phone: contactMap.get(child.household_id)?.mobile_phone
            ? formatPhone(contactMap.get(child.household_id)!.mobile_phone!)
            : 'N/A',
    }));

    const csv = _convertToCSV(exportData as Record<string, unknown>[]);
    const BOM = '\uFEFF';
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * @deprecated No-op stub.  Leader assignments are now managed via
 * saveLeaderMemberships in the new DAL (re-exported from './dal/leaders').
 */
export async function saveLeaderAssignments(
    _leaderId: string,
    _cycleId: string,
    _newAssignments: Omit<LeaderAssignment, 'assignment_id'>[],
): Promise<void> {
    console.log('saveLeaderAssignments: no-op in Supabase mode — use saveLeaderMemberships');
}

// ---------------------------------------------------------------------------
// Internal CSV helper (only used by exportEmergencySnapshotCSV above)
// ---------------------------------------------------------------------------

function _convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);

    const escapeCSVValue = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const csvRows = [
        headers.map(escapeCSVValue).join(','),
        ...data.map(row =>
            headers.map(fieldName => escapeCSVValue(row[fieldName] ?? '')).join(','),
        ),
    ];
    return csvRows.join('\r\n');
}

// Suppress unused-variable warning for _dbAdapter (imported for side-effects
// of the factory module, which wires up the Supabase connection).
void _dbAdapter;

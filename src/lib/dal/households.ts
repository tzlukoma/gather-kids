/**
 * DAL — Households domain
 *
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type {
    Child,
    EmergencyContact,
    Guardian,
    Household,
    MinistryEnrollment,
} from '../types';
import { ageOn } from './utils';
import { getPriorRegistrationCycle, getCurrentRegistrationCycle, requireActiveRegistrationCycle } from './ministries';
import { householdIdsForCycle } from './cycle-scoping';
import { pickActiveRegistrationCycle } from './registration-cycle-utils';
import {
    applyReturningGradePrefill,
    buildGradeHintForChild,
    stripChoirSelections,
    type HouseholdPrefillGradeHint,
} from './household-prefill-utils';
import {
    canonicalizeGradeForStorage,
} from '../gradeUtils';

export type { HouseholdPrefillGradeHint } from './household-prefill-utils';

export type HouseholdRegistrationLoadResult = {
    isCurrentYear: boolean;
    isReturningPrefill: boolean;
    sourceCycleId: string;
    existingChildIds: string[];
    gradeHintsByChildId: Record<string, HouseholdPrefillGradeHint>;
    data: Awaited<ReturnType<typeof fetchFullHouseholdDataFromAdapter>>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** True when every active child has a registration row for the given cycle. */
async function householdHasActiveCycleRegistration(
    householdId: string,
    cycleId: string,
): Promise<boolean> {
    const activeChildren = await dbAdapter.listChildren({ householdId, isActive: true });
    const childIds = activeChildren.map(c => c.child_id);
    if (childIds.length === 0) {
        return false;
    }

    const registrations = await dbAdapter.listRegistrations({ cycleId });
    const registeredChildIds = new Set(
        registrations
            .filter(r => childIds.includes(r.child_id))
            .map(r => r.child_id),
    );

    return childIds.every(id => registeredChildIds.has(id));
}

function stripChoirSelectionsFromChild<
    T extends { ministrySelections?: Record<string, boolean | undefined> },
>(child: T): T {
    return stripChoirSelections(child);
}

/**
 * Fetch the full household profile from the Supabase adapter.
 * Returns a registration-form-compatible shape with ministry selections.
 */
export async function fetchFullHouseholdDataFromAdapter(
    householdId: string,
    cycleId: string,
    options?: { stripChoirSelections?: boolean },
) {
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
        const ce = childEnrollments.filter(e => e.child_id === child.child_id);
        const ministrySelections: Record<string, boolean | undefined> = {};
        const interestSelections: Record<string, boolean | undefined> = {};
        let customData: Record<string, unknown> = {};

        ce.forEach(enrollment => {
            const ministry = ministryMap.get(enrollment.ministry_id);
            if (!ministry) return;

            if (enrollment.status === 'enrolled') {
                ministrySelections[ministry.code] = true;
                if (enrollment.custom_fields) {
                    customData = { ...customData, ...enrollment.custom_fields as Record<string, unknown> };
                }
            } else if (enrollment.status === 'expressed_interest') {
                interestSelections[ministry.code] = true;
            }
        });

        return { ...child, ministrySelections, interestSelections, customData };
    });

    const normalizedChildren = options?.stripChoirSelections
        ? childrenWithSelections.map(stripChoirSelectionsFromChild)
        : childrenWithSelections;

    return {
        household,
        guardians,
        emergencyContact,
        children: normalizedChildren,
        consents: { liability: false, photoRelease: false },
    };
}

/**
 * Login-first household load for `/register`.
 * Uses `user_households` — never scans all guardians by email.
 */
export async function loadHouseholdForRegistration(
    authUserId: string,
    currentCycleId: string,
): Promise<HouseholdRegistrationLoadResult | null> {
    const householdId = await getHouseholdForUser(authUserId);
    if (!householdId) return null;

    const activeChildren = await dbAdapter.listChildren({ householdId, isActive: true });
    if (activeChildren.length === 0) return null;

    const childIds = activeChildren.map(c => c.child_id);
    const hasCurrentCycleRegistration = await householdHasActiveCycleRegistration(
        householdId,
        currentCycleId,
    );

    if (hasCurrentCycleRegistration) {
        const data = await fetchFullHouseholdDataFromAdapter(householdId, currentCycleId);
        return {
            isCurrentYear: true,
            isReturningPrefill: false,
            sourceCycleId: currentCycleId,
            existingChildIds: childIds,
            gradeHintsByChildId: {},
            data,
        };
    }

    const priorCycle = await getPriorRegistrationCycle(currentCycleId);
    if (!priorCycle) return null;

    const priorEnrollments = await dbAdapter.listMinistryEnrollments(
        undefined,
        undefined,
        priorCycle.cycle_id,
    );
    const hasPriorEnrollment = priorEnrollments.some(e => childIds.includes(e.child_id));
    if (!hasPriorEnrollment) return null;

    const data = await fetchFullHouseholdDataFromAdapter(householdId, priorCycle.cycle_id, {
        stripChoirSelections: true,
    });

    const gradeHintsByChildId: Record<string, HouseholdPrefillGradeHint> = {};
    const childrenWithSuggestedGrades = data.children.map(child => {
        const hint = buildGradeHintForChild(child);
        if (hint && child.child_id) {
            gradeHintsByChildId[child.child_id] = hint;
        }
        const graded = applyReturningGradePrefill(child);
        return { ...child, grade: graded.grade };
    });

    return {
        isCurrentYear: false,
        isReturningPrefill: true,
        sourceCycleId: priorCycle.cycle_id,
        existingChildIds: childIds,
        gradeHintsByChildId,
        data: {
            ...data,
            children: childrenWithSuggestedGrades,
        },
    };
}

/**
 * Whether a guardian-linked account still needs to submit registration for the
 * active cycle (e.g. Fall 2026 active but only prior-year enrollments exist).
 */
export function guardianNeedsActiveCycleRegistration(input: {
    hasHousehold: boolean;
    activeChildCount: number;
    hasActiveCycleRegistration: boolean;
}): boolean {
    if (!input.hasHousehold || input.activeChildCount === 0) {
        return true;
    }
    return !input.hasActiveCycleRegistration;
}

export async function needsRegistrationForActiveCycle(
    authUserId: string,
): Promise<boolean> {
    const activeCycle = await getCurrentRegistrationCycle();
    if (!activeCycle?.cycle_id) {
        // Unknown cycle — prefer register (page shows unavailable if misconfigured)
        return true;
    }

    const householdId = await getHouseholdForUser(authUserId);
    if (!householdId) {
        return true;
    }

    const activeChildren = await dbAdapter.listChildren({ householdId, isActive: true });
    const hasActiveCycleRegistration = await householdHasActiveCycleRegistration(
        householdId,
        activeCycle.cycle_id,
    );

    return guardianNeedsActiveCycleRegistration({
        hasHousehold: true,
        activeChildCount: activeChildren.length,
        hasActiveCycleRegistration,
    });
}

/** Post-login route for guardians and unregistered users with a household link. */
export async function resolveGuardianPostLoginRoute(
    authUserId: string,
): Promise<'/register' | '/household'> {
    const needsRegistration = await needsRegistrationForActiveCycle(authUserId);
    return needsRegistration ? '/register' : '/household';
}

// ---------------------------------------------------------------------------
// Household queries
// ---------------------------------------------------------------------------

/**
 * Return a list of households enriched with each household's active children
 * and their ages.  Optionally filters to households whose children are
 * enrolled in the given ministry IDs.
 */
export async function queryHouseholdList(
    leaderMinistryIds?: string[],
    ministryId?: string,
) {
    const households = await dbAdapter.listHouseholds();

    let filteredHouseholds = households;
    let ministryFilterIds = leaderMinistryIds;

    if (ministryId) {
        ministryFilterIds = [ministryId];
    }

    if (ministryFilterIds && ministryFilterIds.length > 0) {
        let activeCycle;
        try {
            activeCycle = await requireActiveRegistrationCycle();
        } catch {
            return [];
        }

        const enrollments = await dbAdapter.listMinistryEnrollments(
            undefined,
            undefined,
            activeCycle.cycle_id,
        );
        const relevantEnrollments = enrollments.filter(
            (e) =>
                e.status === 'enrolled' &&
                ministryFilterIds!.includes(e.ministry_id),
        );

        const relevantChildIds = [
            ...new Set(relevantEnrollments.map((e) => e.child_id)),
        ];

        const allChildren = await dbAdapter.listChildren({ isActive: true });
        const relevantChildren = allChildren.filter((c) =>
            relevantChildIds.includes(c.child_id),
        );

        const relevantHouseholdIds = [
            ...new Set(relevantChildren.map((c) => c.household_id)),
        ];
        filteredHouseholds = households.filter((h) =>
            relevantHouseholdIds.includes(h.household_id),
        );
    } else {
        // Admin default: households with children in the active cycle scope
        try {
            const activeCycle = await requireActiveRegistrationCycle();
            const cycleHouseholdIds = new Set(
                await householdIdsForCycle(activeCycle.cycle_id, 'union'),
            );
            filteredHouseholds = households.filter((h) =>
                cycleHouseholdIds.has(h.household_id),
            );
        } catch {
            return [];
        }
    }

    const allChildren = await dbAdapter.listChildren();
    const householdIds = filteredHouseholds.map(h => h.household_id);
    const relevantChildren = allChildren.filter(c =>
        householdIds.includes(c.household_id),
    );

    const childrenByHousehold = new Map<
        string,
        (Child & { age: number | null })[]
    >();
    for (const child of relevantChildren) {
        if (!childrenByHousehold.has(child.household_id)) {
            childrenByHousehold.set(child.household_id, []);
        }
        childrenByHousehold.get(child.household_id)!.push({
            ...child,
            age: child.dob ? ageOn(new Date().toISOString(), child.dob) : null,
        });
    }

    return filteredHouseholds.map(h => ({
        ...h,
        children: childrenByHousehold.get(h.household_id) || [],
    }));
}

// Shape returned by getHouseholdProfile
export interface HouseholdProfileData {
    household: Household | null;
    guardians: Guardian[];
    emergencyContact: EmergencyContact | null;
    children: (Child & { enrollments?: MinistryEnrollment[]; enrollmentsByCycle: Record<string, MinistryEnrollment[]>; age?: number })[];
    registrations: unknown[];
    cycleNames?: Record<string, string>;
    cycleStartDates?: Record<string, string>;
    activeCycleId?: string | null;
}

/**
 * Get a full household profile including children with enrollment data.
 */
export async function getHouseholdProfile(
    householdId: string,
): Promise<HouseholdProfileData> {
    const household = await dbAdapter.getHousehold(householdId);
    const guardians = await dbAdapter.listGuardians(householdId);
    const emergencyContacts = await dbAdapter.listEmergencyContacts(householdId);
    const emergencyContact = emergencyContacts[0] || null;
    const children = await dbAdapter.listChildren({ householdId });

    const childIds = children.map(c => c.child_id);
    const allEnrollments = await dbAdapter.listMinistryEnrollments();
    const childEnrollments = allEnrollments.filter(e =>
        childIds.includes(e.child_id),
    );

    const allMinistries = await dbAdapter.listMinistries();
    const ministryMap = new Map(allMinistries.map(m => [m.ministry_id, m]));

    const enrichedChildren = children.map(child => {
        const enrollments = childEnrollments
            .filter(e => e.child_id === child.child_id)
            .map(e => ({
                ...e,
                ministryName: ministryMap.get(e.ministry_id)?.name,
                ministry_code: ministryMap.get(e.ministry_id)?.code,
                customQuestions: ministryMap.get(e.ministry_id)?.custom_questions,
            }));

        const enrollmentsByCycle: Record<string, typeof enrollments> = {};
        for (const enrollment of enrollments) {
            const cycleKey = enrollment.cycle_id;
            if (!enrollmentsByCycle[cycleKey]) {
                enrollmentsByCycle[cycleKey] = [];
            }
            enrollmentsByCycle[cycleKey].push(enrollment);
        }

        return { ...child, enrollments, enrollmentsByCycle };
    });

    const registrationCycles = await dbAdapter.listRegistrationCycles();
    const activeCycle = pickActiveRegistrationCycle(registrationCycles);
    const cycleNames = Object.fromEntries(
        registrationCycles.map(cycle => [cycle.cycle_id, cycle.name]),
    );
    const cycleStartDates = Object.fromEntries(
        registrationCycles.map(cycle => [cycle.cycle_id, cycle.start_date || '']),
    );

    return {
        household,
        guardians,
        emergencyContact,
        children: enrichedChildren,
        registrations: [],
        cycleNames,
        cycleStartDates,
        activeCycleId: activeCycle?.cycle_id ?? null,
    };
}

/**
 * Find an existing household and registration data by guardian email.
 * Prefer `loadHouseholdForRegistration` for authenticated `/register` flows.
 */
export async function findHouseholdByEmail(
    email: string,
    currentCycleId: string,
) {
    const guardians = await dbAdapter.listGuardiansByEmail(email);
    const guardian = guardians[0];

    if (!guardian) return null;

    const householdId = guardian.household_id;
    const children = await dbAdapter.listChildren({ householdId, isActive: true });
    const childIds = children.map(c => c.child_id);

    if (childIds.length === 0) return null;

    const currentEnrollments = await dbAdapter.listMinistryEnrollments(
        undefined,
        undefined,
        currentCycleId,
    );
    const currentEnrollmentExists = currentEnrollments.some(e =>
        childIds.includes(e.child_id),
    );

    if (currentEnrollmentExists) {
        return {
            isCurrentYear: true,
            isPrefill: false,
            data: await fetchFullHouseholdDataFromAdapter(householdId, currentCycleId),
        };
    }

    const priorCycle = await getPriorRegistrationCycle(currentCycleId);
    if (!priorCycle) return null;

    const priorEnrollments = await dbAdapter.listMinistryEnrollments(
        undefined,
        undefined,
        priorCycle.cycle_id,
    );
    const priorEnrollmentExists = priorEnrollments.some(e =>
        childIds.includes(e.child_id),
    );

    if (priorEnrollmentExists) {
        return {
            isCurrentYear: false,
            isPrefill: true,
            data: await fetchFullHouseholdDataFromAdapter(householdId, priorCycle.cycle_id, {
                stripChoirSelections: true,
            }),
        };
    }

    return null;
}

/**
 * Look up the household ID associated with a Supabase auth user.
 */
export async function getHouseholdForUser(
    authUserId: string,
): Promise<string | null> {
    try {
        return await dbAdapter.getHouseholdForUser(authUserId);
    } catch (error) {
        console.warn('Could not get household for user:', error);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Household edit mutations (thin adapters over dbAdapter)
// ---------------------------------------------------------------------------

export async function getAllHouseholds(): Promise<Household[]> {
    return dbAdapter.listHouseholds();
}

export async function updateHouseholdInfo(
    householdId: string,
    data: Partial<Household>,
): Promise<void> {
    await dbAdapter.updateHousehold(householdId, data);
}

export async function addGuardian(
    householdId: string,
    guardian: Omit<Guardian, 'guardian_id'>,
): Promise<Guardian> {
    return await dbAdapter.addGuardian(householdId, guardian);
}

export async function updateGuardian(
    guardianId: string,
    data: Partial<Guardian>,
): Promise<void> {
    await dbAdapter.updateGuardian(guardianId, data);
}

export async function removeGuardian(guardianId: string): Promise<void> {
    await dbAdapter.removeGuardian(guardianId);
}

export async function updateEmergencyContact(
    householdId: string,
    contact: EmergencyContact,
): Promise<void> {
    await dbAdapter.updateEmergencyContact(householdId, contact);
}

export async function getAllGuardians(): Promise<Guardian[]> {
    return dbAdapter.listAllGuardians();
}

export async function getAllEmergencyContacts(): Promise<EmergencyContact[]> {
    return dbAdapter.listAllEmergencyContacts();
}

export async function listGuardians({
    householdId,
}: {
    householdId: string;
}): Promise<Guardian[]> {
    return dbAdapter.listGuardians(householdId);
}

export async function getHousehold(householdId: string): Promise<Household | null> {
    return dbAdapter.getHousehold(householdId);
}

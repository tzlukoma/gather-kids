/**
 * DAL — Bible Bee domain
 *
 * Covers Bible Bee cycles, divisions, scriptures, essay prompts, and
 * enrollment operations.  All functions delegate to the Supabase adapter
 * (dbAdapter).  The legacy Dexie/IndexedDB branches have been removed
 * following the demo-mode removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { BibleBeeYear, BibleBeeCycle, Scripture, CompetitionYear, Child, Guardian, Division, EssayPrompt, EnrollmentOverride, Enrollment } from '../types';
import { doGradeRangesOverlap } from '../gradeUtils';

// ---------------------------------------------------------------------------
// Bible Bee Years (legacy – maps to cycles in the new schema)
// ---------------------------------------------------------------------------

/**
 * Get Bible Bee years mapped from the new cycle-based table.
 * @deprecated Use getBibleBeeCycles for new code.
 */
export async function getBibleBeeYears(): Promise<BibleBeeYear[]> {
    const cycles = await dbAdapter.listBibleBeeCycles();
    return cycles.map(cycle => ({
        id: cycle.id,
        year: undefined,
        name: cycle.name,
        label: cycle.name,
        cycle_id: cycle.cycle_id,
        description: cycle.description,
        is_active: cycle.is_active,
        registration_open_date: undefined,
        registration_close_date: undefined,
        competition_start_date: undefined,
        competition_end_date: undefined,
        created_at: cycle.created_at,
        updated_at: cycle.updated_at || cycle.created_at,
    }));
}

export async function createBibleBeeYear(
    data: Omit<BibleBeeYear, 'created_at' | 'updated_at'>,
): Promise<BibleBeeYear> {
    return dbAdapter.createBibleBeeYear(data);
}

export async function updateBibleBeeYear(
    id: string,
    updates: Partial<Omit<BibleBeeYear, 'id' | 'created_at'>>,
): Promise<BibleBeeYear> {
    return dbAdapter.updateBibleBeeYear(id, updates);
}

export async function deleteBibleBeeYear(id: string): Promise<void> {
    return dbAdapter.deleteBibleBeeYear(id);
}

/**
 * Get all competition years (legacy – returns empty in Supabase-only mode).
 * @deprecated Use getBibleBeeYears/getBibleBeeCycles instead.
 */
export async function getCompetitionYears(): Promise<CompetitionYear[]> {
    // Competition years table not available in the new Supabase schema.
    console.warn('Competition years not implemented in adapter, returning empty array');
    return [];
}

// ---------------------------------------------------------------------------
// Bible Bee Cycles (new cycle-based system)
// ---------------------------------------------------------------------------

export async function getBibleBeeCycles(isActive?: boolean): Promise<BibleBeeCycle[]> {
    return dbAdapter.listBibleBeeCycles(isActive);
}

export async function createBibleBeeCycle(
    data: Omit<BibleBeeCycle, 'id' | 'created_at' | 'updated_at'>,
): Promise<BibleBeeCycle> {
    return dbAdapter.createBibleBeeCycle(data);
}

export async function updateBibleBeeCycle(
    id: string,
    updates: Partial<Omit<BibleBeeCycle, 'id' | 'created_at' | 'updated_at'>>,
): Promise<BibleBeeCycle> {
    return dbAdapter.updateBibleBeeCycle(id, updates);
}

export async function deleteBibleBeeCycle(id: string): Promise<void> {
    return dbAdapter.deleteBibleBeeCycle(id);
}

// ---------------------------------------------------------------------------
// Divisions
// ---------------------------------------------------------------------------

export async function getDivision(id: string): Promise<any | null> {
    return dbAdapter.getDivision(id);
}

export async function getDivisionsForBibleBeeCycle(cycleId: string): Promise<any[]> {
    return dbAdapter.listDivisions(cycleId);
}

/** @deprecated Use getDivisionsForBibleBeeCycle instead. */
export async function getDivisionsForBibleBeeYear(yearId: string): Promise<any[]> {
    return dbAdapter.listDivisions(yearId);
}

export async function createDivision(
    data: Omit<Division, 'created_at' | 'updated_at'>,
): Promise<Division> {
    if (data.min_grade < 0 || data.min_grade > 12) {
        throw new Error('min_grade must be between 0 and 12');
    }
    if (data.max_grade < 0 || data.max_grade > 12) {
        throw new Error('max_grade must be between 0 and 12');
    }
    if (data.min_grade > data.max_grade) {
        throw new Error('min_grade must be <= max_grade');
    }

    const yearId = data.bible_bee_cycle_id;
    const existingDivisions = await getDivisionsForBibleBeeYear(yearId);
    for (const existing of existingDivisions) {
        if (
            doGradeRangesOverlap(
                data.min_grade,
                data.max_grade,
                existing.min_grade,
                existing.max_grade,
            )
        ) {
            throw new Error(
                `Grade range ${data.min_grade}-${data.max_grade} overlaps with existing division "${existing.name}" (${existing.min_grade}-${existing.max_grade})`,
            );
        }
    }

    return dbAdapter.createDivision(data);
}

export async function updateDivision(id: string, updates: Partial<any>): Promise<any> {
    if (updates.min_grade !== undefined || updates.max_grade !== undefined) {
        const existing = await getDivision(id);
        if (!existing) throw new Error(`Division ${id} not found`);

        const newMinGrade =
            updates.min_grade !== undefined ? updates.min_grade : existing.min_grade;
        const newMaxGrade =
            updates.max_grade !== undefined ? updates.max_grade : existing.max_grade;

        if (newMinGrade < 0 || newMinGrade > 12) {
            throw new Error('min_grade must be between 0 and 12');
        }
        if (newMaxGrade < 0 || newMaxGrade > 12) {
            throw new Error('max_grade must be between 0 and 12');
        }
        if (newMinGrade > newMaxGrade) {
            throw new Error('min_grade must be <= max_grade');
        }

        const yearId = existing.bible_bee_cycle_id || existing.year_id;
        const otherDivisions = await getDivisionsForBibleBeeYear(yearId);
        for (const other of otherDivisions) {
            if (
                other.id !== id &&
                doGradeRangesOverlap(
                    newMinGrade,
                    newMaxGrade,
                    other.min_grade,
                    other.max_grade,
                )
            ) {
                throw new Error(
                    `Grade range ${newMinGrade}-${newMaxGrade} overlaps with existing division "${other.name}" (${other.min_grade}-${other.max_grade})`,
                );
            }
        }
    }

    return dbAdapter.updateDivision(id, updates);
}

export async function deleteDivision(id: string): Promise<void> {
    return dbAdapter.deleteDivision(id);
}

// ---------------------------------------------------------------------------
// Scriptures
// ---------------------------------------------------------------------------

/**
 * Get scriptures for a Bible Bee cycle.
 */
export async function getScripturesForBibleBeeCycle(cycleId: string): Promise<Scripture[]> {
    return dbAdapter.listScriptures({ cycleId });
}

/**
 * Get scriptures for a Bible Bee year (legacy).
 * @deprecated Use getScripturesForBibleBeeCycle instead.
 */
export async function getScripturesForBibleBeeYear(yearId: string): Promise<Scripture[]> {
    return dbAdapter.listScriptures({ yearId });
}

/**
 * Get scriptures for a competition year (legacy).
 * @deprecated This table is not available in the Supabase schema.
 */
export async function getScripturesForCompetitionYear(
    _competitionYearId: string,
): Promise<Scripture[]> {
    // Competition year scriptures not available in the new schema.
    return [];
}

export async function deleteScripture(id: string): Promise<void> {
    return dbAdapter.deleteScripture(id);
}

/**
 * Upsert a scripture record.
 */
export async function upsertScripture(
    payload: Omit<Scripture, 'created_at' | 'updated_at'> & { id?: string },
): Promise<Scripture> {
    return dbAdapter.upsertScripture(payload);
}

// ---------------------------------------------------------------------------
// Essay Prompts
// ---------------------------------------------------------------------------

export async function getEssayPromptsForBibleBeeCycle(cycleId: string): Promise<any[]> {
    const allPrompts = await dbAdapter.listEssayPrompts();
    return allPrompts.filter(
        (prompt: any) => prompt.bible_bee_cycle_id === cycleId,
    );
}

/** @deprecated Use getEssayPromptsForBibleBeeCycle instead. */
export async function getEssayPromptsForBibleBeeYear(yearId: string): Promise<any[]> {
    const allPrompts = await dbAdapter.listEssayPrompts();
    return allPrompts.filter(
        (prompt: any) =>
            prompt.year_id === yearId || prompt.bible_bee_cycle_id === yearId,
    );
}

export async function getEssayPromptsForYearAndDivision(
    yearId: string,
    divisionName: string,
): Promise<any[]> {
    return dbAdapter.getEssayPromptsForYearAndDivision(yearId, divisionName);
}

export async function createEssayPrompt(
    data: Omit<EssayPrompt, 'created_at' | 'updated_at'>,
): Promise<EssayPrompt> {
    return dbAdapter.createEssayPrompt(data);
}

export async function updateEssayPrompt(id: string, updates: Partial<any>): Promise<any> {
    return dbAdapter.updateEssayPrompt(id, updates);
}

export async function deleteEssayPrompt(id: string): Promise<void> {
    return dbAdapter.deleteEssayPrompt(id);
}

// ---------------------------------------------------------------------------
// Enrollment overrides and auto-enrollment
// ---------------------------------------------------------------------------

export async function previewAutoEnrollment(yearId: string): Promise<any> {
    return dbAdapter.previewAutoEnrollment(yearId);
}

export async function commitAutoEnrollment(yearId: string, previews: any[]): Promise<any> {
    return dbAdapter.commitAutoEnrollment(yearId, previews);
}

export async function createEnrollmentOverride(
    data: Omit<EnrollmentOverride, 'created_at' | 'updated_at'>,
): Promise<EnrollmentOverride> {
    return dbAdapter.createEnrollmentOverride(data);
}

export async function updateEnrollmentOverride(
    id: string,
    updates: Partial<any>,
): Promise<any> {
    return dbAdapter.updateEnrollmentOverride(id, updates);
}

export async function deleteEnrollmentOverride(id: string): Promise<void> {
    return dbAdapter.deleteEnrollmentOverride(id);
}

export async function deleteEnrollmentOverrideByChild(childId: string): Promise<void> {
    return dbAdapter.deleteEnrollmentOverrideByChild(childId);
}

export async function removeEnrollmentOverrideEffect(
    childId: string,
    yearId: string,
): Promise<void> {
    const existingEnrollments = await dbAdapter.listEnrollments(childId, yearId);

    if (existingEnrollments.length > 0) {
        const enrollment = existingEnrollments[0];
        if (!enrollment.auto_enrolled) {
            await dbAdapter.deleteEnrollment(enrollment.id);
        }
    }
}

export async function applyEnrollmentOverride(
    childId: string,
    yearId: string,
    divisionId: string,
): Promise<void> {
    const now = new Date().toISOString();
    const existingEnrollments = await dbAdapter.listEnrollments(childId, yearId);

    if (existingEnrollments.length > 0) {
        const enrollment = existingEnrollments[0];
        await dbAdapter.updateEnrollment(enrollment.id, {
            division_id: divisionId,
            auto_enrolled: false,
            enrolled_at: now,
        });
    } else {
        await dbAdapter.createEnrollment({
            id: crypto.randomUUID(),
            bible_bee_cycle_id: yearId,
            child_id: childId,
            division_id: divisionId,
            auto_enrolled: false,
            enrolled_at: now,
        });
    }
}

export async function getEnrollmentOverridesForYear(yearId: string): Promise<any[]> {
    return dbAdapter.listEnrollmentOverrides(yearId);
}

export async function recalculateMinimumBoundaries(yearId: string): Promise<void> {
    // Recalculate minimum boundaries by updating each division based on ordered scriptures
    const divisions = await dbAdapter.listDivisions(yearId);
    const scriptures = await dbAdapter.listScriptures({ cycleId: yearId });
    const sortedScriptures = [...scriptures].sort((a, b) => (a.scripture_order ?? 0) - (b.scripture_order ?? 0));

    for (const division of divisions) {
        let accumulatedCount = 0;
        let minLastOrder: number | undefined = undefined;

        for (const scripture of sortedScriptures) {
            accumulatedCount += scripture.counts_for || 1;
            if (accumulatedCount >= division.minimum_required) {
                minLastOrder = scripture.scripture_order ?? 0;
                break;
            }
        }

        if (division.min_last_order !== minLastOrder) {
            await dbAdapter.updateDivision(division.id, { min_last_order: minLastOrder });
        }
    }
}

export async function commitEnhancedCsvRowsToYear(
    rows: any[],
    yearId: string,
): Promise<any> {
    return dbAdapter.commitEnhancedCsvRowsToYear(rows, yearId);
}

// ---------------------------------------------------------------------------
// Bible Bee progress (Supabase-only)
// ---------------------------------------------------------------------------

/**
 * Get Bible Bee progress data for all children enrolled in a given cycle.
 * Returns an array of progress records, one per enrolled child.
 */
export async function getBibleBeeProgressForCycle(cycleId: string): Promise<any[]> {
    try {
        const enrollments = await dbAdapter.listEnrollments();
        const cycleEnrollments = enrollments.filter((e: any) => e.bible_bee_cycle_id === cycleId);

        if (cycleEnrollments.length === 0) {
            return [];
        }

        const childIds = [...new Set(cycleEnrollments.map((e: any) => e.child_id))] as string[];
        const children = await dbAdapter.listChildren();
        const enrolledChildren = children.filter((c: Child) => childIds.includes(c.child_id));

        const divisions = await dbAdapter.listDivisions(cycleId);

        const progressData = await Promise.all(
            enrolledChildren.map(async (child: Child) => {
                const enrollment = cycleEnrollments.find((e: any) => e.child_id === child.child_id);
                const division = enrollment
                    ? divisions.find((d: any) => d.id === enrollment.division_id)
                    : null;
                const divisionName = division ? division.name : 'Unknown Division';

                let essayStatus = 'none';
                let hasEssays = false;
                if (division) {
                    const essayPrompts = await dbAdapter.listEssayPrompts(division.id, cycleId);
                    hasEssays = essayPrompts.length > 0;
                    if (hasEssays) {
                        const studentEssays = await dbAdapter.listStudentEssays(child.child_id, cycleId);
                        const relevantEssay = studentEssays.find(
                            (e: any) => e.essay_prompt_id === essayPrompts[0].id,
                        );
                        essayStatus = relevantEssay ? relevantEssay.status : 'assigned';
                    }
                }

                let totalScriptures = 0;
                let completedScriptures = 0;
                let requiredScriptures = 0;

                if (!hasEssays) {
                    const studentScriptures = await dbAdapter.listStudentScriptures(
                        child.child_id,
                        cycleId,
                    );
                    const allScriptures = await dbAdapter.listScriptures({ yearId: cycleId });

                    completedScriptures = studentScriptures
                        .filter((s: any) => s.is_completed)
                        .reduce((sum: number, s: any) => {
                            const scripture = allScriptures.find((sc: any) => sc.id === s.scripture_id);
                            return sum + (scripture?.counts_for || 1);
                        }, 0);

                    requiredScriptures = division ? division.minimum_required : 0;
                    totalScriptures = requiredScriptures;
                }

                let bibleBeeStatus = 'Not Started';
                if (hasEssays) {
                    bibleBeeStatus = essayStatus === 'submitted' ? 'Complete' : 'In Progress';
                } else if (totalScriptures > 0) {
                    const progressPercent = (completedScriptures / requiredScriptures) * 100;
                    bibleBeeStatus =
                        progressPercent >= 100
                            ? 'Complete'
                            : completedScriptures > 0
                              ? 'In Progress'
                              : 'Not Started';
                }

                let primaryGuardian: Guardian | null = null;
                try {
                    if (child.household_id) {
                        const guardians = await dbAdapter.listGuardians(child.household_id);
                        primaryGuardian =
                            guardians.find((g: Guardian) => g.is_primary) || guardians[0] || null;
                    }
                } catch (err) {
                    console.warn('Error fetching guardian for child:', child.child_id, err);
                }

                const childCycleEnrollments = cycleEnrollments.filter(
                    (e: any) => e.child_id === child.child_id,
                );
                const ministries = childCycleEnrollments.map(() => ({
                    ministry_id: 'bible-bee',
                    ministryName: 'Bible Bee',
                }));

                return {
                    childId: child.child_id,
                    childName: `${child.first_name} ${child.last_name}`,
                    child,
                    totalScriptures: hasEssays ? 0 : totalScriptures,
                    completedScriptures: hasEssays ? 0 : completedScriptures,
                    requiredScriptures: hasEssays ? 0 : requiredScriptures,
                    bibleBeeStatus,
                    gradeGroup: divisionName,
                    essayStatus: hasEssays ? essayStatus : undefined,
                    ministries,
                    primaryGuardian,
                };
            }),
        );

        return progressData;
    } catch (error) {
        console.error('Error getting Bible Bee progress for cycle:', error);
        return [];
    }
}

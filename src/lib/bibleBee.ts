import { db } from './db';
import type { CompetitionYear, Scripture, GradeRule, StudentScripture, StudentEssay, Child, BibleBeeYear, Division, EssayPrompt, Enrollment, EnrollmentOverride, RegistrationCycle, Ministry, MinistryEnrollment } from './types';
import { gradeToCode, doGradeRangesOverlap } from './gradeUtils';

export async function createCompetitionYear(payload: Omit<CompetitionYear, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    const item: CompetitionYear = {
        id,
        year: payload.year,
        name: payload.name,
        description: payload.description,
        opensAt: payload.opensAt,
        closesAt: payload.closesAt,
        createdAt: now,
        updatedAt: now,
    };
    await db.competitionYears.put(item);
    return item;
}

export async function upsertScripture(payload: Omit<Scripture, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    // support legacy payload.alternateTexts but prefer payload.texts
    const textsMap = (payload as any).texts ?? (payload as any).alternateTexts ?? undefined;

    const item: Scripture = {
        id,
        competitionYearId: payload.competitionYearId,
        reference: payload.reference,
        text: payload.text,
        translation: payload.translation,
        texts: textsMap,
        bookLangAlt: payload.bookLangAlt,
        sortOrder: payload.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
    };
    await db.scriptures.put(item);
    return item;
}

export async function createGradeRule(payload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    const item: GradeRule = {
        id,
        competitionYearId: payload.competitionYearId,
        minGrade: payload.minGrade,
        maxGrade: payload.maxGrade,
        type: payload.type,
        targetCount: payload.targetCount,
        promptText: payload.promptText,
        instructions: payload.instructions,
        createdAt: now,
        updatedAt: now,
    };
    await db.gradeRules.put(item);
    return item;
}

export async function getApplicableGradeRule(competitionYearId: string, gradeNumber: number) {
    const rules = await db.gradeRules.where({ competitionYearId }).toArray();
    return rules.find(r => gradeNumber >= r.minGrade && gradeNumber <= r.maxGrade) ?? null;
}

// Enrollment helper (idempotent)
export async function enrollChildInBibleBee(childId: string, competitionYearId: string) {
    const child: Child | undefined = await db.children.get(childId);
    const gradeNum = child?.grade ? Number(child.grade) : NaN;
    const rule = isNaN(gradeNum) ? null : await getApplicableGradeRule(competitionYearId, gradeNum);
    if (!rule) return null;
    const now = new Date().toISOString();

    if (rule.type === 'scripture') {
        const scriptures = (await db.scriptures.where('competitionYearId').equals(competitionYearId).toArray())
            .sort((a: any, b: any) => Number(a.order ?? a.sortOrder ?? 0) - Number(b.order ?? b.sortOrder ?? 0));
        const existing = await db.studentScriptures.where({ childId, competitionYearId }).toArray();
        const existingKeys = new Set(existing.map(s => s.scriptureId));
        const toInsert = scriptures
            .filter(s => !existingKeys.has(s.id))
            .map(s => ({
                id: crypto.randomUUID(),
                childId,
                competitionYearId,
                scriptureId: s.id,
                status: 'assigned' as const,
                createdAt: now,
                updatedAt: now,
            }));
        if (toInsert.length) await db.studentScriptures.bulkAdd(toInsert);
        return { assigned: toInsert.length };
    } else {
        const existingEssay = await db.studentEssays.where({ childId, competitionYearId }).toArray();
        if (existingEssay.length === 0) {
            await db.studentEssays.add({
                id: crypto.randomUUID(),
                childId,
                competitionYearId,
                status: 'assigned',
                promptText: rule.promptText ?? '',
                instructions: rule.instructions,
                createdAt: now,
                updatedAt: now,
            });
            return { assignedEssay: true };
        }
        return { assignedEssay: false };
    }
}

export async function toggleScriptureCompletion(studentScriptureId: string, complete: boolean) {
    const now = new Date().toISOString();
    await db.studentScriptures.update(studentScriptureId, {
        status: complete ? 'completed' : 'assigned',
        completedAt: complete ? now : undefined,
        updatedAt: now,
    });
}

export async function submitEssay(childId: string, competitionYearId: string) {
    const now = new Date().toISOString();
    const essay = await db.studentEssays.where({ childId, competitionYearId }).first();
    if (!essay) return null;
    await db.studentEssays.update(essay.id, {
        status: 'submitted',
        submittedAt: now,
        updatedAt: now,
    });
    return { submitted: true };
}

// CSV parsing & validation (browser-only). Return preview rows and errors.
export type CsvRow = { reference?: string; text?: string; translation?: string; sortOrder?: number };
export function validateCsvRows(rows: CsvRow[]) {
    const errors: { row: number; message: string }[] = [];
    const refs = new Set<string>();
    rows.forEach((r, i) => {
        if (!r.reference || !r.text) {
            errors.push({ row: i + 1, message: 'Missing reference or text' });
        }
        if (r.reference && refs.has(r.reference)) {
            errors.push({ row: i + 1, message: 'Duplicate reference in file' });
        }
        if (r.reference) refs.add(r.reference);
    });
    return { valid: errors.length === 0, errors };
}

export async function commitCsvRowsToYear(rows: CsvRow[], competitionYearId: string) {
    const now = new Date().toISOString();
    const toUpsert = rows.map(r => ({
        id: crypto.randomUUID(),
        competitionYearId,
        reference: r.reference ?? '',
        text: r.text ?? '',
        translation: r.translation,
        // CSV rows may include a flattened texts object (e.g. as JSON) or legacy alternateTexts
        texts: (r as any).texts ?? (r as any).alternateTexts,
        sortOrder: r.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
    }));
    for (const s of toUpsert) await db.scriptures.put(s);
    return { inserted: toUpsert.length };
}

// === New Bible Bee Year Management ===

export async function createBibleBeeYear(payload: Omit<BibleBeeYear, 'id' | 'created_at'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    
    // If setting this year as active, deactivate all other years first
    if (payload.is_active) {
        // Deactivate all existing Bible Bee years - check both boolean and numeric values
        const existingActiveYears = await db.bible_bee_years.where('is_active').equals(1).toArray();
        const existingActiveYearsBoolean = await db.bible_bee_years.where('is_active').equals(true as any).toArray();
        
        for (const year of [...existingActiveYears, ...existingActiveYearsBoolean]) {
            await db.bible_bee_years.update(year.id, { is_active: false });
        }
        
        // Also handle legacy competition years - set them as inactive
        const legacyActiveYears = await db.competitionYears.toArray();
        // We can't directly update the legacy years' active status as they don't have that field,
        // but the bridge logic in the component sets 2025 as active by default.
        // The UI logic will need to handle this by only showing one active at a time.
    }
    
    const item: BibleBeeYear = {
        id,
        label: payload.label,
        is_active: payload.is_active,
        created_at: now,
    };
    await db.bible_bee_years.put(item);
    return item;
}

export async function updateBibleBeeYear(id: string, updates: Partial<Omit<BibleBeeYear, 'id' | 'created_at'>>) {
    const existing = await db.bible_bee_years.get(id);
    if (!existing) throw new Error(`BibleBeeYear ${id} not found`);
    
    // If setting this year as active, deactivate all other years first
    if (updates.is_active === true) {
        // Deactivate all existing Bible Bee years except this one - check both boolean and numeric values
        const existingActiveYears = await db.bible_bee_years.where('is_active').equals(1).toArray();
        const existingActiveYearsBoolean = await db.bible_bee_years.where('is_active').equals(true as any).toArray();
        
        for (const year of [...existingActiveYears, ...existingActiveYearsBoolean]) {
            if (year.id !== id) {
                await db.bible_bee_years.update(year.id, { is_active: false });
            }
        }
    }
    
    const updated = { ...existing, ...updates };
    await db.bible_bee_years.put(updated);
    return updated;
}

export async function deleteBibleBeeYear(id: string) {
    await db.bible_bee_years.delete(id);
    // Also delete related divisions, enrollments, overrides, etc.
    await db.divisions.where('year_id').equals(id).delete();
    await db.essay_prompts.where('year_id').equals(id).delete();
    await db.enrollments.where('year_id').equals(id).delete();
    await db.enrollment_overrides.where('year_id').equals(id).delete();
}

// === Division Management ===

export async function createDivision(payload: Omit<Division, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
    // Validate grade ranges
    if (payload.min_grade < 0 || payload.min_grade > 12) {
        throw new Error('min_grade must be between 0 and 12');
    }
    if (payload.max_grade < 0 || payload.max_grade > 12) {
        throw new Error('max_grade must be between 0 and 12');
    }
    if (payload.min_grade > payload.max_grade) {
        throw new Error('min_grade must be <= max_grade');
    }
    
    // Check for overlapping ranges in the same year
    const existingDivisions = await db.divisions.where('year_id').equals(payload.year_id).toArray();
    for (const existing of existingDivisions) {
        if (doGradeRangesOverlap(payload.min_grade, payload.max_grade, existing.min_grade, existing.max_grade)) {
            throw new Error(`Grade range ${payload.min_grade}-${payload.max_grade} overlaps with existing division "${existing.name}" (${existing.min_grade}-${existing.max_grade})`);
        }
    }
    
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    const item: Division = {
        id,
        year_id: payload.year_id,
        name: payload.name,
        minimum_required: payload.minimum_required,
        min_last_order: payload.min_last_order,
        min_grade: payload.min_grade,
        max_grade: payload.max_grade,
        created_at: now,
        updated_at: now,
    };
    await db.divisions.put(item);
    return item;
}

export async function updateDivision(id: string, updates: Partial<Omit<Division, 'id' | 'created_at' | 'updated_at'>>) {
    const existing = await db.divisions.get(id);
    if (!existing) throw new Error(`Division ${id} not found`);
    
    // If updating grade ranges, validate no overlap
    if (updates.min_grade !== undefined || updates.max_grade !== undefined) {
        const newMinGrade = updates.min_grade ?? existing.min_grade;
        const newMaxGrade = updates.max_grade ?? existing.max_grade;
        
        if (newMinGrade < 0 || newMinGrade > 12) {
            throw new Error('min_grade must be between 0 and 12');
        }
        if (newMaxGrade < 0 || newMaxGrade > 12) {
            throw new Error('max_grade must be between 0 and 12');
        }
        if (newMinGrade > newMaxGrade) {
            throw new Error('min_grade must be <= max_grade');
        }
        
        // Check overlap with other divisions (excluding current one)
        const otherDivisions = await db.divisions.where('year_id').equals(existing.year_id).and(div => div.id !== id).toArray();
        for (const other of otherDivisions) {
            if (doGradeRangesOverlap(newMinGrade, newMaxGrade, other.min_grade, other.max_grade)) {
                throw new Error(`Grade range ${newMinGrade}-${newMaxGrade} overlaps with existing division "${other.name}" (${other.min_grade}-${other.max_grade})`);
            }
        }
    }
    
    const updated = { 
        ...existing, 
        ...updates, 
        updated_at: new Date().toISOString() 
    };
    await db.divisions.put(updated);
    return updated;
}

export async function deleteDivision(id: string) {
    await db.divisions.delete(id);
    // Also clean up related enrollments
    await db.enrollments.where('division_id').equals(id).delete();
    await db.enrollment_overrides.where('division_id').equals(id).delete();
}

// === Essay Prompt Management ===

export async function createEssayPrompt(payload: Omit<EssayPrompt, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    const item: EssayPrompt = {
        id,
        year_id: payload.year_id,
        division_name: payload.division_name,
        prompt_text: payload.prompt_text,
        due_date: payload.due_date,
        created_at: now,
        updated_at: now,
    };
    await db.essay_prompts.put(item);
    return item;
}

export async function updateEssayPrompt(id: string, updates: Partial<Omit<EssayPrompt, 'id' | 'created_at' | 'updated_at'>>) {
    const existing = await db.essay_prompts.get(id);
    if (!existing) throw new Error(`EssayPrompt ${id} not found`);
    
    const updated = { 
        ...existing, 
        ...updates, 
        updated_at: new Date().toISOString() 
    };
    await db.essay_prompts.put(updated);
    return updated;
}

export async function deleteEssayPrompt(id: string) {
    await db.essay_prompts.delete(id);
}

// === Auto-Enrollment System ===

export interface AutoEnrollmentPreview {
    child_id: string;
    child_name: string;
    grade_text: string;
    grade_code: number | null;
    proposed_division?: {
        id: string;
        name: string;
    };
    override_division?: {
        id: string;
        name: string;
        reason?: string;
    };
    status: 'proposed' | 'override' | 'unassigned' | 'unknown_grade' | 'multiple_matches';
}

export async function previewAutoEnrollment(yearId: string): Promise<{
    previews: AutoEnrollmentPreview[];
    counts: {
        proposed: number;
        overrides: number;
        unassigned: number;
        unknown_grade: number;
    };
}> {
    // Get the current registration cycle/year
    let currentCycle = await db.registration_cycles.where('is_active').equals(1).first();
    if (!currentCycle) {
        // Try with boolean value as fallback
        currentCycle = await db.registration_cycles.where('is_active').equals(true as any).first();
    }
    if (!currentCycle) {
        throw new Error('No active registration cycle found');
    }
    
    // Get Bible Bee ministry
    const bibleBeeMinistry = await db.ministries.where('code').equals('bible-bee').first();
    if (!bibleBeeMinistry) {
        throw new Error('Bible Bee ministry not found');
    }
    
    // Get children enrolled in Bible Bee for the current registration cycle
    console.log('Current cycle:', currentCycle);
    console.log('Bible Bee ministry:', bibleBeeMinistry);
    
    // Validate that we have valid IDs for the compound key
    if (!currentCycle?.cycle_id || !bibleBeeMinistry?.ministry_id) {
        const errorMsg = `Invalid IDs for ministry enrollment query: cycle_id=${currentCycle?.cycle_id}, ministry_id=${bibleBeeMinistry?.ministry_id}. Both values must be non-null for IndexedDB compound key query.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    // Double-check that values are not undefined, null, or empty strings
    const cycleId = currentCycle.cycle_id;
    const ministryId = bibleBeeMinistry.ministry_id;
    
    if (typeof cycleId !== 'string' || cycleId.trim() === '' || typeof ministryId !== 'string' || ministryId.trim() === '') {
        const errorMsg = `Invalid key types for IndexedDB compound key: cycle_id="${cycleId}" (${typeof cycleId}), ministry_id="${ministryId}" (${typeof ministryId}). Both must be non-empty strings.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    console.log('Compound key values:', [ministryId, cycleId]);
    
    // Note: The compound index is [ministry_id+cycle_id], not [cycle_id+ministry_id]
    let bibleBeeEnrollments: MinistryEnrollment[] = [];
    try {
        bibleBeeEnrollments = await db.ministry_enrollments
            .where('[ministry_id+cycle_id]')
            .equals([ministryId, cycleId])
            .and((e: MinistryEnrollment) => e.status === 'enrolled')
            .toArray();
        
        console.log('Bible Bee enrollments found:', bibleBeeEnrollments.length);
    } catch (error) {
        console.error('Error querying ministry_enrollments with compound key:', error);
        console.error('Failed compound key query details:', {
            index: '[ministry_id+cycle_id]',
            keyValues: [ministryId, cycleId],
            ministryId,
            cycleId
        });
        throw error;
    }
    
    const childIds = bibleBeeEnrollments.map((e: MinistryEnrollment) => e.child_id);
    const children = await db.children.where('child_id').anyOf(childIds).toArray();
    
    // Get divisions for this year
    const divisions = await db.divisions.where('year_id').equals(yearId).toArray();
    
    // Get existing overrides
    const overrides = await db.enrollment_overrides.where('year_id').equals(yearId).toArray();
    const overrideMap = new Map(overrides.map(o => [o.child_id, o]));
    
    const previews: AutoEnrollmentPreview[] = [];
    const counts = { proposed: 0, overrides: 0, unassigned: 0, unknown_grade: 0 };
    
    for (const child of children) {
        const gradeCode = gradeToCode(child.grade);
        const preview: AutoEnrollmentPreview = {
            child_id: child.child_id,
            child_name: `${child.first_name} ${child.last_name}`,
            grade_text: child.grade || '',
            grade_code: gradeCode,
            status: 'unassigned',
        };
        
        // Check for override first
        const override = overrideMap.get(child.child_id);
        if (override) {
            const overrideDivision = divisions.find(d => d.id === override.division_id);
            if (overrideDivision) {
                preview.override_division = {
                    id: overrideDivision.id,
                    name: overrideDivision.name,
                    reason: override.reason,
                };
                preview.status = 'override';
                counts.overrides++;
                previews.push(preview);
                continue;
            }
        }
        
        // Handle unknown grade
        if (gradeCode === null) {
            preview.status = 'unknown_grade';
            counts.unknown_grade++;
            previews.push(preview);
            continue;
        }
        
        // Find matching divisions
        const matchingDivisions = divisions.filter(d => 
            gradeCode >= d.min_grade && gradeCode <= d.max_grade
        );
        
        if (matchingDivisions.length === 0) {
            preview.status = 'unassigned';
            counts.unassigned++;
        } else if (matchingDivisions.length === 1) {
            preview.proposed_division = {
                id: matchingDivisions[0].id,
                name: matchingDivisions[0].name,
            };
            preview.status = 'proposed';
            counts.proposed++;
        } else {
            // Multiple matches shouldn't happen due to non-overlap constraint
            preview.status = 'multiple_matches';
            counts.unassigned++;
        }
        
        previews.push(preview);
    }
    
    return { previews, counts };
}

export async function commitAutoEnrollment(yearId: string): Promise<{
    enrolled: number;
    overrides_applied: number;
    errors: string[];
}> {
    const preview = await previewAutoEnrollment(yearId);
    const errors: string[] = [];
    let enrolled = 0;
    let overrides_applied = 0;
    
    const now = new Date().toISOString();
    
    for (const p of preview.previews) {
        try {
            // Apply overrides first
            if (p.status === 'override' && p.override_division) {
                await db.enrollments.put({
                    id: crypto.randomUUID(),
                    year_id: yearId,
                    child_id: p.child_id,
                    division_id: p.override_division.id,
                    auto_enrolled: false,
                    enrolled_at: now,
                });
                overrides_applied++;
            }
            // Apply proposed auto-enrollments
            else if (p.status === 'proposed' && p.proposed_division) {
                await db.enrollments.put({
                    id: crypto.randomUUID(),
                    year_id: yearId,
                    child_id: p.child_id,
                    division_id: p.proposed_division.id,
                    auto_enrolled: true,
                    enrolled_at: now,
                });
                enrolled++;
            }
            // Skip unassigned and unknown_grade children
        } catch (error) {
            errors.push(`Error enrolling ${p.child_name}: ${error}`);
        }
    }
    
    return { enrolled, overrides_applied, errors };
}

// === Override Management ===

export async function createEnrollmentOverride(payload: Omit<EnrollmentOverride, 'id' | 'created_at'> & { id?: string }) {
    const id = payload.id ?? crypto.randomUUID();
    const item: EnrollmentOverride = {
        id,
        year_id: payload.year_id,
        child_id: payload.child_id,
        division_id: payload.division_id,
        reason: payload.reason,
        created_by: payload.created_by,
        created_at: new Date().toISOString(),
    };
    await db.enrollment_overrides.put(item);
    return item;
}

export async function updateEnrollmentOverride(id: string, updates: Partial<Omit<EnrollmentOverride, 'id' | 'created_at'>>) {
    const existing = await db.enrollment_overrides.get(id);
    if (!existing) throw new Error(`EnrollmentOverride ${id} not found`);
    
    const updated = { ...existing, ...updates };
    await db.enrollment_overrides.put(updated);
    return updated;
}

export async function deleteEnrollmentOverride(id: string) {
    await db.enrollment_overrides.delete(id);
}

export async function deleteEnrollmentOverrideByChild(yearId: string, childId: string) {
    await db.enrollment_overrides.where('[year_id+child_id]').equals([yearId, childId]).delete();
}

// === Minimum Boundary Calculation ===

export async function recalculateMinimumBoundaries(yearId: string) {
    const divisions = await db.divisions.where('year_id').equals(yearId).toArray();
    const scriptures = await db.scriptures.where('year_id').equals(yearId).sortBy('scripture_order');
    
    for (const division of divisions) {
        let accumulatedCount = 0;
        let minLastOrder: number | undefined = undefined;
        
        for (const scripture of scriptures) {
            accumulatedCount += scripture.counts_for || 1;
            if (accumulatedCount >= division.minimum_required) {
                minLastOrder = scripture.scripture_order || 0;
                break;
            }
        }
        
        if (division.min_last_order !== minLastOrder) {
            await updateDivision(division.id, { min_last_order: minLastOrder });
        }
    }
}

// === Enhanced CSV Import ===

export interface EnhancedCsvRow {
    scripture_order?: number;
    scripture_number?: string;
    counts_for?: number;
    reference?: string;
    category?: string;
    text?: string; // legacy
    translation?: string; // legacy
}

export function validateEnhancedCsvRows(rows: EnhancedCsvRow[]) {
    const errors: string[] = [];
    const scriptureNumbers = new Set<string>();
    const scriptureOrders = new Set<number>();
    
    rows.forEach((row, index) => {
        const rowNum = index + 1;
        
        if (!row.scripture_number) {
            errors.push(`Row ${rowNum}: scripture_number is required`);
        } else if (scriptureNumbers.has(row.scripture_number)) {
            errors.push(`Row ${rowNum}: duplicate scripture_number "${row.scripture_number}"`);
        } else {
            scriptureNumbers.add(row.scripture_number);
        }
        
        if (row.scripture_order !== undefined) {
            if (scriptureOrders.has(row.scripture_order)) {
                errors.push(`Row ${rowNum}: duplicate scripture_order ${row.scripture_order}`);
            } else {
                scriptureOrders.add(row.scripture_order);
            }
        }
        
        if (!row.reference) {
            errors.push(`Row ${rowNum}: reference is required`);
        }
        
        if (row.counts_for !== undefined && (!Number.isInteger(row.counts_for) || row.counts_for < 1)) {
            errors.push(`Row ${rowNum}: counts_for must be a positive integer`);
        }
    });
    
    return { isValid: errors.length === 0, errors };
}

export async function commitEnhancedCsvRowsToYear(rows: EnhancedCsvRow[], yearId: string) {
    const validation = validateEnhancedCsvRows(rows);
    if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const now = new Date().toISOString();
    
    for (const row of rows) {
        // Query by year_id and scripture_number - need to query separately since compound index might not work as expected
        const existingScriptures = await db.scriptures.where('year_id').equals(yearId).toArray();
        const existing = existingScriptures.find(s => s.scripture_number === row.scripture_number);
        
        const scriptureData: Partial<Scripture> = {
            year_id: yearId,
            scripture_number: row.scripture_number,
            scripture_order: row.scripture_order,
            counts_for: row.counts_for || 1,
            reference: row.reference || '',
            category: row.category,
            // Legacy fields for backward compatibility
            text: row.text || '',
            translation: row.translation,
            updatedAt: now,
        };
        
        if (existing) {
            await db.scriptures.put({ ...existing, ...scriptureData });
        } else {
            await db.scriptures.put({
                id: crypto.randomUUID(),
                competitionYearId: '', // Legacy field
                createdAt: now,
                ...scriptureData,
            } as Scripture);
        }
    }
    
    // Auto-recalculate minimum boundaries
    await recalculateMinimumBoundaries(yearId);
}

// === JSON Text Upload ===

export interface JsonTextUpload {
    competition_year: string;
    translations: string[];
    scriptures: Array<{
        order: number;
        reference: string;
        texts: { [key: string]: string };
    }>;
}

export function validateJsonTextUpload(data: JsonTextUpload): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.competition_year) {
        errors.push('competition_year is required');
    }
    
    if (!Array.isArray(data.translations) || data.translations.length === 0) {
        errors.push('translations array is required and must not be empty');
    }
    
    if (!Array.isArray(data.scriptures)) {
        errors.push('scriptures array is required');
    } else {
        data.scriptures.forEach((scripture, index) => {
            if (typeof scripture.order !== 'number') {
                errors.push(`Scripture ${index + 1}: order must be a number`);
            }
            if (!scripture.reference) {
                errors.push(`Scripture ${index + 1}: reference is required`);
            }
            if (!scripture.texts || typeof scripture.texts !== 'object') {
                errors.push(`Scripture ${index + 1}: texts object is required`);
            }
        });
    }
    
    return { isValid: errors.length === 0, errors };
}

export async function uploadJsonTexts(
    yearId: string, 
    data: JsonTextUpload, 
    mode: 'merge' | 'overwrite' = 'merge',
    dryRun: boolean = false
): Promise<{
    updated: number;
    created: number;
    errors: string[];
    preview?: Array<{ reference: string; action: 'create' | 'update'; texts: string[] }>;
}> {
    const validation = validateJsonTextUpload(data);
    if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    let updated = 0;
    let created = 0;
    const errors: string[] = [];
    const preview: Array<{ reference: string; action: 'create' | 'update'; texts: string[] }> = [];
    
    for (const scriptureData of data.scriptures) {
        try {
            const existing = await db.scriptures
                .where('year_id').equals(yearId)
                .and(s => s.scripture_order === scriptureData.order)
                .first();
            
            const action = existing ? 'update' : 'create';
            const existingTexts = existing?.texts || {};
            const newTexts = mode === 'overwrite' 
                ? scriptureData.texts 
                : { ...existingTexts, ...scriptureData.texts };
            
            preview.push({
                reference: scriptureData.reference,
                action,
                texts: Object.keys(scriptureData.texts),
            });
            
            if (!dryRun) {
                if (existing) {
                    await db.scriptures.put({
                        ...existing,
                        texts: newTexts,
                        updatedAt: new Date().toISOString(),
                    });
                    updated++;
                } else {
                    await db.scriptures.put({
                        id: crypto.randomUUID(),
                        year_id: yearId,
                        competitionYearId: '', // Legacy
                        reference: scriptureData.reference,
                        scripture_order: scriptureData.order,
                        text: '', // Legacy
                        texts: newTexts,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    } as Scripture);
                    created++;
                }
            }
        } catch (error) {
            errors.push(`Error processing scripture ${scriptureData.reference}: ${error}`);
        }
    }
    
    const result = { updated, created, errors };
    return dryRun ? { ...result, preview } : result;
}

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
    
    // Normalize reference for consistent matching
    const normalizeReference = (s?: string | null) =>
        (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();
    
    const normalizedRef = normalizeReference(payload.reference);
    
    // First try to find an existing scripture by reference in the same competition year
    let existingItem: any = null;
    if (normalizedRef && payload.competitionYearId) {
        // Get all scriptures for the competition year, then filter in JS
        const yearScriptures = await db.scriptures
            .where('competitionYearId')
            .equals(payload.competitionYearId)
            .toArray();
        
        existingItem = yearScriptures.find(s => normalizeReference(s.reference) === normalizedRef) || null;
    }
    
    // Use existing id if found by reference match, otherwise create new
    const id = existingItem?.id ?? payload.id ?? crypto.randomUUID();
    
    // support legacy payload.alternateTexts but prefer payload.texts
    const textsMap = (payload as any).texts ?? (payload as any).alternateTexts ?? undefined;
    
    // Use scripture_order as the unified sort field
    // If updating an existing item, preserve its scripture_order unless explicitly provided
    const scriptureOrder = (payload as any).scripture_order !== undefined
        ? (payload as any).scripture_order
        : (payload as any).sortOrder !== undefined
            ? (payload as any).sortOrder
            : existingItem?.scripture_order ?? existingItem?.sortOrder ?? 0;
    
    const item: Scripture = {
        id,
        competitionYearId: payload.competitionYearId,
        reference: payload.reference,
        text: payload.text || existingItem?.text,
        translation: payload.translation || existingItem?.translation,
        texts: textsMap || existingItem?.texts || existingItem?.alternateTexts,
        bookLangAlt: payload.bookLangAlt || existingItem?.bookLangAlt,
        scripture_order: scriptureOrder,
        sortOrder: scriptureOrder, // Keep sortOrder in sync for backward compatibility
        createdAt: existingItem?.createdAt || now,
        updatedAt: now,
    };
    
    // Remove any 'order' field if it exists to avoid confusion
    const typedItem = item as any;
    if (typedItem.order !== undefined) {
        delete typedItem.order;
    }
    
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

// Helper function to get division information for a child based on their grade and the year
export async function getChildDivisionInfo(childId: string, yearId: string) {
    try {
        const child = await db.children.get(childId);
        if (!child || !child.grade) {
            return { division: null, target: null, gradeGroup: 'N/A' };
        }

        const gradeNum = Number(child.grade);
        if (isNaN(gradeNum)) {
            return { division: null, target: null, gradeGroup: 'N/A' };
        }

        // First try to find divisions for this year (new system)
        let divisions: any[] = [];
        try {
            divisions = await db.divisions.where('year_id').equals(yearId).toArray();
        } catch (error) {
            // divisions table might not exist in some test environments
            divisions = [];
        }

        if (divisions.length > 0) {
            // New system: Find matching division by grade range
            const matchingDivision = divisions.find(d => gradeNum >= d.min_grade && gradeNum <= d.max_grade);
            if (matchingDivision) {
                const gradeLabel = (grade: number) => grade === 0 ? 'Kindergarten' : `${grade}th Grade`;
                const gradeRange = matchingDivision.min_grade === matchingDivision.max_grade 
                    ? gradeLabel(matchingDivision.min_grade)
                    : `${gradeLabel(matchingDivision.min_grade)} to ${gradeLabel(matchingDivision.max_grade)}`;
                
                return {
                    division: matchingDivision,
                    target: matchingDivision.minimum_required || null,
                    gradeGroup: `${matchingDivision.name} - ${gradeRange}`
                };
            }
        }

        // Fall back to legacy system (grade rules)
        // First check if yearId is a Bible Bee year that links to a competition year
        let competitionYearId = yearId;
        try {
            const bibleeBeeYear = await db.bible_bee_years.get(yearId);
            if (bibleeBeeYear && bibleeBeeYear.cycle_id) {
                competitionYearId = bibleeBeeYear.cycle_id;
            }
        } catch (error) {
            // ignore
        }

        const rule = await getApplicableGradeRule(competitionYearId, gradeNum);
        if (rule) {
            const gradeGroup = rule.minGrade === rule.maxGrade 
                ? `Grade ${rule.minGrade}` 
                : `Grades ${rule.minGrade}-${rule.maxGrade}`;
            return {
                division: null,
                target: rule.targetCount || null,
                gradeGroup: gradeGroup
            };
        }

        return { division: null, target: null, gradeGroup: 'N/A' };
    } catch (error) {
        console.warn('Error getting child division info:', error);
        return { division: null, target: null, gradeGroup: 'N/A' };
    }
}

// Enrollment helper (idempotent) - supports both new division-based and legacy grade rule systems
export async function enrollChildInBibleBee(childId: string, competitionYearId: string) {
    const child: Child | undefined = await db.children.get(childId);
    const gradeNum = child?.grade ? Number(child.grade) : NaN;
    const now = new Date().toISOString();

    // Check if this is a new system year (has divisions) or legacy system (has grade rules)
    let divisions: any[] = [];
    let hasNewSystem = false;
    
    try {
        divisions = await db.divisions.where('year_id').equals(competitionYearId).toArray();
        hasNewSystem = divisions.length > 0;
    } catch (error) {
        // divisions table might not exist in some test environments
        console.log('Divisions table not available, using legacy system');
        divisions = [];
        hasNewSystem = false;
    }
    
    console.log(`enrollChildInBibleBee: Processing child ${childId} for year ${competitionYearId}`);
    console.log(`System type: ${hasNewSystem ? 'new (divisions)' : 'legacy (grade rules)'}`);
    console.log(`Found ${divisions.length} divisions for this year`);

    if (hasNewSystem) {
        // New system: Use divisions - just assign all scriptures for the year
        // The division assignment is handled separately in the enrollments table
        console.log('Using new division-based system, assigning all scriptures for the year');
        
        // Get scriptures for this year - try both field names for compatibility
        let scriptures: any[] = [];
        try {
            // Try new schema first (year_id)
            scriptures = await db.scriptures.where('year_id').equals(competitionYearId).toArray();
            if (scriptures.length === 0) {
                // Fall back to legacy schema (competitionYearId)
                scriptures = await db.scriptures.where('competitionYearId').equals(competitionYearId).toArray();
            }
        } catch (error) {
            console.warn('Error fetching scriptures, trying legacy field:', error);
            scriptures = await db.scriptures.where('competitionYearId').equals(competitionYearId).toArray();
        }
        
        console.log(`Found ${scriptures.length} scriptures to assign`);
        
        if (scriptures.length === 0) {
            console.warn(`No scriptures found for year ${competitionYearId}`);
            return { assigned: 0, error: 'No scriptures found for this year' };
        }
        
        scriptures = scriptures.sort((a: any, b: any) => {
            // Prefer scripture_order as the primary field, then fall back to sortOrder
            return Number(a.scripture_order ?? a.sortOrder ?? 0) - Number(b.scripture_order ?? b.sortOrder ?? 0);
        });
        
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
            
        if (toInsert.length) {
            await db.studentScriptures.bulkAdd(toInsert);
            console.log(`Successfully assigned ${toInsert.length} scriptures to child ${childId}`);
        } else {
            console.log(`Child ${childId} already has all scriptures assigned`);
        }
        
        return { assigned: toInsert.length };
    } else {
        // Legacy system: Use grade rules
        console.log('Using legacy grade rule system');
        const rule = isNaN(gradeNum) ? null : await getApplicableGradeRule(competitionYearId, gradeNum);
        if (!rule) {
            console.warn(`No applicable grade rule found for child ${childId} with grade ${child?.grade}`);
            return null;
        }

        if (rule.type === 'scripture') {
            const scriptures = (await db.scriptures.where('competitionYearId').equals(competitionYearId).toArray())
                .sort((a: any, b: any) => {
                    // Prefer scripture_order as the primary field, then fall back to sortOrder
                    // Explicitly ignore any 'order' field
                    return Number(a.scripture_order ?? a.sortOrder ?? 0) - Number(b.scripture_order ?? b.sortOrder ?? 0);
                });
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
export type CsvRow = { reference?: string; text?: string; translation?: string; scripture_order?: number; sortOrder?: number };
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

/**
 * Compare CSV rows and JSON scripture objects by normalized reference and
 * return a preview of matches and unmatched items in both directions.
 * 
 * This function ONLY matches by reference text, ignoring order/sortOrder fields.
 *
 * rows: parsed CSV rows (CsvRow[])
 * jsonItems: array of scripture-like objects loaded from JSON seed (each should have a `reference` field)
 *
 * Returns: { matches, csvOnly, jsonOnly, stats }
 */
export function previewCsvJsonMatches(rows: CsvRow[], jsonItems: any[]) {
    const normalizeReference = (s?: string | null) =>
        (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();

    const csvMap = new Map<string, { row: CsvRow; index: number }>();
    rows.forEach((r, i) => {
        const ref = normalizeReference(r.reference);
        if (ref) csvMap.set(ref, { row: r, index: i });
    });

    const jsonMap = new Map<string, { item: any; index: number }>();
    // Match strictly on the JSON `reference` field only, ignoring order fields completely.
    // If a JSON object does not include `reference`, we do not attempt fallbacks; 
    // it will be treated as json-only without a normalized key.
    (jsonItems || []).forEach((j, i) => {
        // Explicitly ignore any 'order' field in JSON if present
        if (j && j.order !== undefined) {
            delete j.order; // Remove order field to avoid confusion
        }
        
        const rawRef = j?.reference ?? '';
        const ref = normalizeReference(rawRef);
        if (ref) {
            jsonMap.set(ref, { item: j, index: i });
        }
    });

    const matches: Array<{ reference: string; csv: { row: CsvRow; index: number } | null; json: { item: any; index: number } | null }> = [];
    const csvOnly: Array<{ reference: string; row: CsvRow; index: number }> = [];
    const jsonOnly: Array<{ reference: string | null; item: any; index: number }> = [];

    // union of keys
    const seen = new Set<string>();
    for (const key of csvMap.keys()) seen.add(key);
    for (const key of jsonMap.keys()) seen.add(key);

    for (const key of Array.from(seen)) {
        const c = csvMap.get(key) ?? null;
        const j = jsonMap.get(key) ?? null;
        if (c && j) {
            matches.push({ reference: key, csv: c, json: j });
        } else if (c && !j) {
            csvOnly.push({ reference: key, row: c.row, index: c.index });
        } else if (j && !c) {
            jsonOnly.push({ reference: key, item: j.item, index: j.index });
        }
    }

    // Include any JSON items that did not have a reference field at all so they are
    // explicitly shown as unmatched.
    (jsonItems || []).forEach((j, i) => {
        const rawRef = j?.reference ?? '';
        const ref = normalizeReference(rawRef);
        if (!ref) {
            jsonOnly.push({ reference: null, item: j, index: i });
        }
    });

    const stats = {
        csvCount: rows.length,
        jsonCount: (jsonItems || []).length,
        matches: matches.length,
        csvOnly: csvOnly.length,
        jsonOnly: jsonOnly.length,
    };

    return { matches, csvOnly, jsonOnly, stats };
}

export async function commitCsvRowsToYear(rows: CsvRow[], competitionYearId: string) {
    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    // Normalize reference helper for consistent matching
    const normalizeReference = (s?: string | null) =>
        (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();
    
    // Get all existing scriptures for this year once
    const allExistingScriptures = await db.scriptures
        .where('competitionYearId')
        .equals(competitionYearId)
        .toArray();
        
    // Create a map of normalized references to existing scriptures for faster lookup
    const existingScriptureMap = new Map();
    allExistingScriptures.forEach(s => {
        const normalizedRef = normalizeReference(s.reference);
        if (normalizedRef) {
            existingScriptureMap.set(normalizedRef, s);
        }
    });

    // Process rows one-by-one with precise reference matching
    for (const r of rows) {
        const ref = (r.reference ?? '').trim();
        if (!ref) continue; // validation should have caught this, but be defensive

        // Use our robust normalizeReference helper
        const normalizedRef = normalizeReference(ref);
        
        // Look up existing scripture by normalized reference
        const existing = existingScriptureMap.get(normalizedRef);

        const textsMap = (r as any).texts ?? (r as any).alternateTexts ?? undefined;
        // Use scripture_order as the unified field for sort order
        // Extract from CSV row if available
        const scriptureOrder = (r as any).scripture_order ?? (r as any).sortOrder;

        if (existing) {
            // When updating, preserve the CSV row's scripture_order if provided,
            // otherwise keep the existing scripture_order
            const resolvedOrder = scriptureOrder !== undefined 
                ? scriptureOrder 
                : existing.scripture_order ?? existing.sortOrder ?? 0;
                
            const updatedItem = {
                ...existing,
                reference: ref,
                text: r.text ?? existing.text,
                translation: r.translation ?? existing.translation,
                texts: textsMap ?? existing.texts,
                // Use scripture_order as the primary field, but keep sortOrder for compatibility
                scripture_order: resolvedOrder,
                sortOrder: resolvedOrder,
                updatedAt: now,
            } as any;
            // Ensure we don't keep stale 'order' field at all
            if (updatedItem.order !== undefined) {
                delete updatedItem.order; // Remove order field completely
            }
            await db.scriptures.put(updatedItem);
            updated++;
        } else {
            // For new entries, use CSV row's scripture_order if available, or calculate based on position
            const newOrder = scriptureOrder !== undefined ? scriptureOrder : inserted + updated;
            const newItem = {
                id: crypto.randomUUID(),
                competitionYearId,
                reference: ref,
                text: r.text ?? '',
                translation: r.translation,
                texts: textsMap,
                scripture_order: newOrder,
                sortOrder: newOrder, // Keep sortOrder for compatibility
                createdAt: now,
                updatedAt: now,
            } as any;
            
            // Ensure we never store an 'order' field
            if (newItem.order !== undefined) {
                delete newItem.order;
            }
            
            await db.scriptures.put(newItem);
            inserted++;
        }
    }

    return { inserted, updated };
}

// === New Bible Bee Year Management ===

export async function createBibleBeeYear(payload: Omit<BibleBeeYear, 'id' | 'created_at'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    
    // If setting this year as active, deactivate all other years first
    if (payload.is_active) {
        // Deactivate all existing Bible Bee years. Use a full scan and filter
        // in JS to avoid passing unexpected values into IDB key-range queries.
        const allYears = await db.bible_bee_years.toArray();
        const activeYears = allYears.filter(y => {
            const val: any = (y as any).is_active;
            return val === true || val === 1 || val == '1';
        });
        for (const year of activeYears) {
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
        cycle_id: payload.cycle_id,
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
        // Deactivate all existing Bible Bee years except this one.
        const allYears = await db.bible_bee_years.toArray();
        const activeYears = allYears.filter(y => {
            const val: any = (y as any).is_active;
            return val === true || val === 1 || val == '1';
        });
        for (const year of activeYears) {
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
    // Get the Bible Bee year to determine which registration cycle to use
    const bibleYear = await db.bible_bee_years.get(yearId);
    if (!bibleYear) {
        throw new Error(`Bible Bee year ${yearId} not found`);
    }
    
    // If the Bible Bee year has a cycle_id, use that specific cycle
    // Otherwise fall back to the active cycle (legacy behavior)
    let currentCycle = null;
    
    console.log('DEBUG: Bible Bee year being processed:', bibleYear);
    
    if (bibleYear.cycle_id) {
        console.log('DEBUG: Using Bible Bee year linked cycle_id:', bibleYear.cycle_id);
        currentCycle = await db.registration_cycles.get(bibleYear.cycle_id);
        if (!currentCycle) {
            console.error(`DEBUG: Registration cycle ${bibleYear.cycle_id} linked to Bible Bee year not found`);
            throw new Error(`Registration cycle ${bibleYear.cycle_id} linked to Bible Bee year not found`);
        }
        console.log('DEBUG: Found linked registration cycle:', currentCycle);
    } else {
        console.log('DEBUG: No cycle_id found on Bible Bee year, falling back to active cycle');
        // Fall back to active cycle for backward compatibility
        currentCycle = (await db.registration_cycles.toArray()).find(c => {
            const val: any = (c as any)?.is_active;
            return val === true || val === 1 || String(val) === '1';
        }) ?? null;
        if (!currentCycle) {
            console.error('DEBUG: No active registration cycle found and Bible Bee year has no linked cycle');
            throw new Error('No active registration cycle found and Bible Bee year has no linked cycle');
        }
        console.log('DEBUG: Using active registration cycle as fallback:', currentCycle);
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
    // Avoid using a compound .equals(...) query here because historic data may contain
    // mixed-type keys (numbers/strings/booleans) which can cause IDBKeyRange DataError.
    // Instead, perform a safe in-JS filter after loading enrollments.
    let bibleBeeEnrollments: MinistryEnrollment[] = [];
    try {
        const allEnrollments = await db.ministry_enrollments.toArray();
        console.log(`DEBUG: Total ministry enrollments in database: ${allEnrollments.length}`);
        
        // Log a sample of enrollments to check their structure
        if (allEnrollments.length > 0) {
            console.log('DEBUG: Sample ministry enrollment:', allEnrollments[0]);
        }
        
        bibleBeeEnrollments = allEnrollments.filter((e: MinistryEnrollment) => {
            // Compare as strings to be tolerant of mixed stored representations
            const matchesMinistry = String((e as any).ministry_id) === String(ministryId);
            const matchesCycle = String((e as any).cycle_id) === String(cycleId);
            const isEnrolled = e.status === 'enrolled';
            
            const matches = matchesMinistry && matchesCycle && isEnrolled;
            
            // Debug output for enrollments that match ministry but not cycle
            if (matchesMinistry && !matchesCycle && isEnrolled) {
                console.log(`DEBUG: Found enrollment for Bible Bee ministry but wrong cycle. Expected: ${cycleId}, Found: ${(e as any).cycle_id}`, e);
            }
            
            return matches;
        });

        console.log(`DEBUG: Bible Bee enrollments found (filtered): ${bibleBeeEnrollments.length} out of ${allEnrollments.length} total enrollments`);
        
        // If no enrollments were found, check what cycles are being used in ministry_enrollments
        if (bibleBeeEnrollments.length === 0) {
            const uniqueCycles = [...new Set(allEnrollments.map(e => e.cycle_id))];
            console.log('DEBUG: Unique cycle_ids in ministry_enrollments:', uniqueCycles);
            
            // Check enrollments specifically for Bible Bee ministry regardless of cycle
            const bibleBeeMinistryEnrollments = allEnrollments.filter(e => 
                String((e as any).ministry_id) === String(ministryId) && 
                e.status === 'enrolled'
            );
            console.log(`DEBUG: Bible Bee ministry enrollments (any cycle): ${bibleBeeMinistryEnrollments.length}`);
            
            if (bibleBeeMinistryEnrollments.length > 0) {
                const cyclesWithBibleBeeEnrollments = [...new Set(bibleBeeMinistryEnrollments.map(e => e.cycle_id))];
                console.log('DEBUG: Cycles with Bible Bee enrollments:', cyclesWithBibleBeeEnrollments);
            }
        }
    } catch (error) {
        console.error('Error scanning ministry_enrollments for Bible Bee enrollments:', error);
        throw error;
    }

    const childIds = bibleBeeEnrollments.map((e: MinistryEnrollment) => e.child_id).filter(Boolean);
    console.log(`DEBUG: Child IDs from Bible Bee enrollments: ${childIds.length}`, childIds);
    
    let children: Child[] = [];
    if (childIds.length > 0) {
        try {
            // anyOf can still fail if keys are invalid; attempt it but fall back to a full scan
            children = await db.children.where('child_id').anyOf(childIds).toArray();
            console.log(`DEBUG: Children retrieved: ${children.length} out of ${childIds.length} child IDs`);
            
            // Log any missing children
            if (children.length < childIds.length) {
                const foundIds = children.map(c => c.child_id);
                const missingIds = childIds.filter(id => !foundIds.includes(id));
                console.log(`DEBUG: Missing children IDs: ${missingIds.length}`, missingIds);
            }
            
            // Log grades of found children
            const grades = children.map(c => c.grade);
            console.log('DEBUG: Grades of children found:', grades);
            
            // Check if any children are in grade 9 specifically
            const grade9Children = children.filter(c => String(c.grade) === '9');
            console.log(`DEBUG: Children in grade 9: ${grade9Children.length}`, grade9Children);
            
        } catch (error) {
            console.warn('anyOf(childIds) failed, falling back to full children scan:', error);
            const allChildren = await db.children.toArray();
            console.log(`DEBUG: Total children in database: ${allChildren.length}`);
            children = allChildren.filter(c => childIds.includes(c.child_id));
            console.log(`DEBUG: Children filtered from full scan: ${children.length}`);
        }
    } else {
        console.log('DEBUG: No child IDs found in Bible Bee enrollments');
        children = [];
    }
    
    // Get divisions for this year
    const divisions = await db.divisions.where('year_id').equals(yearId).toArray();
    console.log(`DEBUG: Divisions for this year: ${divisions.length}`, divisions);
    
    // Check if any divisions cover grade 9
    const grade9Divisions = divisions.filter(d => d.min_grade <= 9 && d.max_grade >= 9);
    console.log(`DEBUG: Divisions that include grade 9: ${grade9Divisions.length}`, grade9Divisions);
    
    // Get existing overrides
    const overrides = await db.enrollment_overrides.where('year_id').equals(yearId).toArray();
    const overrideMap = new Map(overrides.map(o => [o.child_id, o]));
    console.log(`DEBUG: Enrollment overrides: ${overrides.length}`, overrides);
    
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
            console.log(`DEBUG: Child ${child.child_id} has unknown grade code`);
            preview.status = 'unknown_grade';
            counts.unknown_grade++;
            previews.push(preview);
            continue;
        }
        
        console.log(`DEBUG: Processing child: ${child.first_name} ${child.last_name}, grade: ${child.grade}, grade code: ${gradeCode}`);
        
        // Find matching divisions
        const matchingDivisions = divisions.filter(d => {
            const matches = gradeCode >= d.min_grade && gradeCode <= d.max_grade;
            console.log(`DEBUG: Division ${d.name} (grades ${d.min_grade}-${d.max_grade}) matches child grade ${gradeCode}: ${matches}`);
            return matches;
        });
        
        console.log(`DEBUG: Matching divisions for child ${child.child_id}: ${matchingDivisions.length}`, 
            matchingDivisions.map(d => `${d.name} (${d.min_grade}-${d.max_grade})`));
        
        if (matchingDivisions.length === 0) {
            console.log(`DEBUG: No matching division for child ${child.child_id} with grade ${child.grade} (code: ${gradeCode})`);
            preview.status = 'unassigned';
            counts.unassigned++;
        } else if (matchingDivisions.length === 1) {
            preview.proposed_division = {
                id: matchingDivisions[0].id,
                name: matchingDivisions[0].name,
            };
            preview.status = 'proposed';
            counts.proposed++;
            console.log(`DEBUG: Child ${child.child_id} matched to division ${matchingDivisions[0].name}`);
        } else {
            // Multiple matches shouldn't happen due to non-overlap constraint
            console.log(`DEBUG: Child ${child.child_id} matched multiple divisions: ${matchingDivisions.map(d => d.name).join(', ')}`);
            preview.status = 'multiple_matches';
            counts.unassigned++;
        }
        
        previews.push(preview);
    }
    
    return { previews, counts };
}

// Helper function to sync scriptures for children who are enrolled but missing scriptures
export async function syncScripturesForEnrolledChildren(yearId: string): Promise<{
    synced: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let synced = 0;
    
    try {
        // Get all enrollments for this year
        const enrollments = await db.enrollments.where('year_id').equals(yearId).toArray();
        
        for (const enrollment of enrollments) {
            try {
                // Check if child already has scriptures assigned
                const existingScriptures = await db.studentScriptures
                    .where({ childId: enrollment.child_id, competitionYearId: yearId })
                    .toArray();
                
                if (existingScriptures.length === 0) {
                    // Child is enrolled but has no scriptures - assign them
                    await enrollChildInBibleBee(enrollment.child_id, yearId);
                    synced++;
                    console.log(`Synced scriptures for child ${enrollment.child_id} in year ${yearId}`);
                }
            } catch (error) {
                errors.push(`Error syncing scriptures for child ${enrollment.child_id}: ${error}`);
            }
        }
    } catch (error) {
        errors.push(`Error syncing scriptures: ${error}`);
    }
    
    return { synced, errors };
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
                
                // Also assign scriptures for the child using the legacy system
                try {
                    await enrollChildInBibleBee(p.child_id, yearId);
                } catch (scriptureError) {
                    console.warn(`Warning: Failed to assign scriptures for child ${p.child_name}:`, scriptureError);
                    // Don't add to errors array since enrollment succeeded
                }
                
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
                
                // Also assign scriptures for the child using the legacy system
                try {
                    await enrollChildInBibleBee(p.child_id, yearId);
                } catch (scriptureError) {
                    console.warn(`Warning: Failed to assign scriptures for child ${p.child_name}:`, scriptureError);
                    // Don't add to errors array since enrollment succeeded
                }
                
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
    // Avoid using compound .equals([...]) which can throw if stored key types
    // are mixed. Perform a safe scan and delete matching overrides.
    const all = await db.enrollment_overrides.toArray();
    const matches = all.filter(o => String(o.year_id) === String(yearId) && String(o.child_id) === String(childId));
    for (const m of matches) {
        await db.enrollment_overrides.delete(m.id);
    }
}

// === Minimum Boundary Calculation ===

export async function recalculateMinimumBoundaries(yearId: string) {
    const divisions = await db.divisions.where('year_id').equals(yearId).toArray();
    // Try both field names for backward compatibility
    const scriptures = await db.scriptures
        .where('competitionYearId').equals(yearId)
        .or('year_id').equals(yearId)
        .sortBy('scripture_order');
    
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
    
    // Normalize reference helper for consistent matching
    const normalizeReference = (s?: string | null) =>
        (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();
            
    // Get all existing scriptures for this year once - try both field names
    // for backward compatibility
    const existingScriptures = await db.scriptures
        .where('competitionYearId').equals(yearId)
        .or('year_id').equals(yearId)
        .toArray();
    
    for (const row of rows) {
        // Match by normalized reference first, then fall back to scripture_number if needed
        const normalizedRef = normalizeReference(row.reference);
        let existing = existingScriptures.find(s => normalizeReference(s.reference) === normalizedRef);
        
        // Fall back to scripture_number only if reference match fails
        if (!existing) {
            existing = existingScriptures.find(s => s.scripture_number === row.scripture_number);
        }
        
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
                competitionYearId: yearId, // Use the same yearId for both fields
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
        // No order field at all - we completely match by reference text only
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
            // No order field check - completely removed from type definition
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
    
    // Normalize reference helper for consistent matching
    const normalizeReference = (s?: string | null) =>
        (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();
            
    for (const scriptureData of data.scriptures) {
        try {
            // Match by normalized reference text, not by order field
            const normalizedRef = normalizeReference(scriptureData.reference);
            
            // Try both field names to be compatible with older data
            const allScriptures = await db.scriptures
                .where('competitionYearId').equals(yearId)
                .or('year_id').equals(yearId)
                .toArray();
            
            // Debug log for James 2:17 and Ruth 1:16
            if (scriptureData.reference && 
                (scriptureData.reference.includes('James 2:17') || 
                 scriptureData.reference.includes('Ruth 1:16'))) {
                console.log('DEBUG uploadJsonTexts - Processing:', {
                    reference: scriptureData.reference,
                    normalizedRef,
                    allScriptures: allScriptures.map(s => ({
                        id: s.id,
                        ref: s.reference,
                        normalizedExistingRef: normalizeReference(s.reference)
                    }))
                });
            }
                
            const existing = allScriptures.find(s => 
                normalizeReference(s.reference) === normalizedRef
            );
            
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
                    // Calculate the next available scripture_order
                    // Try both field names to be compatible with older data
                    const allScriptures = await db.scriptures
                        .where('competitionYearId').equals(yearId)
                        .or('year_id').equals(yearId)
                        .toArray();
                        
                    const maxOrder = Math.max(0, ...allScriptures.map(s => s.scripture_order || s.sortOrder || 0));
                    const nextOrder = maxOrder + 1;
                    
                    await db.scriptures.put({
                        id: crypto.randomUUID(),
                        year_id: yearId, // For backward compatibility
                        competitionYearId: yearId, // Primary field
                        reference: scriptureData.reference,
                        scripture_order: nextOrder, // Use next available order, not from JSON
                        sortOrder: nextOrder, // Keep sortOrder in sync
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

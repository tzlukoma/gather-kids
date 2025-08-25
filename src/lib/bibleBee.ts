import { db } from './db';
import type { CompetitionYear, Scripture, GradeRule, StudentScripture, StudentEssay, Child } from './types';

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
    await db.competitionYears.add(item);
    return item;
}

export async function upsertScripture(payload: Omit<Scripture, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? crypto.randomUUID();
    const item: Scripture = {
        id,
        competitionYearId: payload.competitionYearId,
        reference: payload.reference,
        text: payload.text,
        translation: payload.translation,
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
        const scriptures = await db.scriptures.where('competitionYearId').equals(competitionYearId).toArray();
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
        sortOrder: r.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
    }));
    for (const s of toUpsert) await db.scriptures.put(s);
    return { inserted: toUpsert.length };
}

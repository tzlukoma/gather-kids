import type { Child } from '../types';
import {
    canonicalizeGradeForStorage,
    gradeCodeToLabel,
    gradeToCode,
    normalizeGradeDisplay,
    suggestNextGradeCode,
} from '../gradeUtils';
export type HouseholdPrefillGradeHint = {
    lastYearLabel: string;
    suggestedLabel: string;
    suggestedGrade: string;
};

export function isChoirMinistryCode(code: string | undefined): boolean {
    if (!code) return false;
    return code.startsWith('choir-');
}

export function stripChoirSelections<
    T extends { ministrySelections?: Record<string, boolean | undefined> },
>(child: T): T {
    if (!child.ministrySelections) return child;
    const ministrySelections = Object.fromEntries(
        Object.entries(child.ministrySelections).filter(
            ([code]) => !isChoirMinistryCode(code),
        ),
    );
    return { ...child, ministrySelections };
}

export function buildGradeHintForChild(child: Child): HouseholdPrefillGradeHint | null {
    const lastYearCode = gradeToCode(child.grade);
    if (lastYearCode === null) return null;
    const suggestedCode = suggestNextGradeCode(lastYearCode);
    if (suggestedCode === null) return null;
    return {
        lastYearLabel: normalizeGradeDisplay(child.grade),
        suggestedLabel: gradeCodeToLabel(suggestedCode),
        suggestedGrade: canonicalizeGradeForStorage(String(suggestedCode)),
    };
}

export function applyReturningGradePrefill(child: Child): Child {
    const hint = buildGradeHintForChild(child);
    if (!hint) {
        return { ...child, grade: canonicalizeGradeForStorage(child.grade) };
    }
    return { ...child, grade: hint.suggestedGrade };
}

/**
 * Grade normalization utilities for Bible Bee
 * Converts free-text grade strings to numeric 0-12 codes
 * 0 = Kindergarten, 1-12 = grades
 */

export function gradeToCode(gradeText?: string): number | null {
    if (!gradeText) return null;
    
    const t = gradeText.toLowerCase().trim();
    
    // Direct kindergarten matches
    if (['k', 'kg', 'kinder', 'kindergarten'].includes(t)) {
        return 0;
    }
    
    // Simple numeric grades 1-12
    const numMatch = t.match(/^([1-9]|1[0-2])$/);
    if (numMatch) {
        return parseInt(numMatch[1], 10);
    }
    
    // Ordinal patterns (1st, 2nd, etc.)
    const ordinalMap: Record<string, number> = {
        '1st': 1, 'first': 1,
        '2nd': 2, 'second': 2,
        '3rd': 3, 'third': 3,
        '4th': 4, 'fourth': 4,
        '5th': 5, 'fifth': 5,
        '6th': 6, 'sixth': 6,
        '7th': 7, 'seventh': 7,
        '8th': 8, 'eighth': 8,
        '9th': 9, 'ninth': 9,
        '10th': 10, 'tenth': 10,
        '11th': 11, 'eleventh': 11,
        '12th': 12, 'twelfth': 12,
    };
    
    if (ordinalMap[t] !== undefined) {
        return ordinalMap[t];
    }
    
    // Grade + kindergarten patterns
    const gradeKMatch = t.match(/^grade\s*(k|kindergarten)$/);
    if (gradeKMatch) {
        return 0;
    }
    
    // Grade + number patterns
    const gradeNumMatch = t.match(/^grade\s*([1-9]|1[0-2])$/);
    if (gradeNumMatch) {
        return parseInt(gradeNumMatch[1], 10);
    }
    
    // Number + ordinal + grade patterns (e.g., "1st grade", "2nd grade")
    const ordinalGradeMatch = t.match(/^([1-9]|1[0-2])(st|nd|rd|th)\s*grade$/);
    if (ordinalGradeMatch) {
        return parseInt(ordinalGradeMatch[1], 10);
    }
    
    return null;
}

/**
 * Convert numeric grade code to human-friendly label
 */
export function gradeCodeToLabel(gradeCode: number): string {
    if (gradeCode === 0) return 'Kindergarten';
    if (gradeCode === 1) return '1st grade';
    if (gradeCode === 2) return '2nd grade';
    if (gradeCode === 3) return '3rd grade';
    if (gradeCode >= 4 && gradeCode <= 12) return `${gradeCode}th grade`;
    return `Grade ${gradeCode}`;
}

/**
 * Validate grade code is in valid range (0-12)
 */
export function isValidGradeCode(gradeCode: number): boolean {
    return Number.isInteger(gradeCode) && gradeCode >= 0 && gradeCode <= 12;
}

/**
 * Check if two grade ranges overlap
 */
export function doGradeRangesOverlap(
    min1: number, max1: number,
    min2: number, max2: number
): boolean {
    return !(max1 < min2 || min1 > max2);
}
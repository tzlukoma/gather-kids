/**
 * Grade normalization utilities for Bible Bee
 * Converts free-text grade strings to numeric 0-12 codes
 * 0 = Kindergarten, 1-12 = grades
 */

export function gradeToCode(gradeText?: string): number | null {
    console.log(`DEBUG: gradeToCode called with: "${gradeText}"`);
    
    if (!gradeText) {
        console.log('DEBUG: gradeToCode - no grade text provided');
        return null;
    }
    
    const t = gradeText.toLowerCase().trim();
    console.log(`DEBUG: gradeToCode - normalized grade text: "${t}"`);
    
    // Direct kindergarten matches
    if (['k', 'kg', 'kinder', 'kindergarten'].includes(t)) {
        console.log('DEBUG: gradeToCode - matched kindergarten pattern');
        return 0;
    }
    
    // Simple numeric grades 0-12 (0 maps to Kindergarten)
    const numMatch = t.match(/^(0|[1-9]|1[0-2])$/);
    if (numMatch) {
        const result = parseInt(numMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched simple numeric pattern: ${result}`);
        return result;
    }
    
    // Ordinal patterns (1st, 2nd, etc.)
    const ordinalMap: Record<string, number> = {
        // include 0-based ordinals for possible stored forms
        '0th': 0, 'zeroth': 0,
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
        const result = ordinalMap[t];
        console.log(`DEBUG: gradeToCode - matched ordinal text: ${result}`);
        return result;
    }
    
    // Grade + kindergarten patterns
    const gradeKMatch = t.match(/^grade\s*(k|kindergarten)$/);
    if (gradeKMatch) {
        console.log('DEBUG: gradeToCode - matched grade+kindergarten pattern');
        return 0;
    }
    
    // Grade + number patterns
    const gradeNumMatch = t.match(/^grade\s*(0|[1-9]|1[0-2])$/);
    if (gradeNumMatch) {
        const result = parseInt(gradeNumMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched grade+number pattern: ${result}`);
        return result;
    }
    
    // Number + ordinal + grade patterns (e.g., "1st grade", "2nd grade")
    const ordinalGradeMatch = t.match(/^(0|[1-9]|1[0-2])(st|nd|rd|th)\s*grade$/);
    if (ordinalGradeMatch) {
        const result = parseInt(ordinalGradeMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched ordinal+grade pattern: ${result}`);
        return result;
    }
    
    // Special case for grade 9
    if (t === '9' || t === '9th' || t === 'ninth' || t === 'grade 9' || t === '9th grade') {
        console.log('DEBUG: gradeToCode - SPECIAL ATTENTION for grade 9: 9');
    }
    
    console.log(`DEBUG: gradeToCode - all parsing methods failed for "${gradeText}"`);
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
/**
 * Grade normalization utilities for Bible Bee
 * Converts free-text grade strings to numeric -1 to 12 codes
 * -1 = Pre-K, 0 = Kindergarten, 1-12 = grades 1-12
 */

export function gradeToCode(gradeText?: string): number | null {
    console.log(`DEBUG: gradeToCode called with: "${gradeText}"`);
    
    if (!gradeText) {
        console.log('DEBUG: gradeToCode - no grade text provided');
        return null;
    }
    
    const t = gradeText.toLowerCase().trim();
    console.log(`DEBUG: gradeToCode - normalized grade text: "${t}"`);
    
    // Direct Pre-K matches
    if (['pre-k', 'prek', 'pre-kinder', 'pre-kindergarten', 'prekinder', 'prekindergarten'].includes(t)) {
        console.log('DEBUG: gradeToCode - matched pre-k pattern');
        return -1;
    }
    
    // Direct kindergarten matches
    if (['k', 'kg', 'kinder', 'kindergarten'].includes(t)) {
        console.log('DEBUG: gradeToCode - matched kindergarten pattern');
        return 0;
    }
    
    // Simple numeric grades -1 to 12 (-1 maps to Pre-K, 0 maps to Kindergarten)
    const numMatch = t.match(/^(-1|0|[1-9]|1[0-2])$/);
    if (numMatch) {
        const result = parseInt(numMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched simple numeric pattern: ${result}`);
        return result;
    }
    
    // Ordinal patterns (1st, 2nd, etc.)
    const ordinalMap: Record<string, number> = {
        '1st': 1, 'first': 1, // 1st Grade
        '2nd': 2, 'second': 2, // 2nd Grade
        '3rd': 3, 'third': 3, // 3rd Grade
        '4th': 4, 'fourth': 4, // 4th Grade
        '5th': 5, 'fifth': 5, // 5th Grade
        '6th': 6, 'sixth': 6, // 6th Grade
        '7th': 7, 'seventh': 7, // 7th Grade
        '8th': 8, 'eighth': 8, // 8th Grade
        '9th': 9, 'ninth': 9, // 9th Grade
        '10th': 10, 'tenth': 10, // 10th Grade
        '11th': 11, 'eleventh': 11, // 11th Grade
        '12th': 12, 'twelfth': 12, // 12th Grade
    };
    
    if (ordinalMap[t] !== undefined) {
        const result = ordinalMap[t];
        console.log(`DEBUG: gradeToCode - matched ordinal text: ${result}`);
        return result;
    }
    
    // Grade + pre-k patterns
    const gradePreKMatch = t.match(/^grade\s*(pre-k|prek|pre-kindergarten)$/);
    if (gradePreKMatch) {
        console.log('DEBUG: gradeToCode - matched grade+pre-k pattern');
        return -1;
    }
    
    // Grade + kindergarten patterns
    const gradeKMatch = t.match(/^grade\s*(k|kindergarten)$/);
    if (gradeKMatch) {
        console.log('DEBUG: gradeToCode - matched grade+kindergarten pattern');
        return 0;
    }
    
    // Grade + number patterns
    const gradeNumMatch = t.match(/^grade\s*(-1|0|[1-9]|1[0-2])$/);
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
    
    console.log(`DEBUG: gradeToCode - all parsing methods failed for "${gradeText}"`);
    return null;
}

/**
 * Convert numeric grade code to human-friendly label
 */
export function gradeCodeToLabel(gradeCode: number): string {
    if (gradeCode === -1) return 'Pre-K';
    if (gradeCode === 0) return 'Kindergarten';
    if (gradeCode === 1) return '1st Grade';
    if (gradeCode === 2) return '2nd Grade';
    if (gradeCode === 3) return '3rd Grade';
    if (gradeCode === 4) return '4th Grade';
    if (gradeCode === 5) return '5th Grade';
    if (gradeCode === 6) return '6th Grade';
    if (gradeCode === 7) return '7th Grade';
    if (gradeCode === 8) return '8th Grade';
    if (gradeCode === 9) return '9th Grade';
    if (gradeCode === 10) return '10th Grade';
    if (gradeCode === 11) return '11th Grade';
    if (gradeCode === 12) return '12th Grade';
    
    return `Grade ${gradeCode}`;
}

/**
 * Convert any grade format to a consistent UI-friendly display
 */
export function normalizeGradeDisplay(gradeText?: string | number): string {
    if (gradeText === null || gradeText === undefined) return 'Unknown';
    
    // If it's already a number, convert using gradeCodeToLabel
    if (typeof gradeText === 'number') {
        return gradeCodeToLabel(gradeText);
    }
    
    // Convert to string and trim
    const normalized = gradeText.toString().trim();
    
    // Handle empty string
    if (normalized === '') return 'Unknown';
    
    // First, try to parse as a number (for grade codes like "-1", "0", "8", etc.)
    const numericGrade = parseInt(normalized, 10);
    if (!isNaN(numericGrade) && numericGrade >= -1 && numericGrade <= 12) {
        return gradeCodeToLabel(numericGrade);
    }
    
    // Handle common variations directly
    const gradeMap: Record<string, string> = {
        'pre-k': 'Pre-K',
        'prek': 'Pre-K',
        'preK': 'Pre-K',
        '-1': 'Pre-K',
        'k': 'Kindergarten',
        'kg': 'Kindergarten',
        'kinder': 'Kindergarten',
        'kindergarten': 'Kindergarten',
        '0': 'Kindergarten',
        '1': '1st Grade',
        '2': '2nd Grade', 
        '3': '3rd Grade',
        '4': '4th Grade',
        '5': '5th Grade',
        '6': '6th Grade',
        '7': '7th Grade',
        '8': '8th Grade',
        '9': '9th Grade',
        '10': '10th Grade',
        '11': '11th Grade',
        '12': '12th Grade',
    };
    
    const key = normalized.toLowerCase();
    if (gradeMap[key]) {
        return gradeMap[key];
    }
    
    // If all else fails, try gradeToCode for complex parsing
    const gradeCode = gradeToCode(gradeText);
    if (gradeCode !== null) {
        return gradeCodeToLabel(gradeCode);
    }
    
    return normalized; // Return original if no mapping found
}

/**
 * Get sort order for a grade string
 */
export function getGradeSortOrder(gradeText?: string | number): number {
    if (!gradeText && gradeText !== 0) return 99;
    
    // Try to get numeric grade code first
    let gradeCode: number | null = null;
    
    if (typeof gradeText === 'number') {
        gradeCode = gradeText;
    } else {
        gradeCode = gradeToCode(gradeText);
    }
    
    if (gradeCode !== null) {
        return gradeCode;
    }
    
    // Fallback for common grade variations
    const normalized = gradeText.toString().toLowerCase().trim();
    const fallbackOrder: Record<string, number> = {
        'pre-k': -1,
        'prek': -1,
        'kindergarten': 0,
        'k': 0,
        'kg': 0,
        '1st grade': 1,
        '2nd grade': 2,
        '3rd grade': 3,
        '4th grade': 4,
        '5th grade': 5,
        '6th grade': 6,
        '7th grade': 7,
        '8th grade': 8,
        '9th grade': 9,
        '10th grade': 10,
        '11th grade': 11,
        '12th grade': 12,
    };
    
    return fallbackOrder[normalized] ?? 99;
}

/**
 * Validate grade code is in valid range (-1 to 12)
 */
export function isValidGradeCode(gradeCode: number): boolean {
    return Number.isInteger(gradeCode) && gradeCode >= -1 && gradeCode <= 12;
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
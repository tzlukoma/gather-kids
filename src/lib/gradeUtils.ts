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
    
    // Direct Pre-K matches
    if (['pre-k', 'prek', 'pre-kinder', 'pre-kindergarten'].includes(t)) {
        console.log('DEBUG: gradeToCode - matched pre-k pattern');
        return 0;
    }
    
    // Direct kindergarten matches
    if (['k', 'kg', 'kinder', 'kindergarten'].includes(t)) {
        console.log('DEBUG: gradeToCode - matched kindergarten pattern');
        return 1;
    }
    
    // Simple numeric grades 0-13 (0 maps to Pre-K, 1 maps to Kindergarten)
    const numMatch = t.match(/^(0|[1-9]|1[0-3])$/);
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
        '13th': 13, 'thirteenth': 13,
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
        return 0;
    }
    
    // Grade + kindergarten patterns
    const gradeKMatch = t.match(/^grade\s*(k|kindergarten)$/);
    if (gradeKMatch) {
        console.log('DEBUG: gradeToCode - matched grade+kindergarten pattern');
        return 1;
    }
    
    // Grade + number patterns
    const gradeNumMatch = t.match(/^grade\s*(0|[1-9]|1[0-3])$/);
    if (gradeNumMatch) {
        const result = parseInt(gradeNumMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched grade+number pattern: ${result}`);
        return result;
    }
    
    // Number + ordinal + grade patterns (e.g., "1st grade", "2nd grade")
    const ordinalGradeMatch = t.match(/^(0|[1-9]|1[0-3])(st|nd|rd|th)\s*grade$/);
    if (ordinalGradeMatch) {
        const result = parseInt(ordinalGradeMatch[1], 10);
        console.log(`DEBUG: gradeToCode - matched ordinal+grade pattern: ${result}`);
        return result;
    }
    
    // Special case for grade 9
    if (t === '9' || t === '9th' || t === 'ninth' || t === 'grade 9' || t === '9th grade') {
        console.log('DEBUG: gradeToCode - SPECIAL ATTENTION for grade 9: 10');
        return 10;
    }
    
    console.log(`DEBUG: gradeToCode - all parsing methods failed for "${gradeText}"`);
    return null;
}

/**
 * Convert numeric grade code to human-friendly label
 */
export function gradeCodeToLabel(gradeCode: number): string {
    if (gradeCode === 0) return 'Pre-K';
    if (gradeCode === 1) return 'Kindergarten';
    if (gradeCode === 2) return '1st Grade';
    if (gradeCode === 3) return '2nd Grade';
    if (gradeCode === 4) return '3rd Grade';
    
    // Handle grades 5-12 with proper ordinal formatting
    if (gradeCode >= 5 && gradeCode <= 12) {
        const lastDigit = gradeCode % 10;
        const lastTwoDigits = gradeCode % 100;
        
        // Special cases for 11th, 12th, 13th (though 13th won't occur in grades)
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return `${gradeCode}th Grade`;
        }
        
        // Regular ordinal rules
        if (lastDigit === 1) return `${gradeCode}st Grade`;
        if (lastDigit === 2) return `${gradeCode}nd Grade`;
        if (lastDigit === 3) return `${gradeCode}rd Grade`;
        return `${gradeCode}th Grade`;
    }
    
    return `Grade ${gradeCode}`;
}

/**
 * Convert any grade format to a consistent UI-friendly display
 */
export function normalizeGradeDisplay(gradeText?: string | number): string {
    if (!gradeText && gradeText !== 0) return 'Unknown';
    
    // If it's already a number, convert using gradeCodeToLabel
    if (typeof gradeText === 'number') {
        return gradeCodeToLabel(gradeText);
    }
    
    // If it's a string, try to parse it first
    const gradeCode = gradeToCode(gradeText);
    if (gradeCode !== null) {
        return gradeCodeToLabel(gradeCode);
    }
    
    // If parsing fails, try to normalize common variations
    const normalized = gradeText.toString().trim();
    
    // Handle common variations
    const gradeMap: Record<string, string> = {
        'pre-k': 'Pre-K',
        'prek': 'Pre-K',
        'preK': 'Pre-K',
        '0': 'Pre-K',
        'k': 'Kindergarten',
        'kg': 'Kindergarten',
        'kinder': 'Kindergarten',
        'kindergarten': 'Kindergarten',
        '1': 'Kindergarten',
        '2': '1st Grade',
        '3': '2nd Grade', 
        '4': '3rd Grade',
        '5': '4th Grade',
        '6': '5th Grade',
        '7': '6th Grade',
        '8': '7th Grade',
        '9': '8th Grade',
        '10': '9th Grade',
        '11': '10th Grade',
        '12': '11th Grade',
        '13': '12th Grade',
    };
    
    const key = normalized.toLowerCase();
    return gradeMap[key] || normalized; // Return original if no mapping found
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
        'pre-k': 0,
        'prek': 0,
        'kindergarten': 1,
        'k': 1,
        'kg': 1,
        '1st grade': 2,
        '2nd grade': 3,
        '3rd grade': 4,
        '4th grade': 5,
        '5th grade': 6,
        '6th grade': 7,
        '7th grade': 8,
        '8th grade': 9,
        '9th grade': 10,
        '10th grade': 11,
        '11th grade': 12,
        '12th grade': 13,
    };
    
    return fallbackOrder[normalized] ?? 99;
}

/**
 * Validate grade code is in valid range (0-13)
 */
export function isValidGradeCode(gradeCode: number): boolean {
    return Number.isInteger(gradeCode) && gradeCode >= 0 && gradeCode <= 13;
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
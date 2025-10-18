import { normalizeGradeDisplay } from '@/lib/gradeUtils';

describe('Grade Display Fix Verification', () => {
  it('should fix the specific issue: 8th grade showing as 7th grade', () => {
    // Test the exact values that were causing the problem
    console.log('Testing grade "8":', normalizeGradeDisplay('8'));
    console.log('Testing grade "9":', normalizeGradeDisplay('9'));
    console.log('Testing grade "-1":', normalizeGradeDisplay('-1'));
    console.log('Testing grade "0":', normalizeGradeDisplay('0'));
    
    // These should be the correct values
    expect(normalizeGradeDisplay('8')).toBe('8th Grade');
    expect(normalizeGradeDisplay('9')).toBe('9th Grade');
    expect(normalizeGradeDisplay('-1')).toBe('Pre-K');
    expect(normalizeGradeDisplay('0')).toBe('Kindergarten');
    
    // These should NOT be the wrong values
    expect(normalizeGradeDisplay('8')).not.toBe('7th Grade');
    expect(normalizeGradeDisplay('9')).not.toBe('8th Grade');
    expect(normalizeGradeDisplay('-1')).not.toBe('-1');
    expect(normalizeGradeDisplay('0')).not.toBe('0');
  });

  it('should handle all grade values correctly', () => {
    const testCases = [
      { input: '-1', expected: 'Pre-K' },
      { input: '0', expected: 'Kindergarten' },
      { input: '1', expected: '1st Grade' },
      { input: '2', expected: '2nd Grade' },
      { input: '3', expected: '3rd Grade' },
      { input: '4', expected: '4th Grade' },
      { input: '5', expected: '5th Grade' },
      { input: '6', expected: '6th Grade' },
      { input: '7', expected: '7th Grade' },
      { input: '8', expected: '8th Grade' },
      { input: '9', expected: '9th Grade' },
      { input: '10', expected: '10th Grade' },
      { input: '11', expected: '11th Grade' },
      { input: '12', expected: '12th Grade' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = normalizeGradeDisplay(input);
      console.log(`Input: "${input}" -> Output: "${result}" (Expected: "${expected}")`);
      expect(result).toBe(expected);
    });
  });
});

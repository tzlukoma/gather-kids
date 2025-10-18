import { normalizeGradeDisplay } from '@/lib/gradeUtils';

describe('Grade Display Function', () => {
  describe('normalizeGradeDisplay function', () => {
    it('should convert numeric grade codes to UI-friendly labels', () => {
      // Test numeric inputs
      expect(normalizeGradeDisplay(-1)).toBe('Pre-K');
      expect(normalizeGradeDisplay(0)).toBe('Kindergarten');
      expect(normalizeGradeDisplay(1)).toBe('1st Grade');
      expect(normalizeGradeDisplay(8)).toBe('8th Grade');
      expect(normalizeGradeDisplay(9)).toBe('9th Grade');
      expect(normalizeGradeDisplay(12)).toBe('12th Grade');
    });

    it('should convert string grade codes to UI-friendly labels', () => {
      // Test string inputs that are numeric grade codes
      expect(normalizeGradeDisplay('-1')).toBe('Pre-K');
      expect(normalizeGradeDisplay('0')).toBe('Kindergarten');
      expect(normalizeGradeDisplay('1')).toBe('1st Grade');
      expect(normalizeGradeDisplay('8')).toBe('8th Grade');
      expect(normalizeGradeDisplay('9')).toBe('9th Grade');
      expect(normalizeGradeDisplay('12')).toBe('12th Grade');
    });

    it('should convert ordinal grade strings to UI-friendly labels', () => {
      // Test ordinal inputs
      expect(normalizeGradeDisplay('8th')).toBe('8th Grade');
      expect(normalizeGradeDisplay('9th')).toBe('9th Grade');
      expect(normalizeGradeDisplay('1st')).toBe('1st Grade');
      expect(normalizeGradeDisplay('2nd')).toBe('2nd Grade');
      expect(normalizeGradeDisplay('3rd')).toBe('3rd Grade');
    });

    it('should convert grade with "grade" suffix to UI-friendly labels', () => {
      // Test grade with suffix
      expect(normalizeGradeDisplay('8th grade')).toBe('8th Grade');
      expect(normalizeGradeDisplay('9th grade')).toBe('9th Grade');
      expect(normalizeGradeDisplay('1st grade')).toBe('1st Grade');
    });

    it('should handle special cases', () => {
      // Test special cases
      expect(normalizeGradeDisplay('k')).toBe('Kindergarten');
      expect(normalizeGradeDisplay('K')).toBe('Kindergarten');
      expect(normalizeGradeDisplay('kindergarten')).toBe('Kindergarten');
      expect(normalizeGradeDisplay('pre-k')).toBe('Pre-K');
      expect(normalizeGradeDisplay('prek')).toBe('Pre-K');
    });

    it('should handle null and undefined inputs', () => {
      expect(normalizeGradeDisplay(null)).toBe('Unknown');
      expect(normalizeGradeDisplay(undefined)).toBe('Unknown');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(normalizeGradeDisplay('invalid')).toBe('invalid');
      expect(normalizeGradeDisplay('13')).toBe('13'); // 13th grade doesn't exist
      expect(normalizeGradeDisplay('')).toBe('Unknown');
    });

    it('should fix the original issue: 8th grade showing as 7th grade', () => {
      // This test specifically addresses the original issue
      expect(normalizeGradeDisplay('8')).toBe('8th Grade');
      expect(normalizeGradeDisplay('8th')).toBe('8th Grade');
      expect(normalizeGradeDisplay('8th grade')).toBe('8th Grade');
      
      // Make sure it's not showing as 7th grade
      expect(normalizeGradeDisplay('8')).not.toBe('7th Grade');
      expect(normalizeGradeDisplay('8th')).not.toBe('7th Grade');
    });

    it('should fix the original issue: 9th grade showing as 8th grade', () => {
      // This test specifically addresses the original issue
      expect(normalizeGradeDisplay('9')).toBe('9th Grade');
      expect(normalizeGradeDisplay('9th')).toBe('9th Grade');
      expect(normalizeGradeDisplay('9th grade')).toBe('9th Grade');
      
      // Make sure it's not showing as 8th grade
      expect(normalizeGradeDisplay('9')).not.toBe('8th Grade');
      expect(normalizeGradeDisplay('9th')).not.toBe('8th Grade');
    });
  });
});

import { describe, it, expect } from '@jest/globals';
import {
  canonicalizeGradeForStorage,
  gradeToCode,
  suggestNextGradeCode,
} from '../../src/lib/gradeUtils';

describe('gradeUtils R1 helpers', () => {
  it('canonicalizes prod mixed grade strings to numeric storage codes', () => {
    expect(canonicalizeGradeForStorage('3rd')).toBe('3');
    expect(canonicalizeGradeForStorage('K')).toBe('0');
    expect(canonicalizeGradeForStorage('PreK-4')).toBe('-1');
    expect(canonicalizeGradeForStorage('11')).toBe('11');
  });

  it('suggests next grade with Pre-K held until parent confirms', () => {
    expect(suggestNextGradeCode(gradeToCode('3'))).toBe(4);
    expect(suggestNextGradeCode(gradeToCode('Pre-K'))).toBe(-1);
    expect(suggestNextGradeCode(12)).toBe(12);
  });
});

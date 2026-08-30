import { describe, it, expect } from '@jest/globals';
import {
  applyReturningGradePrefill,
  buildGradeHintForChild,
  stripChoirSelections,
} from '../../src/lib/dal/household-prefill-utils';
import { guardianNeedsActiveCycleRegistration } from '../../src/lib/dal/households';

describe('household prefill helpers', () => {
  it('strips choir ministry selections from prior-year prefill', () => {
    const child = stripChoirSelections({
      child_id: 'child-1',
      ministrySelections: {
        'min_sunday_school': true,
        'choir-teen': true,
      },
    });

    expect(child.ministrySelections?.['min_sunday_school']).toBe(true);
    expect(child.ministrySelections?.['choir-teen']).toBeUndefined();
  });

  it('bumps grade for returning registration while holding Pre-K', () => {
    const hint = buildGradeHintForChild({
      child_id: 'c1',
      grade: '3',
    } as any);
    expect(hint?.lastYearLabel).toBe('3rd Grade');
    expect(hint?.suggestedGrade).toBe('4');

    const preKHint = buildGradeHintForChild({
      child_id: 'c2',
      grade: 'Pre-K',
    } as any);
    expect(preKHint?.suggestedGrade).toBe('-1');

    const updated = applyReturningGradePrefill({
      child_id: 'c1',
      grade: '3rd',
    } as any);
    expect(updated.grade).toBe('4');
  });

  it('routes returning guardians to register when active cycle has no enrollments', () => {
    expect(
      guardianNeedsActiveCycleRegistration({
        hasHousehold: true,
        activeChildCount: 2,
        hasCurrentCycleEnrollment: false,
      }),
    ).toBe(true);

    expect(
      guardianNeedsActiveCycleRegistration({
        hasHousehold: true,
        activeChildCount: 2,
        hasCurrentCycleEnrollment: true,
      }),
    ).toBe(false);
  });
});

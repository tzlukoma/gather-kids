import { describe, it, expect } from '@jest/globals';
import {
  pickActiveRegistrationCycle,
  pickPriorRegistrationCycle,
  pickExpandedCycleId,
  sortCycleIdsByStartDate,
} from '../../src/lib/dal/registration-cycle-utils';

describe('registration cycle resolution', () => {
  it('returns the most recently updated active cycle', () => {
    const current = pickActiveRegistrationCycle([
      {
        cycle_id: 'fall-2025',
        name: 'Fall 2025',
        is_active: true,
        start_date: '2025-09-14',
        end_date: '2026-06-30',
        updated_at: '2025-08-01T00:00:00Z',
      },
      {
        cycle_id: 'fall-2026',
        name: 'Fall 2026',
        is_active: false,
        start_date: '2026-09-13',
        end_date: '2027-06-30',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ] as any);

    expect(current?.cycle_id).toBe('fall-2025');
  });

  it('resolves prior cycle by start_date ordering (not numeric id math)', () => {
    const cycles = [
      {
        cycle_id: 'e3a387b5-de59-4e37-a52a-b9e9102dc45c',
        name: 'Fall 2025',
        is_active: true,
        start_date: '2025-09-14',
        end_date: '2026-06-30',
      },
      {
        cycle_id: 'b68d82e0-9677-4703-a89d-264661c88e97',
        name: 'Fall 2026',
        is_active: false,
        start_date: '2026-09-13',
        end_date: '2027-06-30',
      },
    ] as any;

    const prior = pickPriorRegistrationCycle(
      cycles,
      'b68d82e0-9677-4703-a89d-264661c88e97',
    );
    expect(prior?.cycle_id).toBe('e3a387b5-de59-4e37-a52a-b9e9102dc45c');
  });

  it('returns null when no prior cycle exists', () => {
    const prior = pickPriorRegistrationCycle(
      [
        {
          cycle_id: 'only',
          name: 'Only',
          is_active: true,
          start_date: '2025-09-14',
          end_date: '2026-06-30',
        },
      ] as any,
      'only',
    );
    expect(prior).toBeNull();
  });

  it('sorts cycle ids by start_date with newest first', () => {
    const startDates = {
      'e3a387b5-de59-4e37-a52a-b9e9102dc45c': '2025-09-14',
      'b68d82e0-9677-4703-a89d-264661c88e97': '2026-09-13',
    };
    expect(
      sortCycleIdsByStartDate(
        Object.keys(startDates),
        startDates,
      ),
    ).toEqual([
      'b68d82e0-9677-4703-a89d-264661c88e97',
      'e3a387b5-de59-4e37-a52a-b9e9102dc45c',
    ]);
  });

  it('expands the active cycle when the child has enrollments for it', () => {
    const startDates = {
      fall2025: '2025-09-14',
      fall2026: '2026-09-13',
    };
    expect(
      pickExpandedCycleId(['fall2025', 'fall2026'], startDates, 'fall2026'),
    ).toBe('fall2026');
  });
});

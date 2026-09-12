/**
 * Tests for Bible Bee Scripture Availability Gate
 * 
 * Tests all scenarios:
 * - null start date → available (backward compat)
 * - future start date → locked
 * - today == start date → available
 * - past start date → available
 * 
 * Date comparison uses America/New_York timezone
 */

import { areScripturesAvailable, formatStartDate } from '@/lib/bibleBeeScriptureGate';

describe('areScripturesAvailable', () => {
  // Helper to get today's date in YYYY-MM-DD format (America/New_York)
  const getTodayET = (): string => {
    const todayET = new Date().toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = todayET.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper to get a past date (7 days ago)
  const getPastDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper to get a future date (7 days from now)
  const getFutureDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  describe('null/undefined start date (backward compatibility)', () => {
    it('should return true when competition_start_date is null', () => {
      expect(areScripturesAvailable(null)).toBe(true);
    });

    it('should return true when competition_start_date is undefined', () => {
      expect(areScripturesAvailable(undefined)).toBe(true);
    });

    it('should return true when competition_start_date is empty string', () => {
      expect(areScripturesAvailable('')).toBe(true);
    });
  });

  describe('future start date (locked)', () => {
    it('should return false when competition_start_date is in the future', () => {
      const futureDate = getFutureDate();
      expect(areScripturesAvailable(futureDate)).toBe(false);
    });

    it('should return false for a specific far future date', () => {
      expect(areScripturesAvailable('2099-12-31')).toBe(false);
    });
  });

  describe('today == start date (available)', () => {
    it('should return true when competition_start_date is today', () => {
      const today = getTodayET();
      expect(areScripturesAvailable(today)).toBe(true);
    });
  });

  describe('past start date (available)', () => {
    it('should return true when competition_start_date is in the past', () => {
      const pastDate = getPastDate();
      expect(areScripturesAvailable(pastDate)).toBe(true);
    });

    it('should return true for a specific far past date', () => {
      expect(areScripturesAvailable('2020-01-01')).toBe(true);
    });
  });

  describe('date format edge cases', () => {
    it('should handle dates with leading zeros', () => {
      const today = getTodayET();
      // Today should be available
      expect(areScripturesAvailable(today)).toBe(true);
    });
  });
});

describe('formatStartDate', () => {
  it('should format a date string for display', () => {
    const formatted = formatStartDate('2026-09-15');
    expect(formatted).toMatch(/September \d+, \d{4}/);
  });

  it('should handle different months', () => {
    expect(formatStartDate('2026-01-15')).toContain('January');
    expect(formatStartDate('2026-12-25')).toContain('December');
  });
});

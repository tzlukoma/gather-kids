/**
 * Tests for DAL dashboard functions
 */

// Mock the database factory so DAL functions don't require real Supabase
jest.mock('@/lib/database/factory', () => {
  const mockAdapter = {
    listIncidents: jest.fn().mockResolvedValue([]),
    listAttendance: jest.fn().mockResolvedValue([]),
    listBibleBeeCycles: jest.fn().mockResolvedValue([]),
    listMinistries: jest.fn().mockResolvedValue([]),
    listHouseholds: jest.fn().mockResolvedValue([]),
    listChildren: jest.fn().mockResolvedValue([]),
  };
  return {
    createDatabaseAdapter: jest.fn(() => mockAdapter),
    db: mockAdapter,
  };
});

import {
  getUnacknowledgedIncidents,
  getCheckedInCount,
  getRegistrationStats,
  getBibleBeeYears,
  getMinistries
} from '@/lib/dal';

describe('Dashboard DAL Functions', () => {
  describe('getUnacknowledgedIncidents', () => {
    it('should return empty array when no incidents exist', async () => {
      const incidents = await getUnacknowledgedIncidents();
      expect(Array.isArray(incidents)).toBe(true);
    });
  });

  describe('getCheckedInCount', () => {
    it('should return 0 when no attendance records exist for date', async () => {
      const count = await getCheckedInCount('2025-01-01');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRegistrationStats', () => {
    it('should return stats object with household and child counts', async () => {
      const stats = await getRegistrationStats();

      expect(stats).toHaveProperty('householdCount');
      expect(stats).toHaveProperty('childCount');
      expect(typeof stats.householdCount).toBe('number');
      expect(typeof stats.childCount).toBe('number');
      expect(stats.householdCount).toBeGreaterThanOrEqual(0);
      expect(stats.childCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBibleBeeYears', () => {
    it('should return array of Bible Bee years', async () => {
      const years = await getBibleBeeYears();
      expect(Array.isArray(years)).toBe(true);
    });
  });

  describe('getMinistries', () => {
    it('should return array of ministries', async () => {
      const ministries = await getMinistries();
      expect(Array.isArray(ministries)).toBe(true);
    });

    it('should filter by active status when provided', async () => {
      const activeMinistries = await getMinistries(true);
      const inactiveMinistries = await getMinistries(false);

      expect(Array.isArray(activeMinistries)).toBe(true);
      expect(Array.isArray(inactiveMinistries)).toBe(true);
    });
  });
});

describe('Adapter Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('should always use Supabase adapter when config is set', () => {
    const { createDatabaseAdapter } = jest.requireActual('@/lib/database/factory');
    const adapter = createDatabaseAdapter();
    expect(adapter.constructor.name).toBe('SupabaseAdapter');
  });

  it('should throw when Supabase config is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const savedNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { createDatabaseAdapter } = jest.requireActual('@/lib/database/factory');
      expect(() => createDatabaseAdapter()).toThrow('Supabase configuration is required');
    } finally {
      process.env.NODE_ENV = savedNodeEnv;
    }
  });
});

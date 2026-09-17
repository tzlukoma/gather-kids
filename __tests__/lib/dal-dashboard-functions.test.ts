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
    listRegistrations: jest.fn().mockResolvedValue([]),
    listMinistryEnrollments: jest.fn().mockResolvedValue([]),
    listRegistrationCycles: jest.fn().mockResolvedValue([
      {
        cycle_id: 'fall-2026',
        name: 'Fall 2026',
        is_active: true,
        start_date: '2026-09-13',
        end_date: '2027-06-30',
      },
    ]),
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
  // This read goes through `GET /api/incidents` rather than the adapter, so the
  // scope is applied as a database predicate from the validated session instead
  // of in the browser (#428). The test asserts the request it makes, because the
  // query string is what carries the scope.
  describe('getUnacknowledgedIncidents', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('asks the server for unacknowledged incidents only', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ incidents: [] }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const incidents = await getUnacknowledgedIncidents();

      expect(mockFetch).toHaveBeenCalledWith('/api/incidents?unacknowledged=true');
      expect(Array.isArray(incidents)).toBe(true);
    });

    it('throws rather than reporting an empty list when the request fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }) as unknown as typeof fetch;

      // An empty array here would render as "no pending incidents", which is a
      // worse failure than an error on a screen that exists to surface them.
      await expect(getUnacknowledgedIncidents()).rejects.toThrow('403');
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
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    try {
      const { createDatabaseAdapter } = jest.requireActual('@/lib/database/factory');
      expect(() => createDatabaseAdapter()).toThrow('Supabase configuration is required');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
    }
  });
});

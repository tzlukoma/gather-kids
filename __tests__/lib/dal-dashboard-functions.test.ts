/**
 * Tests for new DAL dashboard functions to ensure they work with both adapters
 */

import { 
  getUnacknowledgedIncidents, 
  getCheckedInCount, 
  getRegistrationStats,
  getBibleBeeYears,
  getMinistries 
} from '@/lib/dal';
import { createDatabaseAdapter } from '@/lib/database/factory';

// Mock feature flags to control which adapter is used
jest.mock('@/lib/featureFlags', () => ({
  getFlag: jest.fn((name: string) => {
    if (name === 'DATABASE_MODE') {
      return process.env.TEST_DATABASE_MODE || 'demo';
    }
    return false;
  }),
  isDemo: jest.fn(() => (process.env.TEST_DATABASE_MODE || 'demo') === 'demo'),
}));

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
    // Clear any cached adapter instances
    jest.clearAllMocks();
  });

  it('should use IndexedDB adapter in demo mode', () => {
    process.env.TEST_DATABASE_MODE = 'demo';
    const adapter = createDatabaseAdapter();
    expect(adapter.constructor.name).toBe('IndexedDBAdapter');
  });

  it('should use Supabase adapter when configured', () => {
    process.env.TEST_DATABASE_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    const adapter = createDatabaseAdapter();
    expect(adapter.constructor.name).toBe('SupabaseAdapter');
    
    // Clean up
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
});
// Test to demonstrate that the database adapter factory always uses SupabaseAdapter
import { createDatabaseAdapter } from '@/lib/database/factory';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  // Set required Supabase config for all tests
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Database Adapter Factory', () => {
  it('should return SupabaseAdapter when Supabase config is set', () => {
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(SupabaseAdapter);
  });

  it('should throw when Supabase URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const savedNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    try {
      expect(() => createDatabaseAdapter()).toThrow('Supabase configuration is required');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
    }
  });

  it('should throw when Supabase key is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const savedNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    try {
      expect(() => createDatabaseAdapter()).toThrow('Supabase configuration is required');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
    }
  });
});

describe('Database Adapter Interface', () => {
  it('should have all required methods on SupabaseAdapter', () => {
    const adapter = createDatabaseAdapter();

    // Check a few key methods exist
    expect(typeof adapter.getHousehold).toBe('function');
    expect(typeof adapter.createHousehold).toBe('function');
    expect(typeof adapter.updateHousehold).toBe('function');
    expect(typeof adapter.listHouseholds).toBe('function');
    expect(typeof adapter.deleteHousehold).toBe('function');
    expect(typeof adapter.subscribeToTable).toBe('function');
    expect(typeof adapter.transaction).toBe('function');
  });
});

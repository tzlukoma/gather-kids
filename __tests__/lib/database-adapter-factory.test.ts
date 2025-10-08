// Test to demonstrate that the database adapter factory works correctly
import { createDatabaseAdapter } from '@/lib/database/factory';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Database Adapter Factory', () => {
  it('should return IndexedDBAdapter by default (demo mode)', () => {
    // Default mode should be demo
    delete process.env.NEXT_PUBLIC_DATABASE_MODE;
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(IndexedDBAdapter);
  });

  it('should return IndexedDBAdapter when mode is demo', () => {
    process.env.NEXT_PUBLIC_DATABASE_MODE = 'demo';
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(IndexedDBAdapter);
  });

  it('should return SupabaseAdapter when mode is supabase with valid config', () => {
    process.env.NEXT_PUBLIC_DATABASE_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(SupabaseAdapter);
  });

  it('should fallback to IndexedDBAdapter when supabase config is missing', () => {
    process.env.NEXT_PUBLIC_DATABASE_MODE = 'supabase';
    // Don't set Supabase URL/key
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Spy on console.error to check fallback message
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(IndexedDBAdapter);
    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Supabase configuration missing for UAT environment:',
      expect.objectContaining({
        supabaseUrl: 'MISSING',
        supabaseKey: 'MISSING',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'MISSING',
        mode: 'supabase'
      })
    );
    
    consoleSpy.mockRestore();
  });
});

describe('Database Adapter Interface', () => {
  it('should have all required methods on IndexedDBAdapter', () => {
    const adapter = new IndexedDBAdapter();
    
    // Check a few key methods exist
    expect(typeof adapter.getHousehold).toBe('function');
    expect(typeof adapter.createHousehold).toBe('function');
    expect(typeof adapter.updateHousehold).toBe('function');
    expect(typeof adapter.listHouseholds).toBe('function');
    expect(typeof adapter.deleteHousehold).toBe('function');
    expect(typeof adapter.subscribeToTable).toBe('function');
    expect(typeof adapter.transaction).toBe('function');
  });

  it('should return a no-op unsubscribe function for realtime on IndexedDB', () => {
    const adapter = new IndexedDBAdapter();
    const callback = jest.fn();
    const unsubscribe = adapter.subscribeToTable('test', callback);
    
    expect(typeof unsubscribe).toBe('function');
    // Should be safe to call
    unsubscribe();
  });
});
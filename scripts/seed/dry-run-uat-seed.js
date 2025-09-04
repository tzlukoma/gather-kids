#!/usr/bin/env node
/**
 * Dry Run UAT Seed Script for gatherKids
 * 
 * This script acts as a mock/dry-run wrapper around the uat_seed.js script
 * that intercepts all Supabase calls and logs them instead of executing them.
 * 
 * Usage:
 *   node scripts/seed/dry-run-uat-seed.js
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Mock Supabase client creation
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockLike = jest.fn().mockReturnThis();
const mockGte = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockReturnValue({ data: null, error: { code: 'PGRST116' } });
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  update: mockUpdate,
  eq: mockEq,
  like: mockLike,
  gte: mockGte,
  in: mockIn,
  single: mockSingle
});

const mockSupabase = {
  from: mockFrom,
  auth: {
    admin: {
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id' } },
        error: null
      }),
      inviteUserByEmail: jest.fn().mockResolvedValue({
        data: {},
        error: null
      }),
    }
  },
  rpc: jest.fn().mockResolvedValue({
    data: [],
    error: null
  }),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'mock-path' },
        error: null
      }),
    }),
  },
};

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock-supabase.url';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

// Mock createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
}));

// Add table-specific mock data
const mockData = {
  households: [
    { household_id: 'mock-household-1', household_name: 'Mock Household 1' },
    { household_id: 'mock-household-2', household_name: 'Mock Household 2' },
    { household_id: 'mock-household-3', household_name: 'Mock Household 3' }
  ],
  competition_years: [
    { id: 'mock-year-id', year: '2025-2026' }
  ],
  divisions: [
    { id: 'mock-division-id', name: 'Primary' }
  ],
  ministry_enrollments: [],
  emergency_contacts: [],
  children: [],
  guardians: [],
  ministries: [],
  users: [],
  registrations: [],
  scriptures: []
};

// Override the mock single function to return mock data
mockSingle.mockImplementation(function() {
  const table = this.tableName;
  if (table && mockData[table]?.length > 0) {
    return { data: mockData[table][0], error: null };
  }
  return { data: null, error: { code: 'PGRST116' } };
});

// Override the insert function to simulate inserting data
mockInsert.mockImplementation(function(data) {
  const table = this.tableName;
  console.log(`[DRY RUN] INSERT INTO ${table}:`, JSON.stringify(data, null, 2));
  
  // For tables that return IDs, simulate that behavior
  if (data.id) {
    return {
      select: () => ({
        single: () => ({ data: { id: 'mock-id' }, error: null })
      })
    };
  } else if (table === 'households') {
    return {
      select: () => ({
        single: () => ({ data: { household_id: 'mock-household-id' }, error: null })
      })
    };
  } else if (table === 'competition_years') {
    return {
      select: () => ({
        single: () => ({ data: { id: 'mock-year-id' }, error: null })
      })
    };
  } else {
    return {
      select: () => ({
        single: () => ({ data: { id: 'mock-id' }, error: null })
      })
    };
  }
});

// Track what tables are being accessed
const accessedTables = new Set();

// Override the from function to track table access
mockFrom.mockImplementation((table) => {
  accessedTables.add(table);
  return {
    select: () => {
      console.log(`[DRY RUN] SELECT FROM ${table}`);
      return {
        eq: () => ({
          single: () => {
            console.log(`[DRY RUN] WHERE condition on ${table}`);
            return { data: null, error: { code: 'PGRST116' } };
          },
          eq: () => ({
            single: () => {
              console.log(`[DRY RUN] Multiple WHERE conditions on ${table}`);
              return { data: null, error: { code: 'PGRST116' } };
            }
          })
        }),
        like: () => ({
          single: () => {
            console.log(`[DRY RUN] LIKE condition on ${table}`);
            return { data: null, error: { code: 'PGRST116' } };
          }
        })
      };
    },
    insert: (data) => {
      console.log(`[DRY RUN] INSERT INTO ${table}:`, JSON.stringify(data, null, 2));
      return {
        select: () => ({
          single: () => {
            if (table === 'households') {
              return { data: { household_id: 'mock-household-id' }, error: null };
            } else if (table === 'competition_years') {
              return { data: { id: 'mock-year-id' }, error: null };
            } else {
              return { data: { id: 'mock-id' }, error: null };
            }
          }
        })
      };
    },
    delete: () => {
      console.log(`[DRY RUN] DELETE FROM ${table}`);
      return {
        like: () => {
          console.log(`[DRY RUN] DELETE FROM ${table} WITH LIKE condition`);
          return { data: null, error: null };
        },
        gte: () => {
          console.log(`[DRY RUN] DELETE FROM ${table} WITH GTE condition`);
          return { data: null, error: null };
        }
      };
    }
  };
});

// Run the UAT seed script
async function runDryRun() {
  console.log('🔍 Starting dry run of UAT seed script...');
  
  try {
    // Import the UAT seed script
    const uatSeedModule = await import('./uat_seed.js');
    
    // Run it and wait for it to complete
    await new Promise(resolve => {
      // Set a timeout to ensure we don't hang forever if something goes wrong
      setTimeout(resolve, 5000);
    });
    
    console.log('\n🔍 Dry run completed. Tables accessed:');
    console.log([...accessedTables].sort().join(', '));
    
    console.log('\n✅ No runtime errors were detected.');
    console.log('This does NOT guarantee the seed will work - it only verifies the script syntax.');
    console.log('Check the logs above for any issues with data formats or table structure.');
    
  } catch (error) {
    console.error('❌ Dry run failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDryRun().catch(console.error);

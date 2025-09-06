import { migrateLeaders, printMigrationReport } from '../../scripts/migrate/migrate-leaders';
import { queryLeaderProfiles, getLeaderProfileWithMemberships } from '../../src/lib/dal';
import type { User, LeaderAssignment, Ministry } from '../../src/lib/types';
import { AuthRole } from '../../src/lib/auth-types';

// Mock the database module
jest.mock('../../src/lib/db', () => {
  const { createInMemoryDB } = require('../../src/test-utils/dexie-mock');
  return { db: createInMemoryDB() };
});

// Get reference to the mocked db
const { db: mockDb } = require('../../src/lib/db');

// Clear database before each test
beforeEach(async () => {
  // Clear all tables
  for (const tableName of Object.keys(mockDb)) {
    const table = mockDb[tableName];
    if (table && typeof table === 'object' && (table as any)._internalStore) {
      (table as any)._internalStore.clear();
    }
  }
});

describe('Leader Migration Integration Tests', () => {
  const sampleMinistries: Ministry[] = [
    {
      ministry_id: 'sunday-school',
      name: 'Sunday School',
      code: 'SS',
      enrollment_type: 'enrolled',
      data_profile: 'Basic',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      is_active: 1 as any // Use number for IndexedDB compatibility
    },
    {
      ministry_id: 'bible-bee',
      name: 'Bible Bee',
      code: 'BB',
      enrollment_type: 'enrolled', 
      data_profile: 'Basic',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      is_active: 1 as any // Use number for IndexedDB compatibility
    }
  ];

  const sampleUsers: User[] = [
    {
      user_id: 'leader-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      mobile_phone: '(555) 123-4567',
      role: 'MINISTRY_LEADER',
      is_active: true
    },
    {
      user_id: 'leader-2', 
      name: 'Jane Smith',
      email: 'JANE.SMITH@EXAMPLE.COM', // Test email normalization
      mobile_phone: '555-987-6543',
      role: 'MINISTRY_LEADER',
      is_active: true
    },
    {
      user_id: 'leader-3',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      role: 'MINISTRY_LEADER',
      is_active: false
    }
  ];

  const sampleAssignments: LeaderAssignment[] = [
    {
      assignment_id: 'assign-1',
      leader_id: 'leader-1',
      ministry_id: 'sunday-school',
      cycle_id: '2025',
      role: 'Primary'
    },
    {
      assignment_id: 'assign-2',
      leader_id: 'leader-2', 
      ministry_id: 'sunday-school',
      cycle_id: '2025',
      role: 'Volunteer'
    },
    {
      assignment_id: 'assign-3',
      leader_id: 'leader-2',
      ministry_id: 'bible-bee',
      cycle_id: '2025', 
      role: 'Primary'
    }
  ];

  beforeEach(async () => {
    // Setup test data
    await mockDb.ministries.bulkPut(sampleMinistries);
    await mockDb.users.bulkPut(sampleUsers);
    await mockDb.leader_assignments.bulkPut(sampleAssignments);
  });

  it('should migrate leaders from users to leader profiles', async () => {
    // Run migration
    const report = await migrateLeaders();

    // Verify migration report
    expect(report.profilesCreated).toBe(3);
    expect(report.membershipsCreated).toBe(3);
    expect(report.ministryAccountsCreated).toBe(2);
    expect(report.errors).toEqual([]);

    // Verify leader profiles were created
    const profiles = await queryLeaderProfiles();
    expect(profiles).toHaveLength(3);

    // Find John Doe's profile
    const johnProfile = profiles.find(p => p.first_name === 'John' && p.last_name === 'Doe');
    expect(johnProfile).toMatchObject({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '5551234567', // Normalized
      is_active: true,
      ministryCount: 1
    });

    // Find Jane Smith's profile
    const janeProfile = profiles.find(p => p.first_name === 'Jane' && p.last_name === 'Smith');
    expect(janeProfile).toMatchObject({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com', // Normalized to lowercase
      phone: '5559876543',
      is_active: true,
      ministryCount: 2 // Has 2 assignments
    });

    // Verify memberships
    const johnData = await getLeaderProfileWithMemberships('leader-1');
    expect(johnData?.memberships).toHaveLength(1);
    expect(johnData?.memberships[0]).toMatchObject({
      ministry_id: 'sunday-school',
      leader_id: 'leader-1',
      role_type: 'PRIMARY',
      is_active: true
    });

    const janeData = await getLeaderProfileWithMemberships('leader-2'); 
    expect(janeData?.memberships).toHaveLength(2);
    
    // Verify ministry accounts were created
    const accounts = await mockDb.ministry_accounts.toArray();
    expect(accounts).toHaveLength(2);
    expect(accounts.find((a: any) => a.ministry_id === 'sunday-school')).toMatchObject({
      ministry_id: 'sunday-school',
      email: 'ss@church.example',
      display_name: 'Sunday School Ministry',
      is_active: true
    });
  });

  it('should handle duplicate leaders correctly', async () => {
    // Add duplicate user with same email
    const duplicateUser: User = {
      user_id: 'leader-duplicate',
      name: 'John Doe Jr',
      email: 'john.doe@example.com', // Same email as leader-1
      role: 'MINISTRY_LEADER',
      is_active: true
    };
    await mockDb.users.put(duplicateUser);

    const report = await migrateLeaders();

    expect(report.duplicatesFound.length).toBeGreaterThan(0);
    expect(report.duplicatesFound[0]).toContain('Duplicate leader found');
  });

  it('should be idempotent - safe to run multiple times', async () => {
    // Run migration first time
    const report1 = await migrateLeaders();
    expect(report1.profilesCreated).toBe(3);

    // Run migration second time
    const report2 = await migrateLeaders();
    
    // Should not create duplicates
    const profiles = await queryLeaderProfiles();
    expect(profiles).toHaveLength(3);
    
    // Ministry accounts should not duplicate
    const accounts = await mockDb.ministry_accounts.toArray();
    expect(accounts).toHaveLength(2);
  });

  it('should print migration report correctly', () => {
    const report = {
      profilesCreated: 3,
      profilesUpdated: 0,
      membershipsCreated: 5,
      ministryAccountsCreated: 2,
      duplicatesFound: ['Duplicate: John Doe'],
      errors: ['Error: Something went wrong']
    };

    // This should not throw
    expect(() => printMigrationReport(report)).not.toThrow();
  });
});
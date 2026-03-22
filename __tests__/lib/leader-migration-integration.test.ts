import { migrateLeaders, printMigrationReport } from '../../scripts/migrate/migrate-leaders';
import { queryLeaderProfiles, getLeaderProfileWithMemberships } from '../../src/lib/dal';
import type { User, LeaderAssignment, Ministry } from '../../src/lib/types';

// Mock the Dexie db module (used by the migration script)
// Must use require inside the factory to avoid hoisting issues
jest.mock('../../src/lib/db', () => {
  const { createInMemoryDB } = require('../../src/test-utils/dexie-mock');
  return { db: createInMemoryDB() };
});

// Mock the database factory (used by DAL functions like queryLeaderProfiles)
jest.mock('@/lib/database/factory', () => {
  const mockAdapter = {
    listLeaderProfiles: jest.fn(),
    getLeaderProfile: jest.fn(),
    createLeaderProfile: jest.fn(),
    updateLeaderProfile: jest.fn(),
    listMinistryLeaderMemberships: jest.fn(),
    createMinistryLeaderMembership: jest.fn(),
    deleteMinistryLeaderMembership: jest.fn(),
    listMinistries: jest.fn(),
    transaction: jest.fn().mockImplementation((callback: () => Promise<any>) => callback()),
  };
  return {
    createDatabaseAdapter: jest.fn(() => mockAdapter),
    db: mockAdapter,
  };
});

// Get references at module load time (after mocks are set up)
const { db: mockDb } = require('../../src/lib/db');
import { db as mockAdapterDb } from '@/lib/database/factory';
const mockAdapter = mockAdapterDb as any;

// Sync adapter mocks to read from the shared in-memory DB
function syncAdapterMocks() {
  mockAdapter.listLeaderProfiles.mockImplementation(() => mockDb.leader_profiles.toArray());
  mockAdapter.listMinistryLeaderMemberships.mockImplementation(async (ministryId?: string, leaderId?: string) => {
    const all = await mockDb.ministry_leader_memberships.toArray();
    return all.filter((m: any) => {
      if (leaderId && m.leader_id !== leaderId) return false;
      if (ministryId && m.ministry_id !== ministryId) return false;
      return true;
    });
  });
  mockAdapter.listMinistries.mockImplementation(() => mockDb.ministries.toArray());
  mockAdapter.getLeaderProfile.mockImplementation((id: string) =>
    mockDb.leader_profiles.get(id)
  );
}

// Clear database before each test
beforeEach(async () => {
  // Clear all in-memory tables
  for (const tableName of Object.keys(mockDb)) {
    const table = (mockDb as any)[tableName];
    if (table && typeof table === 'object' && table._internalStore) {
      table._internalStore.clear();
    }
  }
  jest.clearAllMocks();
  syncAdapterMocks();
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
    // Setup test data in the shared in-memory DB
    await mockDb.ministries.bulkPut(sampleMinistries);
    await mockDb.users.bulkPut(sampleUsers);
    await mockDb.leader_assignments.bulkPut(sampleAssignments);
    // Re-sync mocks since data changed
    syncAdapterMocks();
  });

  it('should migrate leaders from users to leader profiles', async () => {
    // Run migration
    const report = await migrateLeaders();

    // Verify migration report
    expect(report.profilesCreated).toBe(3);
    expect(report.membershipsCreated).toBe(3);
    expect(report.ministryAccountsCreated).toBe(2);
    expect(report.errors).toEqual([]);

    // Re-sync so DAL reads from what migration wrote
    syncAdapterMocks();

    // Verify leader profiles were created
    const profiles = await queryLeaderProfiles();
    expect(profiles).toHaveLength(3);

    // Find John Doe's profile
    const johnProfile = profiles.find((p: any) => p.first_name === 'John' && p.last_name === 'Doe');
    expect(johnProfile).toMatchObject({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '5551234567', // Normalized
      is_active: true,
      ministryCount: 1
    });

    // Find Jane Smith's profile
    const janeProfile = profiles.find((p: any) => p.first_name === 'Jane' && p.last_name === 'Smith');
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

    // Re-sync after first migration
    syncAdapterMocks();

    // Run migration second time
    await migrateLeaders();

    // Re-sync after second migration
    syncAdapterMocks();

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

import { queryLeaderProfiles, saveLeaderProfile, getLeaderProfileWithMemberships, saveLeaderMemberships, searchLeaderProfiles } from '../../src/lib/dal';
import type { LeaderProfile, MinistryLeaderMembership, Ministry } from '../../src/lib/types';

// In-memory data stores for testing
const leaderProfiles = new Map<string, LeaderProfile>();
const memberships = new Map<string, MinistryLeaderMembership>();
const ministries = new Map<string, Ministry>();

// Mock the database module
jest.mock('../../src/lib/db', () => {
    return {
        db: {
            leader_profiles: {
                put: jest.fn().mockImplementation((profile: LeaderProfile) => {
                    leaderProfiles.set(profile.leader_id, profile);
                    return Promise.resolve(profile.leader_id);
                }),
                get: jest.fn().mockImplementation((id: string) => {
                    return Promise.resolve(leaderProfiles.get(id) || null);
                }),
                toArray: jest.fn().mockImplementation(() => {
                    return Promise.resolve(Array.from(leaderProfiles.values()));
                }),
                orderBy: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockImplementation(() => {
                        return Promise.resolve(Array.from(leaderProfiles.values()));
                    })
                }),
                where: jest.fn().mockImplementation((field: string) => {
                    return {
                        equals: jest.fn().mockImplementation((value: any) => {
                            return {
                                and: jest.fn().mockImplementation((filterFn: any) => {
                                    return {
                                        first: jest.fn().mockImplementation(() => {
                                            const profiles = Array.from(leaderProfiles.values());
                                            return Promise.resolve(
                                                profiles.find(p => filterFn(p) && (p as any)[field] === value) || null
                                            );
                                        })
                                    };
                                }),
                                first: jest.fn().mockImplementation(() => {
                                    const profiles = Array.from(leaderProfiles.values());
                                    return Promise.resolve(
                                        profiles.find(p => (p as any)[field] === value) || null
                                    );
                                })
                            };
                        })
                    };
                }),
                bulkPut: jest.fn().mockImplementation((profiles: LeaderProfile[]) => {
                    profiles.forEach(p => leaderProfiles.set(p.leader_id, p));
                    return Promise.resolve();
                }),
                update: jest.fn().mockImplementation((id: string, updates: Partial<LeaderProfile>) => {
                    const existing = leaderProfiles.get(id);
                    if (existing) {
                        leaderProfiles.set(id, { ...existing, ...updates });
                        return Promise.resolve(1);
                    }
                    return Promise.resolve(0);
                }),
                filter: jest.fn().mockImplementation((filterFn: any) => {
                    return {
                        toArray: jest.fn().mockImplementation(() => {
                            const profiles = Array.from(leaderProfiles.values());
                            return Promise.resolve(profiles.filter(filterFn));
                        })
                    };
                })
            },
            ministry_leader_memberships: {
                put: jest.fn().mockImplementation((membership: MinistryLeaderMembership) => {
                    memberships.set(membership.membership_id, membership);
                    return Promise.resolve(membership.membership_id);
                }),
                bulkAdd: jest.fn().mockImplementation((items: MinistryLeaderMembership[]) => {
                    items.forEach(m => memberships.set(m.membership_id, m));
                    return Promise.resolve();
                }),
                where: jest.fn().mockImplementation((field: string) => {
                    return {
                        equals: jest.fn().mockImplementation((value: any) => {
                            return {
                                toArray: jest.fn().mockImplementation(() => {
                                    const items = Array.from(memberships.values());
                                    return Promise.resolve(items.filter(m => (m as any)[field] === value));
                                }),
                                delete: jest.fn().mockImplementation(() => {
                                    const toDelete = Array.from(memberships.entries())
                                        .filter(([, m]) => (m as any)[field] === value);
                                    toDelete.forEach(([key]) => memberships.delete(key));
                                    return Promise.resolve();
                                })
                            };
                        })
                    };
                }),
                toArray: jest.fn().mockImplementation(() => {
                    return Promise.resolve(Array.from(memberships.values()));
                })
            },
            ministries: {
                put: jest.fn().mockImplementation((ministry: Ministry) => {
                    ministries.set(ministry.ministry_id, ministry);
                    return Promise.resolve(ministry.ministry_id);
                }),
                get: jest.fn().mockImplementation((id: string) => {
                    return Promise.resolve(ministries.get(id) || null);
                }),
                toArray: jest.fn().mockImplementation(() => {
                    return Promise.resolve(Array.from(ministries.values()));
                })
            },
            transaction: jest.fn().mockImplementation(async (mode: any, tables: any, callback: () => Promise<any>) => {
                return await callback();
            })
        }
    };
});

// Clear data before each test
beforeEach(() => {
    leaderProfiles.clear();
    memberships.clear();
    ministries.clear();
});

describe('Leader Profile Management', () => {
  const { db } = require('../../src/lib/db');
  
  const sampleMinistry: Ministry = {
    ministry_id: 'ministry-1',
    name: 'Test Ministry',
    code: 'test',
    enrollment_type: 'enrolled',
    data_profile: 'Basic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };

  const sampleProfile: LeaderProfile = {
    leader_id: 'leader-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(async () => {
    await db.ministries.put(sampleMinistry);
  });

  describe('queryLeaderProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      const result = await queryLeaderProfiles();
      expect(result).toEqual([]);
    });

    it('should return profiles with ministry counts', async () => {
      await db.leader_profiles.put(sampleProfile);
      
      const membership: MinistryLeaderMembership = {
        membership_id: 'membership-1',
        ministry_id: sampleMinistry.ministry_id,
        leader_id: sampleProfile.leader_id,
        role_type: 'PRIMARY',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.ministry_leader_memberships.put(membership);

      const result = await queryLeaderProfiles();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        leader_id: sampleProfile.leader_id,
        first_name: 'John',
        last_name: 'Doe',
        ministryCount: 1,
        is_active: true
      });
    });
  });

  describe('saveLeaderProfile', () => {
    it('should normalize email to lowercase', async () => {
      const profileWithUpperEmail = {
        ...sampleProfile,
        email: 'JOHN.DOE@EXAMPLE.COM'
      };

      await saveLeaderProfile(profileWithUpperEmail);
      const saved = await db.leader_profiles.get(sampleProfile.leader_id);
      
      expect(saved?.email).toBe('john.doe@example.com');
    });

    it('should normalize phone number', async () => {
      const profileWithFormattedPhone = {
        ...sampleProfile,
        phone: '(555) 123-4567'
      };

      await saveLeaderProfile(profileWithFormattedPhone);
      const saved = await db.leader_profiles.get(sampleProfile.leader_id);
      
      expect(saved?.phone).toBe('5551234567');
    });

    it('should throw error for duplicate email', async () => {
      await db.leader_profiles.put(sampleProfile);

      const duplicateProfile = {
        ...sampleProfile,
        leader_id: 'leader-2',
        email: 'john.doe@example.com'
      };

      await expect(saveLeaderProfile(duplicateProfile)).rejects.toThrow('A leader profile with email john.doe@example.com already exists');
    });
  });

  describe('getLeaderProfileWithMemberships', () => {
    it('should return null for non-existent leader', async () => {
      const result = await getLeaderProfileWithMemberships('non-existent');
      expect(result).toBeNull();
    });

    it('should return profile with memberships', async () => {
      await db.leader_profiles.put(sampleProfile);
      
      const membership: MinistryLeaderMembership = {
        membership_id: 'membership-1',
        ministry_id: sampleMinistry.ministry_id,
        leader_id: sampleProfile.leader_id,
        role_type: 'VOLUNTEER',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.ministry_leader_memberships.put(membership);

      const result = await getLeaderProfileWithMemberships(sampleProfile.leader_id);
      
      expect(result).toMatchObject({
        profile: sampleProfile,
        memberships: [{
          ...membership,
          ministry: sampleMinistry
        }],
        allMinistries: [sampleMinistry]
      });
    });
  });

  describe('saveLeaderMemberships', () => {
    beforeEach(async () => {
      await db.leader_profiles.put(sampleProfile);
    });

    it('should replace existing memberships', async () => {
      // Add initial membership
      const initialMembership: MinistryLeaderMembership = {
        membership_id: 'membership-1',
        ministry_id: sampleMinistry.ministry_id,
        leader_id: sampleProfile.leader_id,
        role_type: 'PRIMARY',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.ministry_leader_memberships.put(initialMembership);

      // Save new memberships (should replace the old one)
      const newMemberships = [{
        ministry_id: sampleMinistry.ministry_id,
        leader_id: sampleProfile.leader_id,
        role_type: 'VOLUNTEER' as const,
        is_active: true
      }];

      await saveLeaderMemberships(sampleProfile.leader_id, newMemberships);

      const savedMemberships = await db.ministry_leader_memberships.where('leader_id').equals(sampleProfile.leader_id).toArray();
      expect(savedMemberships).toHaveLength(1);
      expect(savedMemberships[0].role_type).toBe('VOLUNTEER');
    });

    it('should not automatically update leader profile status based on membership activity', async () => {
      const inactiveMemberships = [{
        ministry_id: sampleMinistry.ministry_id,
        leader_id: sampleProfile.leader_id,
        role_type: 'PRIMARY' as const,
        is_active: false
      }];

      await saveLeaderMemberships(sampleProfile.leader_id, inactiveMemberships);

      // Leader profile status is managed separately and should not change based on membership activity
      const updatedProfile = await db.leader_profiles.get(sampleProfile.leader_id);
      expect(updatedProfile?.is_active).toBe(true); // Should remain unchanged
    });
  });

  describe('searchLeaderProfiles', () => {
    beforeEach(async () => {
      await db.leader_profiles.bulkPut([
        {
          ...sampleProfile,
          leader_id: 'leader-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        },
        {
          ...sampleProfile,
          leader_id: 'leader-2',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com'
        }
      ]);
    });

    it('should find leaders by first name', async () => {
      const results = await searchLeaderProfiles('john');
      expect(results).toHaveLength(1);
      expect(results[0].first_name).toBe('John');
    });

    it('should find leaders by last name', async () => {
      const results = await searchLeaderProfiles('smith');
      expect(results).toHaveLength(1);
      expect(results[0].last_name).toBe('Smith');
    });

    it('should find leaders by email', async () => {
      const results = await searchLeaderProfiles('jane.smith');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('jane.smith@example.com');
    });
  });
});
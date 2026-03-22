import {
    queryLeaderProfiles,
    saveLeaderProfile,
    getLeaderProfileWithMemberships,
    saveLeaderMemberships,
    searchLeaderProfiles,
} from '../../src/lib/dal';
import type { LeaderProfile, MinistryLeaderMembership, Ministry } from '../../src/lib/types';
import { v4 as uuidv4 } from 'uuid';

// In-memory data stores for testing
const leaderProfilesStore = new Map<string, LeaderProfile>();
const membershipsStore = new Map<string, MinistryLeaderMembership>();
const ministriesStore = new Map<string, Ministry>();

// Mock the database factory
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
        transaction: jest.fn(),
    };
    return {
        createDatabaseAdapter: jest.fn(() => mockAdapter),
        db: mockAdapter,
    };
});

import { db as mockAdapter } from '@/lib/database/factory';
const mockDb = mockAdapter as any;

// Helper to set up mock return values from in-memory stores
function syncMocks() {
    const profiles = Array.from(leaderProfilesStore.values());
    const memberships = Array.from(membershipsStore.values());
    const ministries = Array.from(ministriesStore.values());

    mockDb.listLeaderProfiles.mockResolvedValue(profiles);
    mockDb.listMinistryLeaderMemberships.mockImplementation((ministryId?: string, leaderId?: string) => {
        let result = memberships;
        if (leaderId) result = result.filter(m => m.leader_id === leaderId);
        if (ministryId) result = result.filter(m => m.ministry_id === ministryId);
        return Promise.resolve(result);
    });
    mockDb.listMinistries.mockResolvedValue(ministries);
    mockDb.getLeaderProfile.mockImplementation((id: string) =>
        Promise.resolve(leaderProfilesStore.get(id) || null)
    );
    mockDb.createLeaderProfile.mockImplementation((data: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'> & { created_at?: string }) => {
        const now = new Date().toISOString();
        const profile: LeaderProfile = {
            leader_id: 'generated-' + Math.random().toString(36).slice(2),
            created_at: now,
            updated_at: now,
            ...data,
        } as LeaderProfile;
        leaderProfilesStore.set(profile.leader_id, profile);
        return Promise.resolve(profile);
    });
    mockDb.updateLeaderProfile.mockImplementation((id: string, updates: Partial<LeaderProfile>) => {
        const existing = leaderProfilesStore.get(id);
        if (!existing) return Promise.resolve(null);
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
        leaderProfilesStore.set(id, updated);
        return Promise.resolve(updated);
    });
    mockDb.createMinistryLeaderMembership.mockImplementation((data: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>) => {
        const now = new Date().toISOString();
        const membership: MinistryLeaderMembership = {
            membership_id: 'mem-' + Math.random().toString(36).slice(2),
            created_at: now,
            updated_at: now,
            ...data,
        } as MinistryLeaderMembership;
        membershipsStore.set(membership.membership_id, membership);
        return Promise.resolve(membership);
    });
    mockDb.deleteMinistryLeaderMembership.mockImplementation((id: string) => {
        membershipsStore.delete(id);
        return Promise.resolve();
    });
    mockDb.transaction.mockImplementation((callback: () => Promise<any>) => callback());
}

// Clear data before each test
beforeEach(() => {
    leaderProfilesStore.clear();
    membershipsStore.clear();
    ministriesStore.clear();
    jest.clearAllMocks();
    syncMocks();
});

describe('Leader Profile Management', () => {
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

    beforeEach(() => {
        // Add sample ministry
        ministriesStore.set(sampleMinistry.ministry_id, sampleMinistry);
        syncMocks();
    });

    describe('queryLeaderProfiles', () => {
        it('should return empty array when no profiles exist', async () => {
            const result = await queryLeaderProfiles();
            expect(result).toEqual([]);
        });

        it('should return profiles with ministry counts', async () => {
            leaderProfilesStore.set(sampleProfile.leader_id, sampleProfile);

            const membership: MinistryLeaderMembership = {
                membership_id: 'membership-1',
                ministry_id: sampleMinistry.ministry_id,
                leader_id: sampleProfile.leader_id,
                role_type: 'PRIMARY',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            membershipsStore.set(membership.membership_id, membership);
            syncMocks();

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

            // Verify createLeaderProfile was called (since no existing profile)
            expect(mockDb.createLeaderProfile).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'john.doe@example.com' })
            );
        });

        it('should normalize phone number', async () => {
            const profileWithFormattedPhone = {
                ...sampleProfile,
                phone: '(555) 123-4567'
            };

            await saveLeaderProfile(profileWithFormattedPhone);

            expect(mockDb.createLeaderProfile).toHaveBeenCalledWith(
                expect.objectContaining({ phone: '5551234567' })
            );
        });

        it('should throw error for duplicate email', async () => {
            // Add existing profile with the same email
            leaderProfilesStore.set(sampleProfile.leader_id, sampleProfile);
            syncMocks();

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
            leaderProfilesStore.set(sampleProfile.leader_id, sampleProfile);

            const membership: MinistryLeaderMembership = {
                membership_id: 'membership-1',
                ministry_id: sampleMinistry.ministry_id,
                leader_id: sampleProfile.leader_id,
                role_type: 'VOLUNTEER',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            membershipsStore.set(membership.membership_id, membership);
            syncMocks();

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
        beforeEach(() => {
            leaderProfilesStore.set(sampleProfile.leader_id, sampleProfile);
            syncMocks();
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
            membershipsStore.set(initialMembership.membership_id, initialMembership);
            syncMocks();

            // Save new memberships (should replace the old one)
            const newMemberships = [{
                ministry_id: sampleMinistry.ministry_id,
                leader_id: sampleProfile.leader_id,
                role_type: 'VOLUNTEER' as const,
                is_active: true
            }];

            await saveLeaderMemberships(sampleProfile.leader_id, newMemberships);

            // After replacing, old membership deleted, new one added
            const savedMemberships = Array.from(membershipsStore.values()).filter(
                m => m.leader_id === sampleProfile.leader_id
            );
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
            const updatedProfile = leaderProfilesStore.get(sampleProfile.leader_id);
            expect(updatedProfile?.is_active).toBe(true); // Should remain unchanged
        });
    });

    describe('searchLeaderProfiles', () => {
        beforeEach(() => {
            leaderProfilesStore.set('leader-1', {
                ...sampleProfile,
                leader_id: 'leader-1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com'
            });
            leaderProfilesStore.set('leader-2', {
                ...sampleProfile,
                leader_id: 'leader-2',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@example.com'
            });
            syncMocks();
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

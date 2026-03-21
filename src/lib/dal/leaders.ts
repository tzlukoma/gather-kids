/**
 * DAL — Leaders domain
 *
 * Covers LeaderProfile, MinistryLeaderMembership, and related queries.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type {
    LeaderProfile,
    MinistryLeaderMembership,
    MinistryAccount,
} from '../types';
import { normalizeEmail, normalizePhone, isActiveValue } from './utils';

// ---------------------------------------------------------------------------
// Leader Profile queries
// ---------------------------------------------------------------------------

/**
 * Get all leader profiles with active membership counts.
 */
export async function queryLeaderProfiles() {
    const [profiles, memberships] = await Promise.all([
        dbAdapter.listLeaderProfiles(),
        dbAdapter.listMinistryLeaderMemberships(),
    ]);

    profiles.sort((a, b) => {
        const lastNameCompare = a.last_name.localeCompare(b.last_name);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.first_name.localeCompare(b.first_name);
    });

    const membershipCounts = memberships.reduce(
        (acc, m) => {
            if (m.is_active) {
                acc[m.leader_id] = (acc[m.leader_id] || 0) + 1;
            }
            return acc;
        },
        {} as Record<string, number>,
    );

    return profiles.map(profile => ({
        ...profile,
        ministryCount: membershipCounts[profile.leader_id] || 0,
    }));
}

/**
 * Get a leader profile with its ministry memberships.
 */
export async function getLeaderProfileWithMemberships(leaderId: string) {
    const profile = await dbAdapter.getLeaderProfile(leaderId);
    if (!profile) return null;

    const memberships = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
    const ministries = await dbAdapter.listMinistries();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    const membershipsWithMinistries = memberships
        .map(m => ({ ...m, ministry: ministryMap.get(m.ministry_id) }))
        .filter(m => m.ministry);

    return {
        profile,
        memberships: membershipsWithMinistries,
        allMinistries: ministries
            .filter(m => m.is_active)
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
}

/**
 * Get assignments for a leader in a specific cycle.
 *
 * In the new system, leader assignments are modeled as ministry_leader_memberships.
 * This function returns memberships shaped to match the legacy LeaderAssignment interface
 * for backward compatibility.
 */
export async function getLeaderAssignmentsForCycle(leaderId: string, _cycleId: string) {
    // Leader assignments have been superseded by ministry_leader_memberships.
    // Return active memberships shaped like LeaderAssignment for compatibility.
    const memberships = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
    return memberships
        .filter(m => m.is_active)
        .map(m => ({
            assignment_id: m.membership_id,
            leader_id: m.leader_id,
            ministry_id: m.ministry_id,
            cycle_id: _cycleId, // memberships are not cycle-scoped in the new system
            role: m.role_type === 'PRIMARY' ? 'Primary' : 'Volunteer',
        }));
}

/**
 * Determine whether a leader can manage the Bible Bee ministry.
 */
export async function canLeaderManageBibleBee(opts: {
    leaderId?: string;
    email?: string;
    selectedCycle?: string;
}): Promise<boolean> {
    const { leaderId, email, selectedCycle } = opts || {};
    if (!leaderId && !email) return false;

    let effectiveCycle = selectedCycle;
    if (selectedCycle) {
        try {
            const bb = await dbAdapter.getBibleBeeYear(selectedCycle);
            if (bb) {
                const allCycles = await dbAdapter.listRegistrationCycles();
                const active = allCycles.find(c =>
                    isActiveValue((c as unknown as Record<string, unknown>)?.is_active),
                );
                if (active && active.cycle_id) effectiveCycle = active.cycle_id;
            }
        } catch {
            // ignore
        }
    }

    // 1) Legacy leader_assignments check
    if (leaderId && effectiveCycle) {
        const assignments = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
        const filteredAssignments = assignments.filter(
            a => a.ministry_id && a.role_type === 'PRIMARY',
        );
        const ministries = await dbAdapter.listMinistries();
        const bibleBeeMinistryIds = ministries
            .filter(m => m.code === 'bible-bee')
            .map(m => m.ministry_id);
        if (filteredAssignments.some(a => bibleBeeMinistryIds.includes(a.ministry_id))) {
            return true;
        }
    }

    // 2) New management system: ministry_leader_memberships
    if (leaderId) {
        const memberships = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
        const ministries = await dbAdapter.listMinistries();
        const bibleBeeMinistryIds = ministries
            .filter(m => m.code === 'bible-bee')
            .map(m => m.ministry_id);
        if (
            memberships.some(
                (m: MinistryLeaderMembership) =>
                    bibleBeeMinistryIds.includes(m.ministry_id) && isActiveValue(m.is_active),
            )
        ) {
            return true;
        }
    }

    // 3) Email-based mapping via ministry_accounts
    if (email) {
        const accounts = await dbAdapter.listMinistryAccounts();
        const ministries = await dbAdapter.listMinistries();
        const bibleBeeMinistryIds = ministries
            .filter(m => m.code === 'bible-bee')
            .map(m => m.ministry_id);
        if (
            accounts.some(
                (a: MinistryAccount) =>
                    bibleBeeMinistryIds.includes(a.ministry_id) && a.email === String(email),
            )
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Create or update a leader profile.
 */
export async function saveLeaderProfile(
    profileData: Omit<LeaderProfile, 'created_at' | 'updated_at'> & { created_at?: string },
): Promise<string> {
    const normalizedProfile = {
        ...profileData,
        email: normalizeEmail(profileData.email),
        phone: normalizePhone(profileData.phone),
    };

    if (normalizedProfile.email) {
        const existingProfiles = await dbAdapter.listLeaderProfiles();
        const existingByEmail = existingProfiles.find(
            p =>
                p.email === normalizedProfile.email &&
                p.leader_id !== normalizedProfile.leader_id,
        );
        if (existingByEmail) {
            throw new Error(
                `A leader profile with email ${normalizedProfile.email} already exists`,
            );
        }
    }

    const existingProfile = await dbAdapter.getLeaderProfile(normalizedProfile.leader_id);
    if (existingProfile) {
        const updatedProfile = await dbAdapter.updateLeaderProfile(
            normalizedProfile.leader_id,
            normalizedProfile,
        );
        return updatedProfile.leader_id;
    } else {
        const { leader_id, ...profileDataWithoutId } = normalizedProfile;
        const newProfile = await dbAdapter.createLeaderProfile(profileDataWithoutId);
        return newProfile.leader_id;
    }
}

/**
 * Get ministry memberships for a leader, enriched with ministry metadata.
 */
export async function getLeaderMemberships(leaderId: string) {
    const memberships = await dbAdapter.listMinistryLeaderMemberships(undefined, leaderId);
    const ministries = await dbAdapter.listMinistries();
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    return memberships
        .map(m => ({ ...m, ministry: ministryMap.get(m.ministry_id) }))
        .filter(m => m.ministry);
}

/**
 * Replace all ministry memberships for a leader.
 */
export async function saveLeaderMemberships(
    leaderId: string,
    memberships: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>[],
) {
    return await dbAdapter.transaction(async () => {
        const existingMemberships = await dbAdapter.listMinistryLeaderMemberships(
            undefined,
            leaderId,
        );
        for (const membership of existingMemberships) {
            await dbAdapter.deleteMinistryLeaderMembership(membership.membership_id);
        }

        for (const membershipData of memberships) {
            await dbAdapter.createMinistryLeaderMembership(membershipData);
        }
    });
}

/**
 * Update a leader profile's active status.
 */
export async function updateLeaderProfileStatus(
    leaderId: string,
    isActive: boolean,
): Promise<string> {
    const existingProfile = await dbAdapter.getLeaderProfile(leaderId);
    if (existingProfile) {
        await dbAdapter.updateLeaderProfile(leaderId, { is_active: isActive });
    }
    return leaderId;
}

/**
 * Update legacy user (not leader profile) active status.
 * @deprecated Use updateLeaderProfileStatus for new code.
 */
export async function updateLeaderStatus(
    leaderId: string,
    isActive: boolean,
): Promise<number | string> {
    const updatedUser = await dbAdapter.updateUser(leaderId, { is_active: isActive });
    return updatedUser.user_id;
}

/**
 * Get ministry roster (leader memberships with profile) for a ministry.
 */
export async function getMinistryRoster(ministryId: string) {
    const memberships = await dbAdapter.listMinistryLeaderMemberships(ministryId);
    const leaderIds = memberships.map(m => m.leader_id);

    if (leaderIds.length === 0) return [];

    const profiles = await Promise.all(leaderIds.map(id => dbAdapter.getLeaderProfile(id)));
    const profileMap = new Map(
        profiles.filter(p => p).map(p => [p!.leader_id, p]),
    );

    return memberships
        .map(m => ({ ...m, profile: profileMap.get(m.leader_id) }))
        .filter(m => m.profile);
}

/**
 * Search leader profiles by name or email.
 */
export async function searchLeaderProfiles(searchTerm: string) {
    const lowerSearchTerm = searchTerm.toLowerCase();

    const [allProfiles, memberships] = await Promise.all([
        dbAdapter.listLeaderProfiles(),
        dbAdapter.listMinistryLeaderMemberships(),
    ]);

    const profiles = allProfiles.filter(profile => {
        const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
        const email = profile.email?.toLowerCase() || '';
        return fullName.includes(lowerSearchTerm) || email.includes(lowerSearchTerm);
    });

    profiles.sort((a, b) => {
        const lastNameCompare = a.last_name.localeCompare(b.last_name);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.first_name.localeCompare(b.first_name);
    });

    const membershipCounts = memberships.reduce(
        (acc, m) => {
            if (m.is_active) {
                acc[m.leader_id] = (acc[m.leader_id] || 0) + 1;
            }
            return acc;
        },
        {} as Record<string, number>,
    );

    return profiles.map(profile => ({
        ...profile,
        ministryCount: membershipCounts[profile.leader_id] || 0,
        is_active:
            profile.is_active && (membershipCounts[profile.leader_id] || 0) > 0,
    }));
}

/**
 * Check if leader migration is needed (leaders already exist = migration done).
 */
export async function migrateLeadersIfNeeded(): Promise<boolean> {
    try {
        const existingProfiles = await dbAdapter.listLeaderProfiles();
        if (existingProfiles.length > 0) {
            return false; // Migration already done
        }

        // No leaders to migrate in Supabase-only mode
        return false;
    } catch (error) {
        console.error('Migration check failed:', error);
        throw error;
    }
}

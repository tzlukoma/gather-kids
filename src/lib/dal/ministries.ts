/**
 * DAL — Ministries domain
 *
 * Covers Ministry CRUD, Ministry Groups, and Ministry Accounts.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { Ministry, MinistryAccount, MinistryGroup, MinistryGroupMember } from '../types';
import { normalizeEmail } from './utils';

// ---------------------------------------------------------------------------
// Ministry CRUD
// ---------------------------------------------------------------------------

/**
 * Get ministries, optionally filtered by active status.
 */
export async function getMinistries(isActive?: boolean): Promise<Ministry[]> {
    return dbAdapter.listMinistries(isActive);
}

/**
 * Get a ministry's constituent ministries by group code.
 */
export async function getMinistriesByGroupCode(groupCode: string): Promise<Ministry[]> {
    const group = await dbAdapter.getMinistryGroupByCode(groupCode);
    if (!group) return [];
    return await dbAdapter.listMinistriesByGroup(group.id);
}

/**
 * Check if a ministry belongs to a named group.
 */
export async function isMinistryInGroup(
    ministryId: string,
    groupCode: string,
): Promise<boolean> {
    const groupMinistries = await getMinistriesByGroupCode(groupCode);
    return groupMinistries.some(m => m.ministry_id === ministryId);
}

/**
 * Create a new ministry.
 */
export async function createMinistry(
    ministryData: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at' | 'data_profile'>,
): Promise<string> {
    const newMinistry = await dbAdapter.createMinistry({
        ...ministryData,
        data_profile: 'Basic',
        is_active: ministryData.is_active ?? true,
    });
    return newMinistry.ministry_id;
}

/**
 * Update an existing ministry.
 */
export async function updateMinistry(
    ministryId: string,
    updates: Partial<Ministry>,
): Promise<number | string> {
    const updatedMinistry = await dbAdapter.updateMinistry(ministryId, updates);
    return updatedMinistry.ministry_id;
}

/**
 * Delete a ministry.
 */
export async function deleteMinistry(ministryId: string): Promise<void> {
    await dbAdapter.deleteMinistry(ministryId);
}

/**
 * Find the Bible Bee ministry by code.
 */
export async function getBibleBeeMinistry(): Promise<Ministry | null> {
    const ministries = await dbAdapter.listMinistries();
    return ministries.find(m => m.code === 'bible-bee') || null;
}

// ---------------------------------------------------------------------------
// Ministry Groups CRUD
// ---------------------------------------------------------------------------

export async function getMinistryGroups(): Promise<MinistryGroup[]> {
    return await dbAdapter.listMinistryGroups();
}

export async function getMinistryGroup(id: string): Promise<MinistryGroup | null> {
    return await dbAdapter.getMinistryGroup(id);
}

export async function createMinistryGroup(
    data: Omit<MinistryGroup, 'id' | 'created_at' | 'updated_at'>,
): Promise<MinistryGroup> {
    return await dbAdapter.createMinistryGroup(data);
}

export async function updateMinistryGroup(
    id: string,
    data: Partial<MinistryGroup>,
): Promise<MinistryGroup> {
    return await dbAdapter.updateMinistryGroup(id, data);
}

export async function deleteMinistryGroup(id: string): Promise<void> {
    await dbAdapter.deleteMinistryGroup(id);
}

export async function addMinistryToGroup(
    groupId: string,
    ministryId: string,
): Promise<MinistryGroupMember> {
    return await dbAdapter.addMinistryToGroup(groupId, ministryId);
}

export async function removeMinistryFromGroup(
    groupId: string,
    ministryId: string,
): Promise<void> {
    await dbAdapter.removeMinistryFromGroup(groupId, ministryId);
}

export async function getMinistriesInGroup(groupId: string): Promise<Ministry[]> {
    return await dbAdapter.listMinistriesByGroup(groupId);
}

export async function getGroupsForMinistry(ministryId: string): Promise<MinistryGroup[]> {
    return await dbAdapter.listGroupsByMinistry(ministryId);
}

// ---------------------------------------------------------------------------
// Ministry Accounts
// ---------------------------------------------------------------------------

/**
 * Get all ministry accounts enriched with ministry metadata.
 */
export async function getMinistryAccounts() {
    const [accounts, ministries] = await Promise.all([
        dbAdapter.listMinistryAccounts(),
        dbAdapter.listMinistries(),
    ]);
    const ministryMap = new Map(ministries.map(m => [m.ministry_id, m]));

    return accounts
        .map(account => ({
            ...account,
            ministry: ministryMap.get(account.ministry_id),
        }))
        .filter(a => a.ministry);
}

/**
 * Create or update a ministry account.
 */
export async function saveMinistryAccount(
    accountData: Omit<MinistryAccount, 'created_at' | 'updated_at'> & { created_at?: string },
): Promise<string> {
    const normalizedAccount = {
        ...accountData,
        email: normalizeEmail(accountData.email) || '',
    };

    // Check for duplicate email across other ministries
    const existingAccounts = await dbAdapter.listMinistryAccounts();
    const existingByEmail = existingAccounts.find(
        a =>
            a.email === normalizedAccount.email &&
            a.ministry_id !== normalizedAccount.ministry_id,
    );

    if (existingByEmail) {
        throw new Error(
            `A ministry account with email ${normalizedAccount.email} already exists`,
        );
    }

    const existingAccount = await dbAdapter.getMinistryAccount(normalizedAccount.ministry_id);

    if (existingAccount) {
        const updatedAccount = await dbAdapter.updateMinistryAccount(
            normalizedAccount.ministry_id,
            normalizedAccount,
        );
        return updatedAccount.ministry_id;
    } else {
        const newAccount = await dbAdapter.createMinistryAccount(normalizedAccount);
        return newAccount.ministry_id;
    }
}

// ---------------------------------------------------------------------------
// Registration cycles
// ---------------------------------------------------------------------------

export async function getRegistrationCycles(isActive?: boolean) {
    return dbAdapter.listRegistrationCycles(isActive);
}

export async function getRegistrationCycle(id: string) {
    return dbAdapter.getRegistrationCycle(id);
}

export async function createRegistrationCycle(
    data: Parameters<typeof dbAdapter.createRegistrationCycle>[0],
) {
    return dbAdapter.createRegistrationCycle(data);
}

export async function updateRegistrationCycle(
    id: string,
    data: Parameters<typeof dbAdapter.updateRegistrationCycle>[1],
) {
    return dbAdapter.updateRegistrationCycle(id, data);
}

export async function listRegistrationCycles(isActive?: boolean) {
    return dbAdapter.listRegistrationCycles(isActive);
}

export async function deleteRegistrationCycle(id: string): Promise<void> {
    return dbAdapter.deleteRegistrationCycle(id);
}

/**
 * Return the most-recently-updated active registration cycle, or null.
 */
export async function getCurrentRegistrationCycle() {
    const cycles = await dbAdapter.listRegistrationCycles();
    const activeCycles = cycles.filter(cycle => cycle.is_active);
    if (activeCycles.length === 0) return null;

    return activeCycles.sort(
        (a, b) =>
            new Date((b as any).updated_at ?? 0).getTime() -
            new Date((a as any).updated_at ?? 0).getTime(),
    )[0];
}

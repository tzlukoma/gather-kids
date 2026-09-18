/**
 * DAL — Ministries domain
 *
 * Covers Ministry CRUD, Ministry Groups, and Ministry Accounts.
 * All functions delegate to the Supabase adapter (dbAdapter).
 */

import { db as dbAdapter } from '../database/factory';
import type { Ministry, MinistryAccount, MinistryGroup, MinistryGroupMember, RegistrationCycle } from '../types';
import {
    pickActiveRegistrationCycle,
    pickPriorRegistrationCycle,
} from './registration-cycle-utils';
import { getTodayIsoDate, normalizeEmail } from './utils';
import {
    isEligibleForMinistryOn,
    isMinistryWindowOpenOn,
} from '../ministry-eligibility';

// ---------------------------------------------------------------------------
// Ministry CRUD
// ---------------------------------------------------------------------------

/**
 * Get ministries, optionally filtered by active status.
 */
export async function getMinistries(isActive?: boolean): Promise<Ministry[]> {
    return dbAdapter.listMinistries(isActive);
}

export async function getMinistry(ministryId: string): Promise<Ministry | null> {
    return dbAdapter.getMinistry(ministryId);
}

/**
 * Whether a child is within a ministry's min/max age range today.
 *
 * The age comparison itself lives in `@/lib/ministry-eligibility`, so this
 * agrees with what registration will actually persist. The guards here are its
 * own: an unknown ministry, an unknown child, or a child with no date of birth
 * answers `false`, because a lookup that found nothing is not an eligibility
 * judgement.
 */
export async function isEligibleForChoir(ministryId: string, childId: string): Promise<boolean> {
    const ministry = await dbAdapter.getMinistry(ministryId);
    const child = await dbAdapter.getChild(childId);
    if (!ministry || !child?.dob) return false;

    return isEligibleForMinistryOn(
        { min_age: ministry.min_age, max_age: ministry.max_age },
        { dob: child.dob },
        getTodayIsoDate(),
    );
}

/**
 * Whether `todayISO` falls inside a ministry's open/close window.
 *
 * Bounds are inclusive, matching registration. The previous implementation used
 * strict comparisons, so a ministry was shut on the very day it opened.
 */
export async function isWithinWindow(ministryId: string, todayISO: string): Promise<boolean> {
    const ministry = await dbAdapter.getMinistry(ministryId);
    if (!ministry) return false;
    return isMinistryWindowOpenOn(ministry, todayISO);
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
    return pickActiveRegistrationCycle(cycles);
}

/**
 * Return the registration cycle immediately before `currentCycleId` by start_date.
 * Does not use numeric id math — prod/UAT cycles are UUIDs.
 */
export async function getPriorRegistrationCycle(currentCycleId: string) {
    const cycles = await dbAdapter.listRegistrationCycles();
    return pickPriorRegistrationCycle(cycles, currentCycleId);
}

/**
 * Resolve the active registration cycle or throw — no legacy `'2025'` fallback.
 */
export async function requireActiveRegistrationCycle() {
    const cycle = await getCurrentRegistrationCycle();
    if (!cycle?.cycle_id) {
        throw new Error('No active registration cycle is configured.');
    }
    return cycle;
}
